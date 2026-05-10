import { getSupabase } from '@/lib/supabase/client';
import { RECEIPTS_BUCKET, receiptObjectPath } from '@/lib/storage/buckets';

export interface UploadReceiptImageArgs {
  uri: string;
  restaurantId: string;
  expenseId: string;
  contentType?: string;
}

/**
 * Uploads a captured receipt image to the `receipts` bucket and returns
 * the storage path on success, or null when supabase isn't configured.
 * Throws on a non-recoverable storage error.
 */
export async function uploadReceiptImage({
  uri,
  restaurantId,
  expenseId,
  contentType = 'image/jpeg',
}: UploadReceiptImageArgs): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = receiptObjectPath(restaurantId, expenseId);
  const blob = await (await fetch(uri)).blob();

  const { error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;

  return path;
}

export async function getReceiptSignedUrl(
  imagePath: string,
  expiresInSeconds = 60 * 5,
): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(imagePath, expiresInSeconds);
  if (error) return null;
  return data?.signedUrl ?? null;
}
