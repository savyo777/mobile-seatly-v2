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
      limit: envInt("CENAIVA_ORCHESTRATE_MINUTE_LIMIT", 6),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "cenaiva-orchestrate:day" as const,
      limit: envInt("CENAIVA_ORCHESTRATE_DAILY_LIMIT", 100),
      windowSeconds: DAY_SECONDS,
    },
  },
  smallPrompt: {
    // Small-prompt also synthesizes ElevenLabs audio directly, so the daily
    // cap is part of the Hey Cenaiva audio budget. 8/day covers multiple
    // meal sessions while 4/min stops tight retry loops.
    minute: {
      scope: "cenaiva-small-prompt:min" as const,
      limit: envInt("CENAIVA_SMALL_PROMPT_MINUTE_LIMIT", 4),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "cenaiva-small-prompt:day" as const,
      limit: envInt("CENAIVA_SMALL_PROMPT_DAILY_LIMIT", 8),
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
  // ElevenLabs TTS is the priciest per-call service we use. 12/day covers
  // several normal meal sessions while the paid budget guard remains the hard
  // profit ceiling. Cached clips and native speech fallback keep the experience
  // usable if a user hits the cost cap.
  elevenlabsTts: {
    minute: {
      scope: "elevenlabs-tts:min" as const,
      limit: envInt("CENAIVA_ELEVENLABS_TTS_MINUTE_LIMIT", 4),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "elevenlabs-tts:day" as const,
      limit: envInt("CENAIVA_ELEVENLABS_TTS_DAILY_LIMIT", 12),
      windowSeconds: DAY_SECONDS,
    },
  },
  // Deepgram short-lived STT token. One token per voice utterance.
  // Per-minute cap leaves room for quick retries while the daily cap covers
  // several meal sessions plus empty/cancelled/no-speech transcripts.
  deepgramToken: {
    minute: {
      scope: "deepgram-live-token:min" as const,
      limit: envInt("CENAIVA_DEEPGRAM_TOKEN_MINUTE_LIMIT", 6),
      windowSeconds: MIN_SECONDS,
    },
    day: {
      scope: "deepgram-live-token:day" as const,
      limit: envInt("CENAIVA_DEEPGRAM_TOKEN_DAILY_LIMIT", 44),
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
  450,
);

// Stable error codes returned to the mobile client. Kept in one place so
// friendlyError() on the mobile side can map them to user-facing copy
// without typo drift.
export const CENAIVA_RATE_LIMIT_CODES = {
  minute: "rate_limit_minute" as const,
  day: "rate_limit_day" as const,
};
