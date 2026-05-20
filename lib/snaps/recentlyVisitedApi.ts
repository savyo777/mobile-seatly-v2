import { getSupabase } from '@/lib/supabase/client';

export type RecentRestaurant = {
  restaurantId: string;
  restaurantName: string;
  coverPhotoUrl: string;
  cuisineType: string | null;
  city: string | null;
  visitedAt: string;
};

type ReservationRow = {
  id: string;
  reserved_at: string;
  restaurant:
    | { id: string; name: string | null; cover_photo_url: string | null; cover_image_url: string | null; cuisine_type: string | null; city: string | null }
    | Array<{ id: string; name: string | null; cover_photo_url: string | null; cover_image_url: string | null; cuisine_type: string | null; city: string | null }>
    | null;
};

// Returns restaurants the user has visited (booking time > 1 hour ago),
// deduped by restaurant (most recent visit first), up to `limit`.
export async function fetchRecentlyVisitedRestaurants(limit = 5): Promise<RecentRestaurant[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return [];

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!profile?.id) return [];

  const cutoff = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('reservations')
    .select('id,reserved_at,restaurant:restaurants(id,name,cover_photo_url,cover_image_url,cuisine_type,city)')
    .eq('user_profile_id', profile.id)
    .not('status', 'in', '("cancelled","no_show")')
    .lte('reserved_at', cutoff)
    .order('reserved_at', { ascending: false });

  if (error) throw error;

  const seen = new Set<string>();
  const results: RecentRestaurant[] = [];

  for (const row of (data ?? []) as ReservationRow[]) {
    const r = Array.isArray(row.restaurant) ? row.restaurant[0] ?? null : row.restaurant;
    if (!r?.id || seen.has(r.id)) continue;
    seen.add(r.id);
    results.push({
      restaurantId: r.id,
      restaurantName: r.name ?? 'Restaurant',
      // Prefer cover_image_url (owner Edit Profile writes here); fall back
      // to legacy cover_photo_url for seeded rows.
      coverPhotoUrl: r.cover_image_url || r.cover_photo_url || '',
      cuisineType: r.cuisine_type ?? null,
      city: r.city ?? null,
      visitedAt: row.reserved_at,
    });
    if (results.length >= limit) break;
  }

  return results;
}
