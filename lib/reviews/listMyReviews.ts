import { getSupabase } from '@/lib/supabase/client';

export type MyReviewRow = {
  /** visit_photos.id — the primary identifier for a post. */
  id: string;
  restaurantId: string;
  restaurantName: string | null;
  restaurantCoverUrl: string | null;
  /** Effective rating: review row's rating first, photo's own rating fallback. */
  rating: number | null;
  /** Caption text — review.body first, photo.caption fallback. */
  body: string | null;
  createdAt: string | null;
  bookingId: string | null;
  visitPhotoId: string;
  visitPhotoUrl: string | null;
  /** Paired restaurant_reviews row id, or null if no review was paired. */
  reviewId: string | null;
};

type PhotoRow = {
  id: string;
  restaurant_id: string;
  booking_id: string | null;
  image_url: string;
  rating: number | null;
  caption: string | null;
  created_at: string | null;
  restaurants:
    | { name: string | null; cover_photo_url: string | null; cover_image_url: string | null }
    | { name: string | null; cover_photo_url: string | null; cover_image_url: string | null }[]
    | null;
};

type ReviewRow = {
  id: string;
  restaurant_id: string;
  booking_id: string | null;
  rating: number;
  body: string | null;
  created_at: string | null;
};

/**
 * Returns every snap the signed-in user has posted (one row per visit_photos
 * record), paired with the matching restaurant_reviews row when one exists.
 *
 * We start from visit_photos because that's the always-present record — the
 * paired review write is fire-and-forget and may be missing. Rating + caption
 * fall back to the photo's own columns when no review is paired so the row
 * still renders.
 *
 * Pairing strategy (same as before):
 *   1. booking_id match when both rows carry one.
 *   2. nearest review (same user + restaurant) within ~5 minutes of the photo.
 */
export async function listMyReviews(userId: string): Promise<MyReviewRow[]> {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  const { data: photoData, error: photoErr } = await supabase
    .from('visit_photos')
    .select(
      'id, restaurant_id, booking_id, image_url, rating, caption, created_at, restaurants(name, cover_photo_url, cover_image_url)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (photoErr) throw photoErr;

  const photos = (photoData ?? []) as PhotoRow[];
  if (photos.length === 0) return [];

  const restaurantIds = [...new Set(photos.map((p) => p.restaurant_id))];
  const { data: reviewData } = await supabase
    .from('restaurant_reviews')
    .select('id, restaurant_id, booking_id, rating, body, created_at')
    .eq('user_id', userId)
    .in('restaurant_id', restaurantIds);
  const reviews = (reviewData ?? []) as ReviewRow[];

  const byBooking = new Map<string, ReviewRow>();
  const byRestaurant = new Map<string, ReviewRow[]>();
  for (const r of reviews) {
    if (r.booking_id) byBooking.set(r.booking_id, r);
    const arr = byRestaurant.get(r.restaurant_id) ?? [];
    arr.push(r);
    byRestaurant.set(r.restaurant_id, arr);
  }

  const FIVE_MIN_MS = 5 * 60 * 1000;

  return photos.map((p) => {
    const rest = Array.isArray(p.restaurants) ? p.restaurants[0] ?? null : p.restaurants;
    let review: ReviewRow | null = null;

    if (p.booking_id) {
      review = byBooking.get(p.booking_id) ?? null;
    }
    if (!review && p.created_at) {
      const photoMs = Date.parse(p.created_at);
      const candidates = byRestaurant.get(p.restaurant_id) ?? [];
      let best: { row: ReviewRow; delta: number } | null = null;
      for (const r of candidates) {
        if (!r.created_at) continue;
        const delta = Math.abs(Date.parse(r.created_at) - photoMs);
        if (delta > FIVE_MIN_MS) continue;
        if (!best || delta < best.delta) best = { row: r, delta };
      }
      review = best?.row ?? null;
    }

    return {
      id: p.id,
      restaurantId: p.restaurant_id,
      restaurantName: rest?.name ?? null,
      // Prefer cover_image_url (owner Edit Profile writes here); fall back
      // to legacy cover_photo_url for seeded rows.
      restaurantCoverUrl: rest?.cover_image_url ?? rest?.cover_photo_url ?? null,
      rating: review?.rating ?? p.rating ?? null,
      body: review?.body ?? p.caption ?? null,
      createdAt: p.created_at,
      bookingId: p.booking_id,
      visitPhotoId: p.id,
      visitPhotoUrl: p.image_url ?? null,
      reviewId: review?.id ?? null,
    };
  });
}
