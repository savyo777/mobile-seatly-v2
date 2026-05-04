import type { Session, User } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Resolve the phone number we should display for a user, in priority order:
 * 1. The auth user's verified `phone` field (set after a verified phone change).
 * 2. The phone captured at signup in `user_metadata.phone`.
 *
 * Returns "" when no phone is on file. Always normalized with a leading `+`.
 */
export function resolveDisplayPhone(user: User | null | undefined): string {
  if (!user) return '';
  const authPhone = typeof user.phone === 'string' ? user.phone.trim() : '';
  if (authPhone) {
    return authPhone.startsWith('+') ? authPhone : `+${authPhone}`;
  }
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const metaPhone = typeof meta.phone === 'string' ? meta.phone.trim() : '';
  if (metaPhone) {
    return metaPhone.startsWith('+') ? metaPhone : `+${metaPhone}`;
  }
  return '';
}

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
  options?: { metadata?: Record<string, string>; shouldCreateUser?: boolean },
): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }
  const shouldCreateUser = options?.shouldCreateUser ?? false;
  const result = await sendSupabasePhoneOtp(phoneE164, {
    metadata: options?.metadata,
    shouldCreateUser,
  });
  if (!result.error) return { error: null };

  if (!shouldCreateUser && shouldAttemptProfilePhoneLink(result.error.message)) {
    const prepared = await prepareProfileLinkedPhoneLogin(phoneE164);
    if (prepared.error) return { error: prepared.error };

    const retry = await sendSupabasePhoneOtp(phoneE164, {
      metadata: options?.metadata,
      shouldCreateUser: false,
    });
    if (!retry.error) return { error: null };
    return { error: friendlyPhoneAuthError(retry.error.message) };
  }

  if (result.error) return { error: friendlyPhoneAuthError(result.error.message) };
  return { error: null };
}

async function sendSupabasePhoneOtp(
  phoneE164: string,
  options: { metadata?: Record<string, string>; shouldCreateUser: boolean },
) {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: { message: 'Supabase is not configured.' } };
  }
  return supabase.auth.signInWithOtp({
    phone: phoneE164,
    options: {
      channel: 'sms',
      data: options.metadata,
      shouldCreateUser: options.shouldCreateUser,
    },
  });
}

async function prepareProfileLinkedPhoneLogin(phoneE164: string): Promise<{ error: string | null }> {
  const supabase = getSupabase();
  if (!supabase) {
    return { error: 'Supabase is not configured.' };
  }

  const { data, error, response } = await supabase.functions.invoke<{
    linked?: boolean;
    error?: string;
    code?: string;
  }>('prepare-phone-login', {
    body: { phone: phoneE164 },
  });

  if (!error && data?.linked) return { error: null };
  const errorBody = data ?? await readFunctionErrorBody(response ?? error?.context);
  const code = errorBody?.code;
  if (code === 'phone_not_linked') {
    return { error: friendlyPhoneAuthError('user not found') };
  }
  if (code === 'phone_link_conflict') {
    return {
      error: 'This phone number is linked to more than one account. Please sign in with email.',
    };
  }
  if (code === 'invalid_phone') {
    return { error: friendlyPhoneAuthError('user not found') };
  }
  if (code === 'phone_link_failed' || code === 'phone_login_setup_failed') {
    return {
      error: 'We found your account, but SMS login is not ready for this phone number yet. Please sign in with email once, then update your phone in Security.',
    };
  }
  if (error?.message?.toLowerCase().includes('non-2xx')) {
    return {
      error: 'SMS login setup is not available yet. Please try again shortly or sign in with email.',
    };
  }
  return {
    error: errorBody?.error || error?.message || 'Could not send SMS code. Please try again.',
  };
}

async function readFunctionErrorBody(response: unknown): Promise<{ error?: string; code?: string } | null> {
  if (!response || typeof response !== 'object' || !('json' in response)) return null;
  try {
    const data = await (response as Response).json();
    return data && typeof data === 'object'
      ? (data as { error?: string; code?: string })
      : null;
  } catch {
    return null;
  }
}

/**
 * Replace raw Supabase error messages with copy our users actually understand.
 * Most importantly: when login is attempted on a phone that has no account
 * (because shouldCreateUser is false), Supabase returns "Signups not allowed
 * for otp"-style messages. Surface that as a clear "create an account first".
 */
export function shouldAttemptProfilePhoneLink(rawMessage: string): boolean {
  const msg = (rawMessage ?? '').toLowerCase();
  return (
    msg.includes('signups not allowed') ||
    msg.includes('sign-ups not allowed') ||
    msg.includes('signup is disabled') ||
    msg.includes('user not found') ||
    msg.includes('user does not exist') ||
    msg.includes('invalid login credentials')
  );
}

export function friendlyPhoneAuthError(rawMessage: string): string {
  if (shouldAttemptProfilePhoneLink(rawMessage)) {
    return 'No account is linked to this phone number. Sign in with email or Google, then add your phone in Security.';
  }
  return rawMessage || 'Could not send SMS code. Please try again.';
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
