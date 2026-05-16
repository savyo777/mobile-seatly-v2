// @ts-nocheck
// Mints a short-lived (~30s) Deepgram temporary token so the mobile client
// can call Deepgram's STT API without ever holding the project-level API
// key. Auth-required, rate-limited per user.
//
// The mobile client at lib/cenaiva/voice/useMobileTranscription.ts:184
// fetches this endpoint and expects the response shape `{ access_token }`
// (with `expires_in` as a hint). If the call returns null/non-OK, the
// transcribe() helper throws and voice STT fails closed — never falls
// back to direct Deepgram calls.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { checkAuth } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitIdentifier,
} from "../_shared/rate-limit.ts";
import { CENAIVA_LIMITS, CENAIVA_RATE_LIMIT_CODES } from "../_shared/cenaiva-limits.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed" }, 405);

  const auth = checkAuth(req);
  if (!auth.ok) return jsonRes({ error: "Unauthorized", code: auth.reason }, 401);

  const apiKey = Deno.env.get("DEEPGRAM_API_KEY");
  if (!apiKey) return jsonRes({ error: "Deepgram not configured" }, 503);

  // Per-user rate-limit gate (minute then day). Identical pattern to the
  // other AI endpoints — see _shared/cenaiva-limits.ts to tune.
  const ident = rateLimitIdentifier(req, auth.authUserId);
  const buckets = [
    { cfg: CENAIVA_LIMITS.deepgramToken.minute, code: CENAIVA_RATE_LIMIT_CODES.minute },
    { cfg: CENAIVA_LIMITS.deepgramToken.day, code: CENAIVA_RATE_LIMIT_CODES.day },
  ];
  for (const { cfg, code } of buckets) {
    try {
      await enforceRateLimit(supabaseAdmin, cfg.scope, ident, {
        limit: cfg.limit,
        windowSeconds: cfg.windowSeconds,
      });
    } catch (rlErr) {
      if (rlErr instanceof RateLimitError) {
        return jsonRes({ error: code, retry_after: cfg.windowSeconds }, 429);
      }
      throw rlErr;
    }
  }

  // Mint a short-lived Deepgram temporary token scoped to this project key.
  const dgRes = await fetch("https://api.deepgram.com/v1/auth/grant", {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
  });
  if (!dgRes.ok) {
    const text = await dgRes.text();
    return jsonRes({ error: "deepgram_token_failed", detail: text }, 502);
  }
  const json = (await dgRes.json()) as { access_token?: string; expires_in?: number };
  if (!json.access_token) return jsonRes({ error: "deepgram_token_missing" }, 502);

  return jsonRes({ access_token: json.access_token, expires_in: json.expires_in ?? 30 });
});
