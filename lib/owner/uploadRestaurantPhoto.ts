import * as FileSystem from 'expo-file-system/legacy';
import { getSupabase } from '@/lib/supabase/client';
import {
  COVER_PHOTOS_BUCKET,
  RESTAURANT_LOGOS_BUCKET,
  restaurantCoverPath,
  restaurantLogoPath,
} from '@/lib/storage/buckets';

/**
 * Uploads a cover photo or logo to the appropriate public bucket and
 * returns the public URL on success.
 *
 * Two bugs were producing the "Save failed, try again in a moment" alert
 * on the staff Edit Profile screen and are fixed here:
 *
 *   1. `await (await fetch(uri)).blob()` — same RN footgun documented in
 *      lib/snaps/uploadSnapPhoto.ts. RN's Blob shim hands the Supabase
 *      SDK a zero-byte/malformed body. Storage either rejects with a
 *      vague error or accepts a 0-byte object. Read the file as base64
 *      via expo-file-system, decode to a Uint8Array, and pass that to
 *      the SDK's storage.upload() — same recipe the snap path uses.
 *
 *   2. No session refresh. Storage RLS silently treats an expired
 *      access_token as anon → auth.uid() = NULL → "new row violates
 *      row-level security policy" even though the user's profile row
 *      exists. The SDK's autoRefresh sometimes hasn't fired before a
 *      manual upload; refresh proactively when we're within 60s of expiry.
 *
 * Android content:// URIs are copied to a file:// in the cache directory
 * first so FileSystem.readAsStringAsync can read them.
 */

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

async function normalizeToFileUri(uri: string): Promise<string> {
  if (!uri.startsWith('content://')) return uri;
  const ext = uri.match(/\.(jpe?g|png|webp|heic|heif)(\?|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const dest = `${FileSystem.cacheDirectory ?? ''}restaurant-upload-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = typeof atob !== 'undefined'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function uploadRestaurantPhoto({
  uri,
  restaurantId,
  kind,
  contentType = 'image/jpeg',
}: UploadRestaurantPhotoArgs): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Refresh the access token if we're within 60s of expiry. Storage RLS
  // rejects expired bearers as anonymous, which surfaces as an opaque
  // "row-level security" error instead of "session expired."
  let { data: { session } } = await supabase.auth.getSession();
  const nowSec = Math.floor(Date.now() / 1000);
  const refreshGraceSec = 60;
  if (session?.expires_at && session.expires_at - nowSec < refreshGraceSec) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    if (refreshError || !refreshed.session) {
      throw new Error('session_expired_needs_reauth');
    }
    session = refreshed.session;
  }
  if (!session?.access_token) {
    throw new Error('session_expired_needs_reauth');
  }

  const bucket = BUCKET_FOR[kind];
  const path = PATH_FOR[kind](restaurantId);

  // Read the file via expo-file-system (RN's fetch + Blob path is the
  // documented broken route — see header comment).
  const localUri = await normalizeToFileUri(uri);
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);

  // upsert:false is safe because restaurantCoverPath / restaurantLogoPath
  // both timestamp the filename, so collisions don't happen. Avoids any
  // edge case where x-upsert demands both INSERT and UPDATE storage
  // policies (the cover-photos and restaurant-logos buckets do have both,
  // but a fresh INSERT against the per-restaurant folder is exactly what
  // we want here).
  const { error } = await supabase.storage
    .from(bucket)
    .upload(path, bytes, { contentType, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
