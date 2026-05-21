/**
 * Sensitive-header redactor for any log / Sentry breadcrumb / verbose
 * fetch trace that might include outbound request headers.
 *
 * Keep this paranoid: future debug code might dump entire `fetch`
 * options. Without redaction the user's live Supabase session JWT
 * ends up in Sentry / Splunk / Datadog. With redaction it doesn't.
 *
 * Added 2026-05-20 in the Phase B mobile hardening pass.
 */

const SENSITIVE_HEADER_NAMES = new Set([
  'authorization',
  'apikey',
  'x-api-key',
  'cookie',
  'set-cookie',
  'x-cron-secret',
  'stripe-signature',
  'x-stripe-signature',
]);

/**
 * Returns a new object with sensitive header values replaced by
 * `[redacted]`. Key comparison is case-insensitive. The input is NOT
 * mutated. Non-string values pass through unchanged.
 */
export function redactSensitiveHeaders<T extends Record<string, unknown>>(
  headers: T | null | undefined,
): T {
  if (!headers || typeof headers !== 'object') return {} as T;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
      out[key] = '[redacted]';
    } else {
      out[key] = value;
    }
  }
  return out as T;
}

/**
 * Same as `redactSensitiveHeaders` but operates on a Headers/Map-like
 * iterable. Returns a plain object so the result is JSON-serializable.
 */
export function redactHeaderIterable(
  iter: Iterable<[string, string]> | null | undefined,
): Record<string, string> {
  const out: Record<string, string> = {};
  if (!iter) return out;
  for (const [key, value] of iter) {
    if (SENSITIVE_HEADER_NAMES.has(key.toLowerCase())) {
      out[key] = '[redacted]';
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Returns a copy of a Bearer-style token string with all but the last
 * 4 characters replaced by stars. Use when a single token value
 * (not a full header set) needs to be logged for debugging without
 * leaking the secret.
 *
 *   redactToken('eyJabc...XYZ123')  →  '***1234'
 */
export function redactToken(token: string | null | undefined, keepLast = 4): string {
  if (!token || typeof token !== 'string') return '';
  if (token.length <= keepLast) return '*'.repeat(token.length);
  return `***${token.slice(-keepLast)}`;
}
