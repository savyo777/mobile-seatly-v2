import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

/** Normalize user-entered phone to E.164 (basic US default: +1 for 10-digit local). */
export function normalizePhoneToE164(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;
  if (raw.startsWith('+')) {
    return `+${digits.slice(0, 15)}`;
  }
  if (digits.length === 10) {
    return `+1${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }
  if (digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`;
  }
  return null;
}

export async function sendPhoneOtp(phoneE164: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }
  const { error } = await supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: { channel: 'sms' },
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
