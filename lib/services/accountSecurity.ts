import { clearPersistedSupabaseSession, getSupabase } from '@/lib/supabase/client';
import { normalizePhoneToE164 } from '@/lib/services/phoneAuth';

const RESET_PASSWORD_REDIRECT = 'cenaiva://reset-password';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
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

function friendlyDeleteAccountError(rawMessage?: string, code?: string): string {
  if (code === 'unauthorized') {
    return 'Please sign in again before deleting your account.';
  }
  if (code === 'missing_config') {
    return 'Account deletion is not available yet. Please try again shortly.';
  }

  const message = rawMessage ?? '';
  const normalized = message.toLowerCase();
  if (
    normalized.includes('non-2xx') ||
    normalized.includes('function not found') ||
    normalized.includes('failed to send a request')
  ) {
    return 'Account deletion is not available yet. Please try again shortly.';
  }

  return message || 'Failed to delete account.';
}

export async function changePassword(current: string, next: string): Promise<void> {
  void current;
  const supabase = requireSupabase();
  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) throw error;
}

export async function changeEmail(newEmail: string, password: string): Promise<void> {
  void password;
  const supabase = requireSupabase();
  const email = newEmail.trim().toLowerCase();
  const { error } = await supabase.auth.updateUser({ email });
  if (error) throw error;
  // Attempt resend immediately; ignore failures because updateUser already initiated verification.
  try {
    await resendVerificationEmail(email);
  } catch {
    // no-op
  }
}

/**
 * Start the change-phone flow. Updates the auth user's phone, which triggers Supabase
 * to send a 6-digit SMS code to the new number that must be confirmed via verifyOtp.
 */
export async function startChangePhone(rawNewPhone: string): Promise<{ phoneE164: string }> {
  const supabase = requireSupabase();
  const phoneE164 = normalizePhoneToE164(rawNewPhone);
  if (!phoneE164) {
    throw new Error(
      'Please enter a valid phone number (include country code, or 10-digit US number).',
    );
  }
  const { error } = await supabase.auth.updateUser({ phone: phoneE164 });
  if (error) throw error;
  return { phoneE164 };
}

/** Confirm the 6-digit SMS code that Supabase sent to the new phone number. */
export async function confirmChangePhone(phoneE164: string, code: string): Promise<void> {
  const supabase = requireSupabase();
  const trimmed = code.replace(/\D/g, '');
  if (trimmed.length !== 6) throw new Error('Please enter the 6-digit code.');
  const { error } = await supabase.auth.verifyOtp({
    phone: phoneE164,
    token: trimmed,
    type: 'phone_change',
  });
  if (error) throw error;

  try {
    const { data: userData } = await supabase.auth.getUser();
    const authUserId = userData.user?.id;
    if (authUserId) {
      await supabase
        .from('user_profiles')
        .update({ phone: phoneE164 })
        .eq('auth_user_id', authUserId);
    }
  } catch {
    // best-effort: profile mirror is non-critical, auth phone is the source of truth
  }
}

export async function resendVerificationEmail(email: string): Promise<void> {
  const supabase = requireSupabase();
  const target = email.trim().toLowerCase();
  const { error } = await supabase.auth.resend({
    type: 'email_change',
    email: target,
  });
  if (error) throw error;
}

export async function sendPasswordResetEmail(email: string): Promise<void> {
  const supabase = requireSupabase();
  const redirectTo = RESET_PASSWORD_REDIRECT;
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo,
  });
  if (error) throw error;
}

// TODO(supabase): persist via supabase user_metadata or a profiles table
export async function toggleTwoFactor(enabled: boolean): Promise<void> {
  void enabled;
}

// TODO(supabase): persist via supabase user_metadata
export async function toggleBiometric(enabled: boolean): Promise<void> {
  void enabled;
}

// TODO(supabase): call supabase.auth.admin.deleteSession(sessionId) or equivalent
export async function revokeSession(sessionId: string): Promise<void> {
  void sessionId;
}

// Permanently deletes the current user's auth account and signs them out.
// Uses the `delete-account` Edge Function (service-role) since admin APIs
// must not be called from the client.
export async function deleteAccount(): Promise<void> {
  const supabase = requireSupabase();
  const { data, error: invokeError, response } = await supabase.functions.invoke<{
    deleted?: boolean;
    error?: string;
    code?: string;
  }>('delete-account', {
    method: 'POST',
  });
  if (invokeError || data?.error || data?.deleted === false) {
    const errorBody = data ?? await readFunctionErrorBody(response ?? invokeError?.context);
    throw new Error(
      friendlyDeleteAccountError(errorBody?.error ?? invokeError?.message, errorBody?.code),
    );
  }
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // best-effort: account is already deleted server-side
  } finally {
    try {
      await clearPersistedSupabaseSession();
    } catch {
      // best-effort: signOut already attempted local cleanup
    }
  }
}

// TODO(supabase): call supabase.auth.signOut({ scope: 'others' })
export async function revokeAllOtherSessions(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) throw error;
}

/** Signs out every session for this user, including the current device. */
export async function signOutAllDevices(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut({ scope: 'global' });
  if (error) throw error;
}
