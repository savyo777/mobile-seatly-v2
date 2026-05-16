// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { checkAuth } from "../_shared/auth.ts";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitIdentifier,
} from "../_shared/rate-limit.ts";
import { CENAIVA_LIMITS, CENAIVA_RATE_LIMIT_CODES } from "../_shared/cenaiva-limits.ts";
import {
  readJsonObject,
  validationResponse,
  asText as validatedText,
} from "../_shared/input-validation.ts";
import {
  ELEVENLABS_BASE,
  DEFAULT_VOICE_ID as SHARED_DEFAULT_VOICE_ID,
  ELEVENLABS_MODEL,
  DEFAULT_VOICE_SETTINGS,
  DEFAULT_OUTPUT_FORMAT,
} from "../_shared/elevenlabs.ts";
import {
  enforcePaidUsageBudget,
  paidUsageIdentifier,
  PAID_USAGE_BUDGETS,
  PaidUsageBudgetError,
} from "../_shared/paid-usage.ts";

const DEFAULT_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? SHARED_DEFAULT_VOICE_ID;
const OUTPUT_FORMAT = Deno.env.get("ELEVENLABS_OUTPUT_FORMAT") ?? DEFAULT_OUTPUT_FORMAT;
const MAX_TTS_TEXT_CHARS = (() => {
  const raw = Deno.env.get("CENAIVA_TTS_TEXT_MAX_CHARS");
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : 220;
})();

// Reuse same pronunciation map as useCenaivaSpeech.ts
function applyPronunciation(text: string): string {
  return text
    .replace(/\bCenaiva\b/gi, "sin eye vuh")
    .replace(/\bCENAIVA\b/g, "sin eye vuh");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("ELEVENLABS_API_KEY");
  if (!apiKey) {
    return jsonRes({ error: "ElevenLabs not configured" }, 503);
  }

  try {
    // Auth — require valid JWT so this endpoint isn't open to the world.
    // checkAuth() does the JWT decode; the previous explicit user_profiles
    // lookup was redundant for auth (the rate limiter and downstream code
    // don't need the profile row), so it's been removed.
    const auth = checkAuth(req);
    if (!auth.ok) return jsonRes({ error: "Unauthorized", code: auth.reason }, 401);

    // Per-user rate-limit gate. Pairs ~1:1 with cenaiva-small-prompt, so
    // limits mirror that bucket. Env-overridable via _shared/cenaiva-limits.ts.
    const rateIdent = rateLimitIdentifier(req, auth.authUserId);
    try {
      await enforceRateLimit(supabaseAdmin, CENAIVA_LIMITS.elevenlabsTts.minute.scope, rateIdent, {
        limit: CENAIVA_LIMITS.elevenlabsTts.minute.limit,
        windowSeconds: CENAIVA_LIMITS.elevenlabsTts.minute.windowSeconds,
      });
    } catch (rlErr) {
      if (rlErr instanceof RateLimitError) {
        return jsonRes(
          { error: CENAIVA_RATE_LIMIT_CODES.minute, retry_after: CENAIVA_LIMITS.elevenlabsTts.minute.windowSeconds },
          429,
        );
      }
      throw rlErr;
    }
    try {
      await enforceRateLimit(supabaseAdmin, CENAIVA_LIMITS.elevenlabsTts.day.scope, rateIdent, {
        limit: CENAIVA_LIMITS.elevenlabsTts.day.limit,
        windowSeconds: CENAIVA_LIMITS.elevenlabsTts.day.windowSeconds,
      });
    } catch (rlErr) {
      if (rlErr instanceof RateLimitError) {
        return jsonRes(
          { error: CENAIVA_RATE_LIMIT_CODES.day, retry_after: CENAIVA_LIMITS.elevenlabsTts.day.windowSeconds },
          429,
        );
      }
      throw rlErr;
    }

    const url = new URL(req.url);
    const queryText = url.searchParams.get("text");
    const body = queryText != null
      ? { text: queryText, voice_id: url.searchParams.get("voice_id") ?? undefined }
      : await readJsonObject(req) as { text?: string; voice_id?: string };
    // Keep paid voice clips short. Native speech fallback handles longer
    // responses if a future flow needs them.
    const rawText = validatedText(body.text, "text", { required: true, maxLength: MAX_TTS_TEXT_CHARS, multiline: true }) ?? "";
    if (!rawText) return jsonRes({ error: "text is required" }, 400);

    const text = applyPronunciation(rawText);
    const voiceId = validatedText(body.voice_id, "voice_id", { maxLength: 120 }) ?? DEFAULT_VOICE_ID;

    try {
      await enforcePaidUsageBudget(supabaseAdmin, {
        userKey: paidUsageIdentifier(auth.authUserId),
        service: "elevenlabs-tts",
        estimatedCostUsd: PAID_USAGE_BUDGETS.costs.elevenlabsTts,
      });
    } catch (budgetErr) {
      if (budgetErr instanceof PaidUsageBudgetError) {
        return jsonRes(
          { error: "paid_usage_budget_exceeded", reason: budgetErr.reason },
          402,
        );
      }
      throw budgetErr;
    }

    // Call ElevenLabs with one automatic retry on transient failures. Without
    // this, any 5xx / network blip drops us to Web Speech for that single turn,
    // which is the main cause of the "voice randomly changes every few turns"
    // inconsistency reported by users. Stability bumped to 0.5 for more
    // consistent prosody across turns.
    const callEleven = () =>
      fetch(`${ELEVENLABS_BASE}/text-to-speech/${voiceId}/stream?output_format=${OUTPUT_FORMAT}`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text,
          model_id: ELEVENLABS_MODEL,
          voice_settings: DEFAULT_VOICE_SETTINGS,
        }),
      });

    let elRes: Response;
    try {
      elRes = await callEleven();
      if (!elRes.ok && elRes.status >= 500) {
        elRes = await callEleven();
      }
    } catch {
      elRes = await callEleven();
    }

    if (!elRes.ok) {
      const errText = await elRes.text();
      return jsonRes({ error: `ElevenLabs error: ${errText}` }, elRes.status);
    }

    // Stream the MP3 directly back to the client
    return new Response(elRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "audio/mpeg",
        "Transfer-Encoding": "chunked",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const validation = validationResponse(err, corsHeaders);
    if (validation) return validation;
    return jsonRes({ error: String(err) }, 500);
  }
});
