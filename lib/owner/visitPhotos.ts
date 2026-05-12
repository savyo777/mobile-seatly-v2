// Owner-side helper for reading guest-uploaded "snap"/visit photos from the
// `visit_photos` table (created in migration 20260507000000). Each row is a
// photo a diner attached to one of their reservations; the gallery on owner
// surfaces (restaurant profile, business screen) wants the most recent ones
// across all bookings at the restaurant.
//
// Returns [] on any error so callers can render an empty state gracefully.

import { getSupabase } from '@/lib/supabase/client';

export type RestaurantVisitPhoto = {
  id: string;
  imageUrl: string;
  caption: string | null;
  createdAt: string;
  bookingId: string;
  userId: string;
};

type VisitPhotoRow = {
  id: unknown;
  image_url: unknown;
  caption: unknown;
  created_at: unknown;
  booking_id: unknown;
  user_id: unknown;
};

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function mapRow(row: VisitPhotoRow): RestaurantVisitPhoto | null {
  const id = stringValue(row.id);
  const imageUrl = stringValue(row.image_url);
  if (!id || !imageUrl) return null;
  return {
    id,
    imageUrl,
    caption: stringOrNull(row.caption),
    createdAt: stringValue(row.created_at),
    bookingId: stringValue(row.booking_id),
    userId: stringValue(row.user_id),
  };
}

export async function fetchRestaurantVisitPhotos(
  restaurantId: string,
  limit?: number,
): Promise<RestaurantVisitPhoto[]> {
  if (!restaurantId) return [];
  const supabase = getSupabase();
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('visit_photos')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('created_at', { ascending: false })
      .limit(limit ?? 24);
    if (error || !Array.isArray(data)) return [];
    const mapped: RestaurantVisitPhoto[] = [];
    for (const row of data as VisitPhotoRow[]) {
      const photo = mapRow(row);
      if (photo) mapped.push(photo);
    }
    return mapped;
  } catch {
    return [];
  }
}
