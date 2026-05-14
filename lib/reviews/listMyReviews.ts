import { getSupabase } from '@/lib/supabase/client';

export type MyReviewRow = {
  id: string;
  restaurantId: string;
  restaurantName: string | null;
  restaurantCoverUrl: string | null;
  rating: number;
  body: string | null;
  createdAt: string | null;
  bookingId: string | null;
  visitPhotoId: string | null;
  visitPhotoUrl: string | null;
};

type ReviewRow = {
  id: string;
  restaurant_id: string;
  booking_id: string | null;
  rating: number;
  body: string | null;
  created_at: string | null;
  restaurants:
    | { name: string | null; cover_photo_url: string | null; cover_image_url: string | null }
    | { name: string | null; cover_photo_url: string | null; cover_image_url: string | null }[]
    | null;
};

type PhotoRow = {
  id: string;
  image_url: string;
  booking_id: string | null;
  restaurant_id: string;
  created_at: string | null;
};

/**
 * Fetches every review the signed-in user has posted, joined with the
 * restaurant's name + cover photo and (when we can pair them) the user's
 * visit_photo for that same booking so the My Reviews list can show a
 * thumbnail and offer a single "delete" action for the whole entry.
 *
 * Pairing strategy:
 *   1. Match by booking_id when both rows carry one.
 *   2. Fall back to nearest visit_photo for the same restaurant within
 *      ~5 minutes of the review (covers reviews posted without a booking).
 */
export async function listMyReviews(userId: string): Promise<MyReviewRow[]> {
  const supabase = getSupabase();
  if (!supabase || !userId) return [];

  const { data: reviewData, error: reviewErr } = await supabase
    .from('restaurant_reviews')
    .select(
      'id, restaurant_id, booking_id, rating, body, created_at, restaurants(name, cover_photo_url, cover_image_url)',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (reviewErr) throw reviewErr;

  const reviews = (reviewData ?? []) as ReviewRow[];
  if (reviews.length === 0) return [];

  const restaurantIds = [...new Set(reviews.map((r) => r.restaurant_id))];
  const { data: photoData } = await supabase
    .from('visit_photos')
    .select('id, image_url, booking_id, restaurant_id, created_at')
    .eq('user_id', userId)
    .in('restaurant_id', restaurantIds);
  const photos = (photoData ?? []) as PhotoRow[];

  const byBooking = new Map<string, PhotoRow>();
  const byRestaurant = new Map<string, PhotoRow[]>();
  for (const p of photos) {
    if (p.booking_id) byBooking.set(p.booking_id, p);
    const arr = byRestaurant.get(p.restaurant_id) ?? [];
    arr.push(p);
    byRestaurant.set(p.restaurant_id, arr);
  }

  const FIVE_MIN_MS = 5 * 60 * 1000;

  return reviews.map((r) => {
    const rest = Array.isArray(r.restaurants) ? r.restaurants[0] ?? null : r.restaurants;
    let photo: PhotoRow | null = null;

    if (r.booking_id) {
      photo = byBooking.get(r.booking_id) ?? null;
    }
    if (!photo && r.created_at) {
      const reviewMs = Date.parse(r.created_at);
      const candidates = byRestaurant.get(r.restaurant_id) ?? [];
      let best: { photo: PhotoRow; delta: number } | null = null;
      for (const p of candidates) {
        if (!p.created_at) continue;
        const delta = Math.abs(Date.parse(p.created_at) - reviewMs);
        if (delta > FIVE_MIN_MS) continue;
        if (!best || delta < best.delta) best = { photo: p, delta };
      }
      photo = best?.photo ?? null;
    }

    return {
      id: r.id,
      restaurantId: r.restaurant_id,
      restaurantName: rest?.name ?? null,
      restaurantCoverUrl: rest?.cover_photo_url ?? rest?.cover_image_url ?? null,
      rating: r.rating,
      body: r.body,
      createdAt: r.created_at,
      bookingId: r.booking_id,
      visitPhotoId: photo?.id ?? null,
      visitPhotoUrl: photo?.image_url ?? null,
    };
  });
}
