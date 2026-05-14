import { getSupabase } from '@/lib/supabase/client';
import { VISIT_PHOTOS_BUCKET } from '@/lib/storage/buckets';

export type DeleteMyReviewInput = {
  userId: string;
  visitPhotoId: string;
  visitPhotoUrl?: string | null;
  /** Paired restaurant_reviews.id — when present, also delete the review row. */
  reviewId?: string | null;
};

/**
 * Removes the user's visit_photos row + the underlying storage object, and
 * (when supplied) the paired restaurant_reviews row. Photo deletion drives the
 * cascade so a snap-only entry can also be cleaned up.
 *
 * RLS scopes deletes to the row's owner (auth.uid() = user_id) so a missing or
 * mismatched userId fails cleanly without affecting another customer's data.
 *
 * Storage path is parsed from the public URL the bucket served:
 *   .../storage/v1/object/public/visit-photos/{userId}/{photoId}.jpg
 * Everything after `/visit-photos/` is the object key we pass to remove().
 */
export async function deleteMyReview(input: DeleteMyReviewInput): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !input.userId || !input.visitPhotoId) return;

  const { error: photoErr } = await supabase
    .from('visit_photos')
    .delete()
    .eq('id', input.visitPhotoId)
    .eq('user_id', input.userId);
  if (photoErr) throw photoErr;

  if (input.reviewId) {
    try {
      await supabase
        .from('restaurant_reviews')
        .delete()
        .eq('id', input.reviewId)
        .eq('user_id', input.userId);
    } catch {
      // Non-fatal — the photo is already gone, restaurant Photos section
      // will refresh on focus; review section will too once the row is gone.
    }
  }

  if (input.visitPhotoUrl) {
    const marker = `/${VISIT_PHOTOS_BUCKET}/`;
    const idx = input.visitPhotoUrl.indexOf(marker);
    if (idx >= 0) {
      const path = input.visitPhotoUrl.slice(idx + marker.length);
      try {
        await supabase.storage.from(VISIT_PHOTOS_BUCKET).remove([path]);
      } catch {
        // Non-fatal — DB rows are already gone.
      }
    }
  }
}
