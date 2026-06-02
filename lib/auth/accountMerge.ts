import { getSupabase } from '@/lib/supabase/client';

// Diner duplicate-account detection + merge (mirrors web's AuthCallbackPage
// Phase-5 flow). A diner who signs in with a second method (e.g. Google, then
// phone) ends up with two user_profiles rows on different auth.users sharing an
// email or phone. We detect that post-login and offer to merge them under the
// OLDER (canonical) account; merge-diner-accounts re-points every FK and
// hard-deletes the duplicate auth.users row.

export type DuplicateAccountInfo = {
  /** The OLDER account everything is merged INTO. */
  canonicalAuthUserId: string;
  /** The NEWER account that gets absorbed + hard-deleted by the merge. */
  archivedAuthUserId: string;
  /**
   * True when the CURRENT session is the archived account — after the merge its
   * auth.users row is gone, so the diner must sign in again as the canonical one.
   */
  archivedIsCurrent: boolean;
  matchedOn: 'email' | 'phone' | 'both';
  matchedValue: string;
  /** Bookings attached to the archived profile (for the prompt copy). */
  archivedBookingCount: number;
};

/**
 * Best-effort duplicate detection. ANY failure (including RLS denying the
 * cross-profile lookup) returns null so the caller falls through to the normal
 * post-login redirect — detection must never block sign-in.
 */
export async function detectDuplicateDinerAccount(): Promise<DuplicateAccountInfo | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const authUserId = session?.user?.id;
    if (!authUserId) return null;

    const { data: meRaw } = await supabase
      .from('user_profiles')
      .select('id, email, phone, created_at')
      .eq('auth_user_id', authUserId)
      .maybeSingle();
    const me = meRaw as
      | { id: string; email: string | null; phone: string | null; created_at: string | null }
      | null;

    const profileEmail = (me?.email ?? '').trim().toLowerCase() || null;
    const profilePhone = (me?.phone ?? '').trim() || null;
    if (!profileEmail && !profilePhone) return null;

    const orFilters: string[] = [];
    if (profileEmail) orFilters.push(`email.eq.${profileEmail}`);
    if (profilePhone) orFilters.push(`phone.eq.${profilePhone}`);

    const { data: dupes } = await supabase
      .from('user_profiles')
      .select('id, auth_user_id, email, phone, created_at')
      .neq('auth_user_id', authUserId)
      .or(orFilters.join(','))
      .limit(1);
    const dupe = (dupes ?? [])[0] as
      | { id: string; auth_user_id: string; email: string | null; phone: string | null; created_at: string }
      | undefined;
    if (!dupe) return null;

    // Canonical = OLDER profile (more history attached → least data movement).
    const dupeCreated = new Date(dupe.created_at).getTime();
    const meCreated = me?.created_at ? new Date(me.created_at).getTime() : Date.now();
    const canonicalIsDuplicate = dupeCreated < meCreated;
    const canonicalAuthUserId = canonicalIsDuplicate ? dupe.auth_user_id : authUserId;
    const archivedAuthUserId = canonicalIsDuplicate ? authUserId : dupe.auth_user_id;
    const archivedProfileId = canonicalIsDuplicate ? (me?.id ?? null) : dupe.id;

    let archivedBookingCount = 0;
    if (archivedProfileId) {
      const { count } = await supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('user_profile_id', archivedProfileId);
      archivedBookingCount = count ?? 0;
    }

    const emailMatch = !!dupe.email && !!profileEmail && dupe.email.toLowerCase() === profileEmail;
    const phoneMatch = !!dupe.phone && !!profilePhone && dupe.phone === profilePhone;
    const matchedOn: DuplicateAccountInfo['matchedOn'] = emailMatch
      ? (phoneMatch ? 'both' : 'email')
      : 'phone';

    return {
      canonicalAuthUserId,
      archivedAuthUserId,
      archivedIsCurrent: archivedAuthUserId === authUserId,
      matchedOn,
      matchedValue: matchedOn === 'phone' ? profilePhone! : profileEmail!,
      archivedBookingCount,
    };
  } catch {
    return null; // best-effort — never block sign-in
  }
}

/**
 * Merge the two accounts via the canonical edge fn. The caller must currently be
 * signed in as one of the two (the server re-verifies via the JWT). Throws on
 * failure. The session JWT is auto-attached by functions.invoke.
 */
export async function mergeDinerAccounts(info: DuplicateAccountInfo): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'merge-diner-accounts',
    {
      body: {
        canonical_auth_user_id: info.canonicalAuthUserId,
        archived_auth_user_id: info.archivedAuthUserId,
      },
    },
  );
  if (error || data?.ok !== true) {
    throw new Error(data?.error ?? error?.message ?? 'Could not merge your accounts.');
  }
}
