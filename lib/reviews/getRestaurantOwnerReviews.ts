import { getSupabase } from '@/lib/supabase/client';

/**
 * Reviews fetcher for the owner-side All Reviews screen. Mirrors the
 * pairing strategy in `listMyReviews.ts` but runs in the opposite
 * direction: every review for ONE restaurant, with any photos the
 * reviewer attached. Used by `app/(staff)/reviews.tsx`.
 *
 * Resilience: the reviewer-name join and the visit_photos pairing are
 * both treated as best-effort. If either fails (RLS, missing column,
 * etc.), reviews still render — name falls back to the localized
 * `anonymousLabel` and photos array stays empty. Only a hard failure on
 * the primary restaurant_reviews query raises an error to the caller.
 */
export type OwnerReviewRow = {
  /** `restaurant_reviews.id` */
  id: string;
  /** 1..5 */
  rating: number;
  /** Review text — may be empty if the reviewer only attached a photo + rating. */
  body: string | null;
  createdAt: string | null;
  /** Display name. Falls back to the literal string the caller passes when the
   *  profile is null (anonymous reviewer, deleted profile, RLS blocking the join). */
  reviewerName: string;
  bookingId: string | null;
  /** Paired `visit_photos.image_url`s for this review. 0..N. */
  photoUrls: string[];
};

type ReviewRow = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string | null;
  user_id: string | null;
  booking_id: string | null;
};

type ProfileRow = {
  id: string;
  full_name: string | null;
};

type PhotoRow = {
  id: string;
  user_id: string | null;
  booking_id: string | null;
  image_url: string;
  created_at: string | null;
};

const FIVE_MIN_MS = 5 * 60 * 1000;

function supabaseErrorMessage(err: unknown, fallback: string): string {
  if (!err) return fallback;
  if (typeof err === 'string' && err.trim()) return err;
  if (err && typeof err === 'object') {
    const e = err as { message?: unknown; details?: unknown; hint?: unknown; code?: unknown };
    const parts = [e.message, e.details, e.hint, e.code]
      .filter((v): v is string => typeof v === 'string' && v.trim().length > 0);
    if (parts.length) return parts.join(' · ');
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

/**
 * Fetches all reviews for `restaurantId` newest-first and pairs each one
 * with any photos the reviewer uploaded.
 *
 * Pairing strategy (matches `listMyReviews.ts:90-110`):
 *   1. Photos with the same `booking_id` as the review.
 *   2. Photos with the same `user_id` + restaurant, created within ±5 min
 *      of the review timestamp.
 *
 * Returns an empty array when `restaurantId` is falsy or Supabase isn't
 * configured. Throws on a Supabase error against `restaurant_reviews` so
 * the caller can surface a retry. Errors against the secondary
 * `user_profiles` and `visit_photos` queries are swallowed (logged in
 * dev) — the reviews still render without names / photos.
 *
 * @param restaurantId  The restaurant whose reviews to load.
 * @param anonymousLabel  Localized display name for reviewers with no
 *   joined `user_profiles.full_name`. Caller passes the right i18n string
 *   (e.g. "Anonymous diner").
 * @param limit  Optional cap on review count (newest first). Default: no cap.
 */
export async function fetchRestaurantOwnerReviews(
  restaurantId: string,
  anonymousLabel: string,
  limit?: number,
): Promise<OwnerReviewRow[]> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return [];

  let reviewsQuery = supabase
    .from('restaurant_reviews')
    .select('id, rating, body, created_at, user_id, booking_id')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false });
  if (typeof limit === 'number' && limit > 0) {
    reviewsQuery = reviewsQuery.limit(limit);
  }

  const { data: reviewData, error: reviewErr } = await reviewsQuery;
  if (reviewErr) {
    throw new Error(supabaseErrorMessage(reviewErr, 'Could not load reviews.'));
  }
  const reviews = (reviewData ?? []) as ReviewRow[];
  if (reviews.length === 0) return [];

  // Secondary lookup: reviewer display names. RLS may block reads of other
  // users' profiles from the owner context, in which case we just fall back
  // to the anonymous label per-row.
  const userIds = Array.from(
    new Set(reviews.map((r) => r.user_id).filter((id): id is string => typeof id === 'string')),
  );
  const profilesById = new Map<string, ProfileRow>();
  if (userIds.length > 0) {
    const { data: profileData, error: profileErr } = await supabase
      .from('user_profiles')
      .select('id, full_name')
      .in('id', userIds);
    if (profileErr) {
      if (__DEV__) console.warn('[ownerReviews] profiles fetch failed', profileErr);
    } else {
      for (const row of (profileData ?? []) as ProfileRow[]) {
        if (row?.id) profilesById.set(row.id, row);
      }
    }
  }

  // Tertiary lookup: visit photos paired by booking_id or ±5min proximity.
  // Best-effort. Owners may not have RLS access to photos posted by other
  // diners; if the query fails we still render reviews without photos.
  let photos: PhotoRow[] = [];
  try {
    const { data: photoData, error: photoErr } = await supabase
      .from('visit_photos')
      .select('id, user_id, booking_id, image_url, created_at')
      .eq('restaurant_id', restaurantId);
    if (photoErr) {
      if (__DEV__) console.warn('[ownerReviews] visit_photos fetch failed', photoErr);
    } else {
      photos = (photoData ?? []) as PhotoRow[];
    }
  } catch (err) {
    if (__DEV__) console.warn('[ownerReviews] visit_photos fetch threw', err);
  }

  const photosByBooking = new Map<string, PhotoRow[]>();
  const photosByUser = new Map<string, PhotoRow[]>();
  for (const p of photos) {
    if (p.booking_id) {
      const arr = photosByBooking.get(p.booking_id) ?? [];
      arr.push(p);
      photosByBooking.set(p.booking_id, arr);
    }
    if (p.user_id) {
      const arr = photosByUser.get(p.user_id) ?? [];
      arr.push(p);
      photosByUser.set(p.user_id, arr);
    }
  }

  return reviews.map((review) => {
    const profileName =
      review.user_id ? profilesById.get(review.user_id)?.full_name?.trim() : null;
    const reviewerName = profileName || anonymousLabel;

    let matched: PhotoRow[] = [];
    if (review.booking_id) {
      matched = photosByBooking.get(review.booking_id) ?? [];
    }
    if (matched.length === 0 && review.user_id && review.created_at) {
      const reviewMs = Date.parse(review.created_at);
      if (Number.isFinite(reviewMs)) {
        const candidates = photosByUser.get(review.user_id) ?? [];
        matched = candidates.filter((p) => {
          if (!p.created_at) return false;
          const delta = Math.abs(Date.parse(p.created_at) - reviewMs);
          return Number.isFinite(delta) && delta <= FIVE_MIN_MS;
        });
      }
    }

    const photoUrls = matched
      .map((p) => p.image_url)
      .filter((url): url is string => typeof url === 'string' && url.length > 0);

    return {
      id: review.id,
      rating: review.rating,
      body: review.body,
      createdAt: review.created_at,
      reviewerName,
      bookingId: review.booking_id,
      photoUrls,
    };
  });
}
