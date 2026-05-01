import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import type { Session } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

export type GoogleSignInResult =
  | { status: 'success'; session: Session }
  | { status: 'cancelled' }
  | { status: 'error'; message: string };

function roleIncludes(roleValue: string | null | undefined, expected: 'customer' | 'owner'): boolean {
  if (!roleValue) return false;
  const normalized = roleValue.toLowerCase().trim();
  if (!normalized) return false;
  if (normalized === expected) return true;
  if (normalized === 'both') return true;
  return normalized.split(/[,\s|/]+/).includes(expected);
}

function mergeRole(roleValue: string | null | undefined, nextRole: 'customer' | 'owner'): string {
  if (!roleValue) return nextRole;
  const normalized = roleValue.toLowerCase().trim();
  if (!normalized) return nextRole;
  if (normalized === 'both') return 'both';
  const hasCustomer = roleIncludes(normalized, 'customer') || nextRole === 'customer';
  const hasOwner = roleIncludes(normalized, 'owner') || nextRole === 'owner';
  if (hasCustomer && hasOwner) return 'both';
  return hasOwner ? 'owner' : 'customer';
}

WebBrowser.maybeCompleteAuthSession();

function parseTokensFromUrl(url: string): { accessToken: string; refreshToken: string } | null {
  try {
    const hashPart = url.includes('#') ? url.split('#')[1] ?? '' : '';
    const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
    const params = new URLSearchParams(hashPart || queryPart);
    const accessToken = params.get('access_token') ?? '';
    const refreshToken = params.get('refresh_token') ?? '';
    if (!accessToken || !refreshToken) return null;
    return { accessToken, refreshToken };
  } catch {
    return null;
  }
}

function parseAuthCodeFromUrl(url: string): string | null {
  try {
    const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
    const params = new URLSearchParams(queryPart);
    return params.get('code');
  } catch {
    return null;
  }
}

export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  const supabase = getSupabase();
  if (!supabase) {
    return { status: 'error', message: 'Supabase is not configured.' };
  }

  // IMPORTANT: avoid route-group parens like `(auth)` in the path — they get
  // URL-encoded and won't match a Supabase redirect-URL allowlist entry, which
  // causes Supabase to fall back to its Site URL (often `http://localhost:...`).
  // In dev (Expo Go) this resolves to `exp://192.168.x.x:8082/--/auth-callback`,
  // and in standalone/dev-client it resolves to `cenaiva://auth-callback`.
  const redirectTo = makeRedirectUri({ scheme: 'cenaiva', path: 'auth-callback' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: { prompt: 'select_account' },
    },
  });

  if (error || !data?.url) {
    return { status: 'error', message: error?.message ?? 'Failed to start Google sign in.' };
  }

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    showInRecents: true,
  });

  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { status: 'cancelled' };
  }

  if (result.type !== 'success' || !result.url) {
    return { status: 'error', message: 'Google sign in did not complete.' };
  }

  const tokens = parseTokensFromUrl(result.url);
  if (tokens) {
    const { data: setData, error: setErr } = await supabase.auth.setSession({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
    });
    if (setErr || !setData?.session) {
      return { status: 'error', message: setErr?.message ?? 'Failed to establish session.' };
    }
    return { status: 'success', session: setData.session };
  }

  const code = parseAuthCodeFromUrl(result.url);
  if (code) {
    const { data: exData, error: exErr } = await supabase.auth.exchangeCodeForSession(code);
    if (exErr || !exData?.session) {
      return { status: 'error', message: exErr?.message ?? 'Failed to establish session.' };
    }
    return { status: 'success', session: exData.session };
  }

  return { status: 'error', message: 'Missing tokens in OAuth callback URL.' };
}

/**
 * Ensure a `user_profiles` row exists for the freshly authenticated user.
 * Idempotent: a returning user keeps their existing row.
 */
export async function ensureCustomerProfile(
  session: Session,
  options?: { fullNameOverride?: string },
): Promise<void> {
  return ensureProfileWithRole(session, 'customer', options);
}

export async function ensureOwnerProfile(
  session: Session,
  options?: { fullNameOverride?: string },
): Promise<void> {
  return ensureProfileWithRole(session, 'owner', options);
}

async function ensureProfileWithRole(
  session: Session,
  role: 'customer' | 'owner',
  options?: { fullNameOverride?: string },
): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;

  const user = session.user;
  if (!user?.id) return;

  const email = (user.email ?? '').toLowerCase();
  const phone = (user.phone ?? '').trim();
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const override =
    typeof options?.fullNameOverride === 'string' ? options.fullNameOverride.trim() : '';
  const fullName =
    override ||
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (email ? email.split('@')[0] : '') ||
    (phone ? phone : 'New user');

  const { data: existing } = await supabase
    .from('user_profiles')
    .select('auth_user_id, role')
    .eq('auth_user_id', user.id)
    .maybeSingle();

  const nextRole = mergeRole(existing?.role, role);
  await supabase.from('user_profiles').upsert(
    {
      auth_user_id: user.id,
      email: email || '',
      full_name: fullName,
      role: nextRole,
    },
    { onConflict: 'auth_user_id' },
  );
}
