// @ts-nocheck
// Lightweight IP-based rate limiter for anonymous edge endpoints.
// Backed by Deno KV so the counter survives instance recycles within the
// configured window. The limiter is intentionally permissive for first
// contact (no key cleanup) — the goal is to slow SMS/credential-spray
// abuse, not to stop a determined attacker.

let kvPromise: Promise<Deno.Kv> | null = null;

function getKv(): Promise<Deno.Kv> {
  if (!kvPromise) {
    kvPromise = Deno.openKv();
  }
  return kvPromise;
}

export type RateLimitVerdict =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfterSeconds: number };

export type RateLimitOptions = {
  /** Identifier — typically `${endpoint}:${ip}` so endpoints have separate buckets. */
  key: string;
  /** How many requests are allowed per window. */
  limit: number;
  /** Window length in seconds. */
  windowSeconds: number;
};

/**
 * Increments the counter for `key` and reports whether the request should
 * be allowed. Failures (e.g. KV unavailable) fail-open — better to serve
 * the request than to take the function down because the limiter died.
 */
export async function checkRateLimit(opts: RateLimitOptions): Promise<RateLimitVerdict> {
  try {
    const kv = await getKv();
    const bucketKey = ["rate", opts.key];
    const now = Date.now();
    const windowMs = opts.windowSeconds * 1000;

    const existing = await kv.get<{ count: number; expiresAt: number }>(bucketKey);
    const value = existing.value;
    const stillValid = value && value.expiresAt > now;
    const nextCount = stillValid ? value.count + 1 : 1;
    const expiresAt = stillValid ? value.expiresAt : now + windowMs;

    await kv.set(
      bucketKey,
      { count: nextCount, expiresAt },
      { expireIn: Math.max(1000, expiresAt - now) },
    );

    if (nextCount > opts.limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: expiresAt,
        retryAfterSeconds: Math.max(1, Math.ceil((expiresAt - now) / 1000)),
      };
    }
    return {
      allowed: true,
      remaining: Math.max(0, opts.limit - nextCount),
      resetAt: expiresAt,
    };
  } catch {
    // Fail-open: never let the limiter take the function down.
    return { allowed: true, remaining: opts.limit, resetAt: Date.now() };
  }
}

/**
 * Best-effort caller IP. Edge Functions sit behind Supabase's proxy, which
 * forwards the original IP via X-Forwarded-For (comma-separated, leftmost
 * is the real client). Cf-Connecting-IP and X-Real-IP are common
 * alternates. Falls back to 'unknown' so we still bucket abuse.
 */
export function getClientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}
