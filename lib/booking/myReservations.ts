import { getSupabase } from '@/lib/supabase/client';
import type { Reservation } from '@/lib/mock/reservations';

export type MyBookingItem = {
  id: string;
  restaurantName: string;
  restaurantId: string;
  coverPhotoUrl: string;
  whenIso: string;
  status: Reservation['status'];
  partySize: number;
  occasion?: string;
  confirmationCode: string;
};

type ReservationRow = {
  id: string;
  reserved_at: string;
  party_size: number | null;
  status: string | null;
  confirmation_code: string | null;
  occasion: string | null;
  restaurant:
    | {
        id: string;
        name: string | null;
        slug: string | null;
        hero_image_url: string | null;
        cover_photo_url: string | null;
      }
    | Array<{
        id: string;
        name: string | null;
        slug: string | null;
        hero_image_url: string | null;
        cover_photo_url: string | null;
      }>
    | null;
};

function normalizeStatus(status: string | null): Reservation['status'] {
  if (
    status === 'pending' ||
    status === 'confirmed' ||
    status === 'seated' ||
    status === 'completed' ||
    status === 'cancelled' ||
    status === 'no_show'
  ) {
    return status;
  }
  return 'confirmed';
}

export async function fetchMyBookingItems(): Promise<MyBookingItem[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) return [];

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!profile?.id) return [];

  const { data: guests, error: guestError } = await supabase
    .from('guests')
    .select('id')
    .eq('user_profile_id', profile.id);
  if (guestError) throw guestError;
  const guestIds = (guests ?? []).map((guest) => String(guest.id));
  if (!guestIds.length) return [];

  const { data, error } = await supabase
    .from('reservations')
    .select('id,reserved_at,party_size,status,confirmation_code,occasion,restaurant:restaurants(id,name,slug,hero_image_url,cover_photo_url)')
    .in('guest_id', guestIds)
    .order('reserved_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as ReservationRow[]).flatMap((row) => {
    const restaurant = Array.isArray(row.restaurant) ? row.restaurant[0] ?? null : row.restaurant;
    if (!restaurant || !row.reserved_at) return [];
    return [{
      id: row.id,
      restaurantName: restaurant.name ?? 'Restaurant',
      restaurantId: restaurant.id,
      coverPhotoUrl: restaurant.hero_image_url || restaurant.cover_photo_url || '',
      whenIso: row.reserved_at,
      status: normalizeStatus(row.status),
      partySize: row.party_size ?? 1,
      occasion: row.occasion ?? undefined,
      confirmationCode: row.confirmation_code ?? '',
    }];
  });
}
