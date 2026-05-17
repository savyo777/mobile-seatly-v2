/**
 * Scrub PII out of crash-logger context before it's posted to the
 * server. Added 2026-05-17 in response to the security audit P1
 * finding: `context.extra` was passed verbatim into crash_logs.context,
 * so any caller that included { email, paymentData } in their context
 * would leak that PII into a server-side table.
 *
 * What gets scrubbed:
 *   1. Known sensitive KEYS (case-insensitive substring match):
 *      email, phone, password, token, access_token, refresh_token,
 *      auth_token, api_key, secret, card, cardnumber, cvv, ssn, dob.
 *      → value replaced with "[REDACTED]".
 *
 *   2. VALUES matching PII patterns (anywhere in a string):
 *      email regex, north-american phone regex, credit-card-like digit
 *      runs (13–19 digits with optional spaces/dashes).
 *      → substring replaced with "[REDACTED]".
 *
 * Recursively applied to objects + arrays. Caps depth at 6 and total
 * processed-value count at 200 so a pathological deep object can't
 * stall the logger. Returns a freshly-allocated scrubbed copy — the
 * caller's input is never mutated.
 */

const SENSITIVE_KEY_FRAGMENTS = [
  'email',
  'phone',
  'password',
  'token',
  'access_token',
  'refresh_token',
  'auth_token',
  'api_key',
  'apikey',
  'secret',
  'card',
  'cardnumber',
  'card_number',
  'cvv',
  'cvc',
  'ssn',
  'sin', // CA equivalent
  'dob',
  'birthdate',
];

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
// North-American style phone numbers (loose). Catches +1 555-123-4567, (555) 123-4567, etc.
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
// 13–19 digit runs with optional spaces/dashes — credit card numbers, broadly.
const CARD_RE = /\b(?:\d[\s-]?){13,19}\b/g;

const REDACTED = '[REDACTED]';
const MAX_DEPTH = 6;
const MAX_NODES = 200;

function keyIsSensitive(key: string): boolean {
  const lower = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => lower.includes(fragment));
}

function redactStringPatterns(s: string): string {
  if (!s) return s;
  return s
    .replace(EMAIL_RE, REDACTED)
    .replace(CARD_RE, REDACTED)
    .replace(PHONE_RE, REDACTED);
}

type ScrubState = { nodes: number };

function scrubAny(value: unknown, depth: number, state: ScrubState): unknown {
  if (state.nodes >= MAX_NODES) return REDACTED;
  state.nodes += 1;

  if (value == null) return value;
  if (depth > MAX_DEPTH) return REDACTED;

  if (typeof value === 'string') {
    return redactStringPatterns(value);
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => scrubAny(entry, depth + 1, state));
  }
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (keyIsSensitive(key)) {
        out[key] = REDACTED;
      } else {
        out[key] = scrubAny(val, depth + 1, state);
      }
    }
    return out;
  }
  // Functions, symbols, bigints — not loggable.
  return null;
}

export function scrubCrashContext(
  extra: Record<string, unknown> | undefined | null,
): Record<string, unknown> | null {
  if (!extra || typeof extra !== 'object') return null;
  const state: ScrubState = { nodes: 0 };
  const result = scrubAny(extra, 0, state);
  return (result && typeof result === 'object' && !Array.isArray(result))
    ? (result as Record<string, unknown>)
    : null;
}

/**
 * Scrubs the top-level message + stack strings that get sent to
 * crash_logs as separate columns. Stack traces sometimes embed
 * paths/URLs containing tokens; messages may include "Failed to
 * verify token: eyJh..." style payloads. This is a defense layer
 * on top of the context scrub.
 */
export function scrubCrashString(s: string | null | undefined): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  return redactStringPatterns(s);
}
