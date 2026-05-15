// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { decodeJwtPayload } from "../_shared/jwt.ts";
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

const DEFAULT_VOICE_ID = Deno.env.get("ELEVENLABS_VOICE_ID") ?? SHARED_DEFAULT_VOICE_ID;
const OUTPUT_FORMAT = Deno.env.get("ELEVENLABS_OUTPUT_FORMAT") ?? DEFAULT_OUTPUT_FORMAT;

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
    // Auth — require valid JWT so this endpoint isn't open to the world
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "");
    const payload = decodeJwtPayload(token);
    if (!payload?.sub) return jsonRes({ error: "Unauthorized" }, 401);

    // Lightweight user check
    const { error: profileErr } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", payload.sub as string)
      .single();
    if (profileErr) return jsonRes({ error: "Unauthorized" }, 401);

    const url = new URL(req.url);
    const queryText = url.searchParams.get("text");
    const body = queryText != null
      ? { text: queryText, voice_id: url.searchParams.get("voice_id") ?? undefined }
      : await readJsonObject(req) as { text?: string; voice_id?: string };
    const rawText = validatedText(body.text, "text", { required: true, maxLength: 1200, multiline: true }) ?? "";
    if (!rawText) return jsonRes({ error: "text is required" }, 400);

    const text = applyPronunciation(rawText);
    const voiceId = validatedText(body.voice_id, "voice_id", { maxLength: 120 }) ?? DEFAULT_VOICE_ID;

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
