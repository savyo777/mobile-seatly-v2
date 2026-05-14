import { getSupabase } from '@/lib/supabase/client';

export type InsertRestaurantReviewInput = {
  userId: string;
  restaurantId: string;
  rating: number;
  body: string;
};

/**
 * Adds a row to `restaurant_reviews` so the customer's freshly posted snap
 * shows up in the Reviews section of the restaurant detail page (not just the
 * Photos grid). Rating is clamped 1..5; empty bodies are stored as NULL so the
 * UI's "no review text" fallback can apply.
 *
 * Returns the inserted row id when successful, or null if Supabase is not
 * available (e.g. in demo mode where the client isn't configured).
 */
export async function insertRestaurantReview(
  input: InsertRestaurantReviewInput,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase || !input.userId || !input.restaurantId) return null;

  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  const body = input.body.trim();

  const { data, error } = await supabase
    .from('restaurant_reviews')
    .insert({
      user_id: input.userId,
      restaurant_id: input.restaurantId,
      rating,
      body: body.length > 0 ? body : null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return (data?.id as string | undefined) ?? null;
}
