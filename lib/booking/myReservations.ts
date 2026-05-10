import { getSupabase } from '@/lib/supabase/client';
import type { Reservation } from '@/lib/mock/reservations';
import type { DepositStatus } from '@/lib/booking/publicBookingApi';
import i18n from '@/lib/i18n';

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
  depositAmountCents: number | null;
  depositStatus: DepositStatus | null;
  cancellationReason: string | null;
  preorderOrderId: string | null;
};

type ReservationRow = {
  id: string;
  reserved_at: string;
  party_size: number | null;
  status: string | null;
  confirmation_code: string | null;
  occasion: string | null;
  deposit_amount_cents: number | null;
  deposit_status: string | null;
  cancellation_reason: string | null;
  preorder_order_id: string | null;
  restaurant:
    | {
        id: string;
        name: string | null;
        slug: string | null;
        cover_photo_url: string | null;
        cover_image_url: string | null;
      }
    | Array<{
        id: string;
        name: string | null;
        slug: string | null;
        cover_photo_url: string | null;
        cover_image_url: string | null;
      }>
    | null;
};

function normalizeDepositStatus(status: string | null): DepositStatus | null {
  if (
    status === 'none' ||
    status === 'pending' ||
    status === 'charged' ||
    status === 'waived' ||
    status === 'failed'
  ) {
    return status;
  }
  return null;
}

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

  const { data, error } = await supabase
    .from('reservations')
    .select('id,reserved_at,party_size,status,confirmation_code,occasion,deposit_amount_cents,deposit_status,cancellation_reason,preorder_order_id,restaurant:restaurants(id,name,slug,cover_photo_url,cover_image_url)')
    .eq('user_profile_id', profile.id)
    .neq('status', 'no_show')
    .order('reserved_at', { ascending: false });
  if (error) throw error;

  return ((data ?? []) as ReservationRow[]).flatMap((row) => {
    const restaurant = Array.isArray(row.restaurant) ? row.restaurant[0] ?? null : row.restaurant;
    if (!restaurant || !row.reserved_at) return [];
    return [{
      id: row.id,
      restaurantName: restaurant.name ?? i18n.t('common.fallbackRestaurant'),
      restaurantId: restaurant.id,
      coverPhotoUrl: restaurant.cover_photo_url || restaurant.cover_image_url || '',
      whenIso: row.reserved_at,
      status: normalizeStatus(row.status),
      partySize: row.party_size ?? 1,
      occasion: row.occasion ?? undefined,
      confirmationCode: row.confirmation_code ?? '',
      depositAmountCents: row.deposit_amount_cents ?? null,
      depositStatus: normalizeDepositStatus(row.deposit_status),
      cancellationReason: row.cancellation_reason ?? null,
      preorderOrderId: row.preorder_order_id ?? null,
    }];
  });
}
