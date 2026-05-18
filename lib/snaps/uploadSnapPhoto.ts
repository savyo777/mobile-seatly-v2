import * as FileSystem from 'expo-file-system/legacy';
import { createClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv } from '@/lib/supabase/env';
import { VISIT_PHOTOS_BUCKET, visitPhotoObjectPath } from '@/lib/storage/buckets';

/**
 * Uploads a local snap photo (file:// URI) to the visit-photos bucket.
 *
 * Implementation history:
 *
 *   1. Original: `await (await fetch(uri)).blob()` — known RN footgun, the
 *      blob came back zero-byte and storage rows got created with empty
 *      objects → black thumbnails.
 *
 *   2. Replaced with `FileSystem.uploadAsync` to stream bytes directly to
 *      Supabase Storage's REST endpoint with manual `apikey` + `Authorization`
 *      headers. Worked when the project's apikey was the legacy `eyJ...` JWT.
 *
 *   3. CURRENT: Supabase disabled legacy API keys on this project (the
 *      `sb_publishable_*` format is now the only valid apikey). Storage's
 *      REST endpoint behind the new key format requires the apikey to be
 *      attached the way the JS SDK does it (not as a raw header), otherwise
 *      auth.uid() resolves to NULL server-side and RLS rejects with "new row
 *      violates row-level security policy". Switched to the SDK's
 *      `supabase.storage.from(bucket).upload(path, arrayBuffer)` method,
 *      which knows how to negotiate the new key format with the bearer JWT.
 *
 *      Cost: we read the file as base64 + decode to a Uint8Array to feed the
 *      SDK. A 1-3 MB photo → ~1.5-4 MB peak memory during the round-trip.
 *      Acceptable for snap photos.
 *
 * Android caveat retained: `content://` URIs are copied to a temp file://
 * via FileSystem.copyAsync before reading.
 */

async function normalizeToFileUri(uri: string): Promise<string> {
  if (!uri.startsWith('content://')) return uri;
  const ext = uri.match(/\.(jpe?g|png|webp|heic|heif)(\?|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const dest = `${FileSystem.cacheDirectory ?? ''}snap-upload-${Date.now()}.${ext}`;
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

export async function uploadSnapPhoto(args: {
  uri: string;
  userId: string;
  photoId: string;
}): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;

  // Read the session, refresh proactively if the access_token is past or
  // near expiry. Storage RLS rejects expired bearers silently (treats them
  // as anon → auth.uid() resolves to NULL → "new row violates row-level
  // security policy"). The JS SDK is supposed to auto-refresh but in
  // practice doesn't always fire before a manual fetch upload.
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
  const finalExp = session?.expires_at ?? 0;
  if (!session?.access_token || finalExp - nowSec < 0) {
    throw new Error('session_expired_needs_reauth');
  }

  const localUri = await normalizeToFileUri(args.uri);
  // The Storage RLS policy on visit-photos requires
  //   bucket_id = 'visit-photos' AND auth.uid()::text = (storage.foldername(name))[1]
  // session.user.id matches auth.uid() on the server (both come from the
  // same JWT that supabase.storage.upload will send).
  const authUserId = session.user?.id ?? args.userId;
  const path = visitPhotoObjectPath(authUserId, args.photoId);

  // Read file as base64 then decode to a Uint8Array. The Supabase JS SDK's
  // storage.upload() accepts ArrayBuffer / Uint8Array / Blob / File. RN's
  // Blob shim is the known-broken path (zero-byte uploads), so we hand it
  // the underlying ArrayBuffer directly.
  const base64 = await FileSystem.readAsStringAsync(localUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const bytes = base64ToUint8Array(base64);

  // CRITICAL: build a dedicated upload client with an explicit `accessToken`
  // callback. Without this, supabase-js's internal `_getAccessToken` reads
  // `auth.getSession()` again at fetch time and — when the session-loaded
  // state is stale or out-of-sync — falls back to `this.supabaseKey` (the
  // `sb_publishable_*` value) as the Authorization bearer. The server can't
  // parse the publishable key as a user JWT, so `auth.uid()` is NULL and
  // the visit_photos_storage_auth_insert RLS check fails with "new row
  // violates row-level security policy".
  //
  // Binding `accessToken: async () => session.access_token` short-circuits
  // the SDK's session re-read entirely — the upload request is guaranteed
  // to send the user's JWT in Authorization, and auth.uid() resolves to
  // the user's id on the server. Matches the RLS policy's first-folder
  // path segment we computed above.
  const { url, anonKey } = getSupabaseEnv();
  const userAccessToken = session.access_token;
  const uploadClient = createClient(url, anonKey, {
    accessToken: async () => userAccessToken,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  const { error: uploadError } = await uploadClient.storage
    .from(VISIT_PHOTOS_BUCKET)
    .upload(path, bytes, {
      upsert: true,
      contentType: 'image/jpeg',
    });

  if (uploadError) {
    throw new Error(uploadError.message || 'storage_upload_failed');
  }

  const { data } = supabase.storage.from(VISIT_PHOTOS_BUCKET).getPublicUrl(path);
  return data?.publicUrl ?? null;
}
