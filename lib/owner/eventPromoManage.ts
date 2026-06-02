import { getSupabase } from '@/lib/supabase/client';

// Owner-side management for events + promotions: who's attending / who redeemed,
// plus pause (is_active toggle) and delete. Mirrors web's owner event/promo
// management. Reservations link to an event via reservations.event_id and to a
// promotion via reservations.promotion_id (the same FKs the reservation-detail
// embed reads).

export type EventGuest = {
  id: string;
  guestName: string;
  partySize: number;
  reservedAt: string;
  status: string;
};

// Statuses that count as a real attendee / redemption (exclude cancelled/no_show).
const COUNTED_STATUSES = ['pending', 'confirmed', 'seated', 'completed'];

function mapGuestRow(row: Record<string, unknown>): EventGuest {
  const guestObj = Array.isArray(row.guests) ? row.guests[0] : row.guests;
  const guestName =
    (guestObj && typeof guestObj === 'object' &&
      typeof (guestObj as Record<string, unknown>).full_name === 'string'
      ? ((guestObj as Record<string, unknown>).full_name as string)
      : null) ||
    (typeof row.guest_full_name === 'string' ? (row.guest_full_name as string) : null) ||
    'Guest';
  return {
    id: String(row.id ?? ''),
    guestName,
    partySize: typeof row.party_size === 'number' ? row.party_size : Number(row.party_size ?? 0) || 0,
    reservedAt: typeof row.reserved_at === 'string' ? (row.reserved_at as string) : '',
    status: typeof row.status === 'string' ? (row.status as string) : '',
  };
}

async function fetchLinkedReservations(column: 'event_id' | 'promotion_id', id: string): Promise<EventGuest[]> {
  const supabase = getSupabase();
  if (!supabase || !id) return [];
  const { data, error } = await supabase
    .from('reservations')
    .select('id,guest_full_name,party_size,reserved_at,status,guests:guests(full_name)')
    .eq(column, id)
    .in('status', COUNTED_STATUSES)
    .order('reserved_at', { ascending: true });
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map(mapGuestRow);
}

/** Reservations attached to an event. */
export function fetchEventAttendees(eventId: string): Promise<EventGuest[]> {
  return fetchLinkedReservations('event_id', eventId);
}

/** Reservations that redeemed a promotion. */
export function fetchPromotionRedemptions(promotionId: string): Promise<EventGuest[]> {
  return fetchLinkedReservations('promotion_id', promotionId);
}

async function setActive(table: 'events' | 'promotions', id: string, active: boolean): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).update({ is_active: active }).eq('id', id);
  if (error) throw new Error(error.message);
}

async function deleteRow(table: 'events' | 'promotions', id: string): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export const setEventActive = (id: string, active: boolean) => setActive('events', id, active);
export const setPromotionActive = (id: string, active: boolean) => setActive('promotions', id, active);
export const deleteEvent = (id: string) => deleteRow('events', id);
export const deletePromotion = (id: string) => deleteRow('promotions', id);
