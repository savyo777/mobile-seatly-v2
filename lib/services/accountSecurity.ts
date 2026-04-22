function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function maybeFail(rate = 0.1) {
  if (Math.random() < rate) throw new Error('Something went wrong. Please try again.');
}

// TODO(supabase): replace mock with supabase.auth.updateUser({ password: next })
export async function changePassword(current: string, next: string): Promise<void> {
  void current; void next;
  await delay(900);
  maybeFail();
}

// TODO(supabase): replace mock with supabase.auth.updateUser({ email: newEmail })
// then handle email confirmation flow
export async function changeEmail(newEmail: string, password: string): Promise<void> {
  void newEmail; void password;
  await delay(800);
  maybeFail();
}

// TODO(supabase): replace mock with supabase.auth.resetPasswordForEmail(email)
export async function sendPasswordResetEmail(email: string): Promise<void> {
  void email;
  await delay(700);
  maybeFail(0.05);
}

// TODO(supabase): persist via supabase user_metadata or a profiles table
export async function toggleTwoFactor(enabled: boolean): Promise<void> {
  void enabled;
  await delay(500);
}

// TODO(supabase): persist via supabase user_metadata
export async function toggleBiometric(enabled: boolean): Promise<void> {
  void enabled;
  await delay(300);
}

// TODO(supabase): call supabase.auth.admin.deleteSession(sessionId) or equivalent
export async function revokeSession(sessionId: string): Promise<void> {
  void sessionId;
  await delay(600);
  maybeFail(0.05);
}

// TODO(supabase): call supabase.auth.signOut({ scope: 'others' })
export async function revokeAllOtherSessions(): Promise<void> {
  await delay(800);
  maybeFail(0.05);
}
