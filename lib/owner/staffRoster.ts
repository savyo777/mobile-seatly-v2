/**
 * Staff roster — owner-side read model backed by `user_restaurant_roles`
 * joined with `user_profiles`.
 *
 * The live Supabase project does NOT have a dedicated `staff_members`
 * table. Every assignment row in `user_restaurant_roles` represents a
 * current staff member at a restaurant (there is no `active`/`status`
 * column), so the join is sufficient on its own.
 *
 * The returned shape mirrors `lib/mock/ownerApp.ts#StaffRosterMember` so
 * `app/(staff)/staff.tsx` can render real and mock data through the same
 * components. `shift` and `onClock` are placeholders — neither piece of
 * information lives on `user_restaurant_roles` today.
 */
import { getSupabase } from '@/lib/supabase/client';

export type StaffRosterEntry = {
  /** `user_restaurant_roles.id` — stable per assignment. */
  id: string;
  /** `user_profiles.full_name` if present, otherwise email, otherwise "Staff". */
  name: string;
  /** Role label (manager / server / host …). */
  role: string;
  /** Restaurant the assignment belongs to. Used for the "All restaurants" pill. */
  restaurantId: string;
  /** Employment-type tag from `user_restaurant_roles.employment_type`. Shown in the shift slot. */
  shift: string;
  /** No clock-in signal on `user_restaurant_roles`, so always false. */
  onClock: boolean;
};

type UserProfileJoin = {
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type RoleRow = {
  id?: string | null;
  user_id?: string | null;
  restaurant_id?: string | null;
  role?: string | null;
  is_primary?: boolean | null;
  employment_type?: string | null;
  user_profiles?: UserProfileJoin | UserProfileJoin[] | null;
};

const ROSTER_SELECT =
  'id, user_id, restaurant_id, role, is_primary, employment_type, user_profiles:user_id(full_name, email, phone)';

function pickProfile(value: RoleRow['user_profiles']): UserProfileJoin | null {
  if (!value) return null;
  if (Array.isArray(value)) return value[0] ?? null;
  return value;
}

/**
 * Fetches the staff roster for one or many restaurants.
 *
 * - Returns `[]` for empty/missing input, Supabase unavailable, or query errors.
 * - Pass a single id in `restaurantIds` for single-restaurant scope; pass every
 *   owned id for "All restaurants" mode.
 */
export async function fetchStaffRoster(
  restaurantIds: string[],
): Promise<StaffRosterEntry[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const ids = (restaurantIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0);
  if (ids.length === 0) return [];

  try {
    const { data, error } = await supabase
      .from('user_restaurant_roles')
      .select(ROSTER_SELECT)
      .in('restaurant_id', ids);

    if (error) return [];
    const rows = (data ?? []) as RoleRow[];
    return rows.map((row) => {
      const profile = pickProfile(row.user_profiles);
      const name =
        (profile?.full_name && String(profile.full_name).trim()) ||
        (profile?.email && String(profile.email).trim()) ||
        'Staff';
      return {
        id: String(row.id ?? ''),
        name,
        role: String(row.role ?? 'Staff'),
        restaurantId: String(row.restaurant_id ?? ''),
        shift: String(row.employment_type ?? ''),
        onClock: false,
      };
    });
  } catch {
    return [];
  }
}
