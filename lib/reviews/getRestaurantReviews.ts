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

export async function fetchRestaurantPublicReviews(
  restaurantId: string,
  limit = 12,
): Promise<RestaurantPublicReviewRow[]> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return [];

  const { data, error } = await supabase.rpc('restaurant_public_reviews', {
    p_restaurant_id: restaurantId,
    p_limit: limit,
  });
  if (error) throw error;
  return ((data ?? []) as RestaurantPublicReviewRow[]) ?? [];
}

export async function fetchRestaurantReviewSummaries(
  restaurantIds: string[],
): Promise<RestaurantReviewSummaryRow[]> {
  const supabase = getSupabase();
  const ids = restaurantIds.filter((id) => typeof id === 'string' && id.length > 0);
  if (!supabase || !ids.length) return [];

  const { data, error } = await supabase.rpc('restaurant_review_summaries', {
    p_restaurant_ids: ids,
  });
  if (error) throw error;
  return ((data ?? []) as RestaurantReviewSummaryRow[]) ?? [];
}
