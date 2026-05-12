import { getSupabase } from '@/lib/supabase/client';
import {
  COVER_PHOTOS_BUCKET,
  RESTAURANT_LOGOS_BUCKET,
  restaurantCoverPath,
  restaurantLogoPath,
} from '@/lib/storage/buckets';

type Kind = 'cover' | 'logo';

const BUCKET_FOR: Record<Kind, string> = {
  cover: COVER_PHOTOS_BUCKET,
  logo: RESTAURANT_LOGOS_BUCKET,
};

const PATH_FOR: Record<Kind, (restaurantId: string) => string> = {
  cover: restaurantCoverPath,
  logo: restaurantLogoPath,
};

export interface UploadRestaurantPhotoArgs {
  uri: string;
  restaurantId: string;
  kind: Kind;
  contentType?: string;
}

/**
 * Uploads a cover photo or logo to the appropriate public bucket and
 * returns the public URL on success. Returns null when supabase isn't
 * configured. Throws on a non-recoverable storage error.
 */
export async function uploadRestaurantPhoto({
  uri,
  restaurantId,
  kind,
  contentType = 'image/jpeg',
}: UploadRestaurantPhotoArgs): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const bucket = BUCKET_FOR[kind];
  const path = PATH_FOR[kind](restaurantId);
  const blob = await (await fetch(uri)).blob();

  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
