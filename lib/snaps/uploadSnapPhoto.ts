import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { VISIT_PHOTOS_BUCKET, visitPhotoObjectPath } from '@/lib/storage/buckets';

/**
 * Uploads a local snap photo (file:// URI) to the visit-photos bucket.
 *
 * The previous implementation used `await (await fetch(uri)).blob()` which is
 * a known React Native footgun — fetching a `file://` URI returns a Body whose
 * `.blob()` resolves to a zero-byte Blob, so the storage row got created with
 * an empty object. That made every saved snap render as a black thumbnail.
 *
 * Fix: use expo-file-system's `uploadAsync` to stream the file's bytes
 * directly to Supabase Storage's REST endpoint. The Supabase JS client only
 * helps us derive the URL / inject auth — the actual transfer is binary.
 */
export async function uploadSnapPhoto(args: {
  uri: string;
  userId: string;
  photoId: string;
}): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  const { url } = getSupabaseEnv();
  if (!url) return null;

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return null;

  const path = visitPhotoObjectPath(args.userId, args.photoId);
  const uploadUrl = `${url}/storage/v1/object/${VISIT_PHOTOS_BUCKET}/${path}`;

  const result = await FileSystem.uploadAsync(uploadUrl, args.uri, {
    httpMethod: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true',
      apikey: getSupabaseEnv().anonKey,
    },
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
  });

  if (result.status >= 400) {
    throw new Error(`Supabase storage upload failed (${result.status}): ${result.body}`);
  }

  const { data } = supabase.storage.from(VISIT_PHOTOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
