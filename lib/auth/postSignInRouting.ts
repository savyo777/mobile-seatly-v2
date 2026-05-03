import type { User } from '@supabase/supabase-js';
import { getAppShellPreference } from '@/lib/navigation/appShellPreference';
import { getSupabase } from '@/lib/supabase/client';
import { roleIncludes } from '@/lib/auth/roles';

export type AuthHomeHref = '/(customer)' | '/(staff)';

function normalizeRole(roleValue: string | null | undefined): string | null {
  if (!roleValue) return null;
  const normalized = roleValue.toLowerCase().trim();
  if (!normalized) return null;
  if (normalized === 'diner') return 'customer';
  return normalized;
}

function getMetadataRole(user: User | null | undefined): string | null {
  const role =
    (user?.app_metadata?.role as string | undefined) ??
    (user?.user_metadata?.role as string | undefined);
  return normalizeRole(role);
}

export async function getRoleForSignedInUser(
  userId: string,
  user?: User | null,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return getMetadataRole(user);

  const { data, error } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('auth_user_id', userId)
    .maybeSingle();

  const profileRole = !error ? normalizeRole(data?.role) : null;
  return profileRole ?? getMetadataRole(user);
}

export async function resolveHomeForSignedInUser(
  userId: string,
  user?: User | null,
): Promise<{ href: AuthHomeHref; role: string | null }> {
  const role = await getRoleForSignedInUser(userId, user);
  const canUseStaff = roleIncludes(role, 'owner');
  const preference = await getAppShellPreference();

  if (preference === 'staff' && canUseStaff) return { href: '/(staff)', role };
  return { href: '/(customer)', role };
}
