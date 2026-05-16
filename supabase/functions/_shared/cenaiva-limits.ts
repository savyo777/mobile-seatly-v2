// @ts-nocheck
// Rate-limit + cost-cap constants for abuse-sensitive edge functions. All
// values are env-overridable so we can tune in production without redeploys.
// Server-only — these env vars MUST NOT be prefixed with EXPO_PUBLIC_.
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
    // Per-minute is the burst gate: small-prompt fires on off-topic chatter
    // (1–2/min in human cadence), so 10/min gives ~5x burst headroom and
    // catches spam loops within seconds. 5:1 ratio to the day cap means a
    // user spamming flat-out drains the daily allowance in ~5 minutes.
    minute: {
      scope: "cenaiva-small-prompt:min" as const,
      limit: envInt("CENAIVA_SMALL_PROMPT_MINUTE_LIMIT", 10),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "cenaiva-small-prompt:day" as const,
      limit: envInt("CENAIVA_SMALL_PROMPT_DAILY_LIMIT", 50),
      windowSeconds: DAY_SECONDS,
    },
  },
  // Vision-based receipt OCR. 10/min lets owners scan a receipt stack at a
  // normal pace without waiting between every few uploads; daily cap remains
  // sized for a weekly bookkeeping catch-up.
  scanReceipt: {
    minute: {
      scope: "scan-receipt:min" as const,
      limit: envInt("CENAIVA_SCAN_RECEIPT_MINUTE_LIMIT", 10),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "scan-receipt:day" as const,
      limit: envInt("CENAIVA_SCAN_RECEIPT_DAILY_LIMIT", 75),
      windowSeconds: DAY_SECONDS,
    },
  },
  // ElevenLabs TTS is the priciest per-call service we use. 15/min covers
  // fast voice conversations with retry/headroom; 30/day covers several full
  // booking sessions while still stopping continuous loops. Per-call char cap
  // (300, in the function itself) remains the biggest cost lever.
  elevenlabsTts: {
    minute: {
      scope: "elevenlabs-tts:min" as const,
      limit: envInt("CENAIVA_ELEVENLABS_TTS_MINUTE_LIMIT", 15),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "elevenlabs-tts:day" as const,
      limit: envInt("CENAIVA_ELEVENLABS_TTS_DAILY_LIMIT", 30),
      windowSeconds: DAY_SECONDS,
    },
  },
  // Deepgram short-lived STT token. One token per voice utterance.
  // Per-minute cap matches ElevenLabs at 15/min so the full Hey Cenaiva
  // voice path can keep pace. Daily cap is TTS (30) plus a ~33% buffer for
  // empty/cancelled/no-speech transcripts.
  deepgramToken: {
    minute: {
      scope: "deepgram-live-token:min" as const,
      limit: envInt("CENAIVA_DEEPGRAM_TOKEN_MINUTE_LIMIT", 15),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "deepgram-live-token:day" as const,
      limit: envInt("CENAIVA_DEEPGRAM_TOKEN_DAILY_LIMIT", 40),
      windowSeconds: DAY_SECONDS,
    },
  },
  // Anonymous pre-login endpoint. Legit users normally need 1-2 attempts;
  // 10/min gives support/debug headroom while stopping SMS lookup loops.
  phoneLogin: {
    minute: {
      scope: "prepare-phone-login:min" as const,
      limit: envInt("CENAIVA_PHONE_LOGIN_MINUTE_LIMIT", 10),
      windowSeconds: MIN_SECONDS,
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
