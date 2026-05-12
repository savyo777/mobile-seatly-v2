import { getSupabase } from '@/lib/supabase/client';

export type RestaurantPublicReviewRow = {
  id: string;
  reservation_id: string | null;
  guest_id: string | null;
  user_profile_id: string | null;
  reviewer_name: string | null;
  rating: number;
  review_text: string | null;
  created_at: string | null;
};

export type RestaurantReviewSummaryRow = {
  restaurant_id: string;
  avg_rating: number | null;
  total_reviews: number;
};

type PublicReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string | null;
  user_id: string | null;
  user_profiles: { full_name: string | null } | { full_name: string | null }[] | null;
};

export async function fetchRestaurantPublicReviews(
  restaurantId: string,
  limit = 12,
): Promise<RestaurantPublicReviewRow[]> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return [];

  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('id, rating, body, created_at, user_id, user_profiles!user_id(full_name)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data ?? []) as PublicReviewRow[];
  return rows.map((row) => {
    const profile = Array.isArray(row.user_profiles)
      ? row.user_profiles[0] ?? null
      : row.user_profiles;
    return {
      id: row.id,
      reservation_id: null,
      guest_id: null,
      user_profile_id: row.user_id,
      reviewer_name: profile?.full_name ?? 'Guest',
      rating: row.rating,
      review_text: row.body,
      created_at: row.created_at,
    };
  });
}

type SummaryRow = {
  restaurant_id: string;
  rating: number;
};

export async function fetchRestaurantReviewSummaries(
  restaurantIds: string[],
): Promise<RestaurantReviewSummaryRow[]> {
  const supabase = getSupabase();
  const ids = restaurantIds.filter((id) => typeof id === 'string' && id.length > 0);
  if (!supabase || !ids.length) return [];

  const { data, error } = await supabase
    .from('restaurant_reviews')
    .select('restaurant_id, rating')
    .in('restaurant_id', ids);
  if (error) throw error;

  const rows = (data ?? []) as SummaryRow[];
  const totals = new Map<string, { sum: number; count: number }>();
  for (const row of rows) {
    if (!row || typeof row.restaurant_id !== 'string') continue;
    const rating = typeof row.rating === 'number' ? row.rating : Number(row.rating);
    if (!Number.isFinite(rating)) continue;
    const entry = totals.get(row.restaurant_id) ?? { sum: 0, count: 0 };
    entry.sum += rating;
    entry.count += 1;
    totals.set(row.restaurant_id, entry);
  }

  const summaries: RestaurantReviewSummaryRow[] = [];
  for (const [restaurant_id, { sum, count }] of totals) {
    summaries.push({
      restaurant_id,
      avg_rating: count > 0 ? sum / count : null,
      total_reviews: count,
    });
  }
  return summaries;
}
