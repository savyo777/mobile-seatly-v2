// Supabase Storage bucket names. Centralized so a rename only happens in
// one place. Buckets are created by SQL migrations under
// supabase/migrations/.

export const RECEIPTS_BUCKET = 'receipts';
export const VISIT_PHOTOS_BUCKET = 'visit-photos';

// Path convention for the visit-photos bucket:
//   `{user_id}/{photo_id}.jpg`
// First segment is the auth user id so storage RLS can scope writes per user.
export function visitPhotoObjectPath(userId: string, photoId: string): string {
  return `${userId}/${photoId}.jpg`;
}
export const RESTAURANT_LOGOS_BUCKET = 'restaurant-logos';
export const COVER_PHOTOS_BUCKET = 'cover-photos';
export const EVENT_MEDIA_BUCKET = 'event-media';

// Path convention for the receipts bucket:
//   `{restaurant_id}/{expense_id}.jpg`
// The first segment is what the storage RLS policies key off of.
export function receiptObjectPath(restaurantId: string, expenseId: string): string {
  return `${restaurantId}/${expenseId}.jpg`;
}

// Restaurant-asset paths use `{restaurant_id}/{filename}` so storage RLS can
// scope by the first segment. Filename is timestamped so the resulting
// public URL busts caches on update.
export function restaurantLogoPath(restaurantId: string): string {
  return `${restaurantId}/logo-${Date.now()}.jpg`;
}
export function restaurantCoverPath(restaurantId: string): string {
  return `${restaurantId}/cover-${Date.now()}.jpg`;
}

export function eventMediaPath(
  restaurantId: string,
  kind: 'event' | 'promo',
  ext: string,
): string {
  return `${restaurantId}/${kind}-${Date.now()}.${ext}`;
}
