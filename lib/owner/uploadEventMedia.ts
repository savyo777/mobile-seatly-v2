import { getSupabase } from '@/lib/supabase/client';
import { EVENT_MEDIA_BUCKET, eventMediaPath } from '@/lib/storage/buckets';

export interface UploadEventMediaArgs {
  uri: string;
  restaurantId: string;
  kind: 'event' | 'promo';
  ext: string;
  contentType: string;
}

export async function uploadEventMedia({
  uri,
  restaurantId,
  kind,
  ext,
  contentType,
}: UploadEventMediaArgs): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const path = eventMediaPath(restaurantId, kind, ext);
  const blob = await (await fetch(uri)).blob();

  const { error } = await supabase.storage
    .from(EVENT_MEDIA_BUCKET)
    .upload(path, blob, { contentType, upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from(EVENT_MEDIA_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
