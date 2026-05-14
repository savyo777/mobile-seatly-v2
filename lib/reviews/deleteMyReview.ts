import { getSupabase } from '@/lib/supabase/client';
import { VISIT_PHOTOS_BUCKET } from '@/lib/storage/buckets';

export type DeleteMyReviewInput = {
  userId: string;
  reviewId: string;
  visitPhotoId?: string | null;
  visitPhotoUrl?: string | null;
};

/**
 * Removes the user's restaurant_reviews row and, when we paired one with it,
 * the matching visit_photos row + its storage object. RLS scopes deletes to
 * the row's owner (auth.uid() = user_id) so a missing/wrong userId fails
 * cleanly.
 *
 * Storage object path is derived from the public URL the bucket served:
 *   .../storage/v1/object/public/visit-photos/{userId}/{photoId}.jpg
 * We pull everything after `visit-photos/` and pass it to storage.remove().
 */
export async function deleteMyReview(input: DeleteMyReviewInput): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !input.userId || !input.reviewId) return;

  const { error: reviewErr } = await supabase
    .from('restaurant_reviews')
    .delete()
    .eq('id', input.reviewId)
    .eq('user_id', input.userId);
  if (reviewErr) throw reviewErr;

  if (input.visitPhotoId) {
    try {
      await supabase
        .from('visit_photos')
        .delete()
        .eq('id', input.visitPhotoId)
        .eq('user_id', input.userId);
    } catch {
      // Non-fatal — review is already gone.
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
