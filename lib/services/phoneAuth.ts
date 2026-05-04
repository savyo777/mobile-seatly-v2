import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Normalize user-entered phone to E.164.
 *
 * Rules (strict, US-default app):
 * - If the input starts with `+`, the country-code-included number must be 8–15 digits
 *   (matches E.164 max 15 digits, ITU min ~8 digits with country code).
 * - Otherwise the user must enter exactly a 10-digit US number, or an 11-digit number
 *   starting with `1` (US country code without the `+`). Anything else (e.g. 15 random
 *   digits without a `+`) is rejected to avoid silently fabricating an international
 *   number from raw input.
 */
export function normalizePhoneToE164(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (raw.startsWith('+')) {
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
}

export async function sendPhoneOtp(
  phoneE164: string,
  options?: { metadata?: Record<string, string> },
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { channel: 'sms', data: options?.metadata },
  });
  if (error) return { error: error.message };
  return { error: null };
}

export async function verifyPhoneOtp(
  phoneE164: string,
  token: string,
): Promise<{ session: Session | null; error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { session: null, error: 'Supabase is not configured.' };
  }
  const trimmed = token.replace(/\D/g, '');
  if (trimmed.length !== 6) {
    return { session: null, error: 'Please enter the 6-digit code.' };
  }
  const { data, error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: trimmed,
    type: 'sms',
  });
  if (error) return { session: null, error: error.message };
  return { session: data.session ?? null, error: null };
}
