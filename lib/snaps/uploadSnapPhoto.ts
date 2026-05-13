import { getSupabase } from '@/lib/supabase/client';
import { VISIT_PHOTOS_BUCKET, visitPhotoObjectPath } from '@/lib/storage/buckets';

export async function uploadSnapPhoto(args: {
  uri: string;
  userId: string;
  photoId: string;
}): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = visitPhotoObjectPath(args.userId, args.photoId);
  const blob = await (await fetch(args.uri)).blob();

  const { error } = await supabase.storage
    .from(VISIT_PHOTOS_BUCKET)
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(VISIT_PHOTOS_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
