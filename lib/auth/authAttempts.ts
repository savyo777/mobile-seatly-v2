/**
 * Server-side login attempt tracking.
 *
 * The previous lockout implementation tracked failed attempts in
 * AsyncStorage on the device — clearable by uninstall, swappable by
 * using another phone. This wrapper calls the `record_auth_attempt`
 * RPC introduced in migration 20260517110000 so the source of truth
 * lives in Postgres. Mobile-side AsyncStorage is preserved as a
 * fast cache (so the lockout banner can render before a network
 * round-trip), but the server's `lockedUntilMs` always wins.
 *
 * Defense in depth: this works alongside Supabase Auth's built-in
 * rate limits (configured in the Auth dashboard).
 */

import { getSupabase } from '@/lib/supabase/client';

export type AuthAttemptResult = {
  /** UNIX ms of lockout expiry. null if not locked. */
  lockedUntilMs: number | null;
  /** Failures remaining before lockout (0–5). */
  attemptsRemaining: number;
};

const FALLBACK: AuthAttemptResult = { lockedUntilMs: null, attemptsRemaining: 5 };

/**
 * Records a login attempt and returns the post-attempt lockout state
 * as seen by the server. Never throws; on RPC failure returns the
 * fallback (not-locked) so a transient outage doesn't strand the user.
 *
 * Call after every login outcome — both success and failure.
 */
export async function recordAuthAttempt(
  email: string,
  success: boolean,
): Promise<AuthAttemptResult> {
  const supabase = getSupabase();
  if (!supabase) return FALLBACK;

  const trimmed = email.trim();
  if (!trimmed) return FALLBACK;

  try {
    const { data, error } = await supabase.rpc('record_auth_attempt', {
      p_email: trimmed,
      p_success: success,
    });
    if (error || !data) return FALLBACK;

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return FALLBACK;

    const rawLockedUntil = (row as { locked_until?: string | null }).locked_until ?? null;
    const lockedUntilMs = rawLockedUntil ? Date.parse(rawLockedUntil) : null;
    const attemptsRemaining = Number(
      (row as { attempts_remaining?: number }).attempts_remaining ?? 5,
    );

    return {
      lockedUntilMs: lockedUntilMs && Number.isFinite(lockedUntilMs) ? lockedUntilMs : null,
      attemptsRemaining: Number.isFinite(attemptsRemaining) ? attemptsRemaining : 5,
    };
  } catch {
    return FALLBACK;
  }
}
