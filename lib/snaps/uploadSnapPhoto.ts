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
 *
 * Android caveat: `uploadAsync` cannot stream `content://` URIs (the format
 * the Android photo picker returns when `copyToCacheDirectory` is false).
 * We defensively detect and copy them to a temp file:// URI before uploading
 * so any caller path that bypasses the picker option still works.
 */
function decodeJwtSub(token: string): string | null {
  try {
    const part = token.split('.')[1];
    // base64url -> base64
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = typeof atob !== 'undefined' ? atob(padded) : Buffer.from(padded, 'base64').toString('utf-8');
    const claims = JSON.parse(json);
    return typeof claims?.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}

async function normalizeToFileUri(uri: string): Promise<string> {
  if (!uri.startsWith('content://')) return uri;
  const ext = uri.match(/\.(jpe?g|png|webp|heic|heif)(\?|$)/i)?.[1]?.toLowerCase() ?? 'jpg';
  const dest = `${FileSystem.cacheDirectory ?? ''}snap-upload-${Date.now()}.${ext}`;
  await FileSystem.copyAsync({ from: uri, to: dest });
  return dest;
}

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

  const localUri = await normalizeToFileUri(args.uri);

  // Decode the access_token's `sub` claim — this is the literal user id that
  // Supabase Storage will see as auth.uid() when applying RLS. Using
  // session.user?.id can drift from the JWT's sub if the SDK refreshed the
  // user object out-of-band with the access_token. The storage RLS policy
  //   bucket_id='visit-photos' AND auth.uid()::text=(storage.foldername(name))[1]
  // is strict, so any mismatch surfaces as "new row violates row-level
  // security policy" — same shape as our prior failures.
  const jwtSub = decodeJwtSub(session.access_token);
  const authUserId = jwtSub ?? session.user?.id ?? args.userId;
  if (__DEV__) {
    // eslint-disable-next-line no-console
    console.warn('[uploadSnapPhoto] auth-id resolution', {
      jwtSub,
      sessionUserId: session.user?.id,
      argsUserId: args.userId,
      using: authUserId,
    });
  }
  const path = visitPhotoObjectPath(authUserId, args.photoId);
  const uploadUrl = `${url}/storage/v1/object/${VISIT_PHOTOS_BUCKET}/${path}`;

  const result = await FileSystem.uploadAsync(uploadUrl, localUri, {
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
