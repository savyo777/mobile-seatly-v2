import { getSupabase } from '@/lib/supabase/client';

export interface Reservation {
  id: string;
  restaurantId: string;
  restaurantName: string;
  guestId: string;
  tableId?: string;
  partySize: number;
  reservedAt: string;
  status: 'pending' | 'confirmed' | 'seated' | 'completed' | 'cancelled' | 'no_show';
  source: 'app' | 'web' | 'phone' | 'walkin';
  confirmationCode: string;
  specialRequest?: string;
  occasion?: string;
  guestName: string;
  preorderOrderId?: string;
  depositAmount?: number;
}

// Dates relative to now so upcoming reservations always appear in demos
function daysFromNow(days: number, hour = 19, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const mockReservations: Reservation[] = [
  {
    id: 'res-tonight',
    restaurantId: 'r1',
    restaurantName: 'Nova Ristorante',
    guestId: 'u1',
    partySize: 2,
    reservedAt: daysFromNow(0, 19, 30),
    status: 'confirmed',
    source: 'app',
    confirmationCode: 'SEAT-T0N1G8T',
    occasion: 'Date Night',
    guestName: 'Alex Johnson',
    specialRequest: 'Quiet corner table please',
    depositAmount: 25.00,
  },
  {
    id: 'res2',
    restaurantId: 'r2',
    restaurantName: 'Sakura Omakase',
    guestId: 'u1',
    partySize: 4,
    reservedAt: daysFromNow(4, 18, 30),
    status: 'confirmed',
    source: 'app',
    confirmationCode: 'SEAT-P2L8N4',
    occasion: 'Birthday',
    guestName: 'Alex Johnson',
    preorderOrderId: 'ord2',
  },
  {
    id: 'res1',
    restaurantId: 'r1',
    restaurantName: 'Nova Ristorante',
    guestId: 'u1',
    tableId: 't3',
    partySize: 2,
    reservedAt: daysFromNow(10, 19, 0),
    status: 'confirmed',
    source: 'app',
    confirmationCode: 'SEAT-7X3K9M',
    specialRequest: 'Window seat please',
    occasion: 'Date Night',
    guestName: 'Alex Johnson',
  },
  {
    id: 'res3',
    restaurantId: 'r3',
    restaurantName: 'Le Petit Bistro',
    guestId: 'u1',
    tableId: 't7',
    partySize: 2,
    reservedAt: '2026-03-15T20:00:00-04:00',
    status: 'completed',
    source: 'app',
    confirmationCode: 'SEAT-K9M2X5',
    guestName: 'Alex Johnson',
  },
  {
    id: 'res4',
    restaurantId: 'r1',
    restaurantName: 'Nova Ristorante',
    guestId: 'u1',
    tableId: 't1',
    partySize: 6,
    reservedAt: '2026-03-08T19:30:00-04:00',
    status: 'completed',
    source: 'web',
    confirmationCode: 'SEAT-R4T7W1',
    specialRequest: 'Celebrating a promotion',
    occasion: 'Celebration',
    guestName: 'Alex Johnson',
  },
  {
    id: 'res5',
    restaurantId: 'r4',
    restaurantName: 'The Smoky Grill',
    guestId: 'u1',
    partySize: 3,
    reservedAt: '2026-02-20T18:00:00-05:00',
    status: 'cancelled',
    source: 'app',
    confirmationCode: 'SEAT-V6H3J8',
    guestName: 'Alex Johnson',
  },
  // Staff-facing reservations for tonight
  {
    id: 'res6',
    restaurantId: 'r1',
    guestId: 'g2',
    restaurantName: 'Nova Ristorante',
    tableId: 't2',
    partySize: 2,
    reservedAt: '2026-03-25T18:00:00-04:00',
    status: 'confirmed',
    source: 'app',
    confirmationCode: 'SEAT-A1B2C3',
    guestName: 'Sarah Chen',
    specialRequest: 'Nut allergy - very severe',
  },
  {
    id: 'res7',
    restaurantId: 'r1',
    guestId: 'g3',
    restaurantName: 'Nova Ristorante',
    partySize: 4,
    reservedAt: '2026-03-25T19:00:00-04:00',
    status: 'confirmed',
    source: 'phone',
    confirmationCode: 'SEAT-D4E5F6',
    guestName: 'Michael Torres',
    occasion: 'Anniversary',
  },
  {
    id: 'res8',
    restaurantId: 'r1',
    guestId: 'g4',
    restaurantName: 'Nova Ristorante',
    tableId: 't5',
    partySize: 6,
    reservedAt: '2026-03-25T19:30:00-04:00',
    status: 'seated',
    source: 'web',
    confirmationCode: 'SEAT-G7H8I9',
    guestName: 'Emma Dubois',
  },
  {
    id: 'res9',
    restaurantId: 'r1',
    guestId: 'g5',
    restaurantName: 'Nova Ristorante',
    partySize: 2,
    reservedAt: '2026-03-25T20:00:00-04:00',
    status: 'confirmed',
    source: 'app',
    confirmationCode: 'SEAT-J1K2L3',
    guestName: 'David Kim',
  },
  {
    id: 'res10',
    restaurantId: 'r1',
    guestId: 'g6',
    restaurantName: 'Nova Ristorante',
    partySize: 8,
    reservedAt: '2026-03-25T20:30:00-04:00',
    status: 'confirmed',
    source: 'app',
    confirmationCode: 'SEAT-M4N5O6',
    guestName: 'Lisa Park',
    specialRequest: 'Birthday cake at dessert',
    occasion: 'Birthday',
  },
];

let mockReservationsVersion = 0;

export function getMockReservationsVersion(): number {
  return mockReservationsVersion;
}

export function addMockReservation(reservation: Reservation): void {
  const existingIndex = mockReservations.findIndex((item) => item.id === reservation.id);
  if (existingIndex >= 0) {
    mockReservations[existingIndex] = reservation;
    mockReservationsVersion += 1;
    return;
  }
  mockReservations.unshift(reservation);
  mockReservationsVersion += 1;
}

/**
 * Cancels a reservation for the in-app demo (mutates mock store), or updates
 * Supabase when the id is a UUID and the client is configured.
 */
export async function cancelReservationByIdAsync(id: string): Promise<{ ok: boolean; reason?: string }> {
  const idx = mockReservations.findIndex((r) => r.id === id);
  if (idx >= 0) {
    const r = mockReservations[idx];
    if (['completed', 'cancelled', 'no_show'].includes(r.status)) {
      return { ok: false, reason: 'This reservation cannot be cancelled.' };
    }
    mockReservations[idx] = { ...r, status: 'cancelled' };
    mockReservationsVersion += 1;
    return { ok: true };
  }

  const supabase = getSupabase();
  const uuidLike =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  if (supabase && uuidLike) {
    const { error } = await supabase.from('reservations').update({ status: 'cancelled' }).eq('id', id);
    if (error) return { ok: false, reason: error.message };
    return { ok: true };
  }

  return { ok: false, reason: 'Reservation not found.' };
}
