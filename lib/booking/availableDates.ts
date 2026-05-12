/**
 * Client-side equivalent of the server RPC `restaurant_available_dates`.
 *
 * !!! IMPORTANT — DO NOT WIRE THIS INTO THE CUSTOMER BOOKING FLOW !!!
 *
 * This is a documented sibling of `restaurant_available_dates`. It iterates
 * the date range and asks `generateAvailabilitySlots` whether each date has
 * at least one available slot. It shares all the correctness caveats from
 * `slotGenerator.ts`:
 *
 *   - The mobile client is subject to RLS. Anonymous customer sessions can
 *     only see their own reservations (`reservations_select_own`), so
 *     overlap detection is broken for that role and dates will appear
 *     available that are actually fully booked.
 *
 *   - The slot generator's table-allocator is a best-effort port of the
 *     server's recursive CTE — until output parity is verified, do not swap.
 *
 * Staff sessions with `staff_has_restaurant_role(restaurant_id, [...])` can
 * see all reservations and therefore can use this helper safely for
 * staff-side previews.
 *
 * The return shape is `string[]` (YYYY-MM-DD), matching the RPC.
 */

import { generateAvailabilitySlots } from '@/lib/booking/slotGenerator';

const MAX_RANGE_DAYS = 62;

export type FindAvailableDatesArgs = {
  restaurantId: string;
  partySize: number;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
};

function addDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function daysBetween(startStr: string, endStr: string): number {
  const start = Date.UTC(
    Number(startStr.slice(0, 4)),
    Number(startStr.slice(5, 7)) - 1,
    Number(startStr.slice(8, 10)),
  );
  const end = Date.UTC(
    Number(endStr.slice(0, 4)),
    Number(endStr.slice(5, 7)) - 1,
    Number(endStr.slice(8, 10)),
  );
  return Math.round((end - start) / 86_400_000);
}

/**
 * Return YYYY-MM-DD strings (inclusive) within [startDate, endDate] that
 * have at least one available slot for the given party size.
 *
 * Note on batching: the underlying slot generator currently re-queries
 * `shifts`, `tables`, and `reservations` per date. A future optimization can
 * pull `shifts` and `tables` once for the whole range and pull reservations
 * filtered by the full UTC bounds, then partition by day. Left out of the
 * initial extraction so we do not bake in two slightly different code paths
 * with subtly different RLS visibility before the swap is even safe.
 */
export async function findAvailableDates(args: FindAvailableDatesArgs): Promise<string[]> {
  const partySize = Math.max(1, Math.floor(args.partySize));
  if (!args.startDate || !args.endDate) return [];
  if (args.endDate < args.startDate) return [];
  const range = daysBetween(args.startDate, args.endDate);
  if (range > MAX_RANGE_DAYS) {
    throw new Error('date range too large (max 62 days)');
  }

  const dates: string[] = [];
  for (let i = 0; i <= range; i += 1) {
    const day = addDays(args.startDate, i);
    const { slots } = await generateAvailabilitySlots({
      restaurantId: args.restaurantId,
      date: day,
      partySize,
    });
    if (slots.length > 0) dates.push(day);
  }
  return dates;
}
