import * as Linking from 'expo-linking';
import { getSupabase } from '@/lib/supabase/client';

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  return supabase;
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
  const redirectTo = Linking.createURL('/(auth)/reset-password');
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

// TODO(supabase): call supabase.auth.signOut({ scope: 'others' })
export async function revokeAllOtherSessions(): Promise<void> {
  const supabase = requireSupabase();
  const { error } = await supabase.auth.signOut({ scope: 'others' });
  if (error) throw error;
}
