// @ts-nocheck
// Rate-limit + cost-cap constants for the Hey Cenaiva OpenAI-backed edge
// functions. All values are env-overridable so we can tune in production
// without redeploys. Server-only — these env vars MUST NOT be prefixed
// with EXPO_PUBLIC_.
//
// Bucketing is per-user (via auth_user_id) with IP fallback, handled by
// the existing _shared/rate-limit.ts:rateLimitIdentifier() helper. Both
// limits use the same `check_rate_limit` RPC already in production.

const MIN_SECONDS = 60;
const DAY_SECONDS = 24 * 60 * 60;

function envInt(name: string, fallback: number): number {
  const raw = Deno.env.get(name);
  const n = raw ? Number.parseInt(raw, 10) : NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const CENAIVA_LIMITS = {
  orchestrate: {
    minute: {
      scope: "cenaiva-orchestrate:min" as const,
      limit: envInt("CENAIVA_ORCHESTRATE_MINUTE_LIMIT", 15),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "cenaiva-orchestrate:day" as const,
      limit: envInt("CENAIVA_ORCHESTRATE_DAILY_LIMIT", 100),
      windowSeconds: DAY_SECONDS,
    },
  },
  smallPrompt: {
    minute: {
      scope: "cenaiva-small-prompt:min" as const,
      limit: envInt("CENAIVA_SMALL_PROMPT_MINUTE_LIMIT", 60),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "cenaiva-small-prompt:day" as const,
      limit: envInt("CENAIVA_SMALL_PROMPT_DAILY_LIMIT", 500),
      windowSeconds: DAY_SECONDS,
    },
  },
};

// Hard ceiling on `cenaiva-orchestrate` OpenAI output. Caps both raw
// OpenAI cost and the downstream ElevenLabs TTS cost. Within the user's
// requested 600–900 band.
export const MAX_OUTPUT_TOKENS_ORCHESTRATE = envInt(
  "CENAIVA_ORCHESTRATE_MAX_OUTPUT_TOKENS",
  750,
);

// Stable error codes returned to the mobile client. Kept in one place so
// friendlyError() on the mobile side can map them to user-facing copy
// without typo drift.
export const CENAIVA_RATE_LIMIT_CODES = {
  minute: "rate_limit_minute" as const,
  day: "rate_limit_day" as const,
};
