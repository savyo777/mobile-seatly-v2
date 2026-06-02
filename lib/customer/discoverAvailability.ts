import { getSupabase } from '@/lib/supabase/client';

// Minimal Discover-side availability lookup. Mobile's Discover has no
// date/time/party pickers (unlike web), so the "Available tonight" chip just
// needs a boolean per restaurant: does it have any future slot today? We hit the
// same batch RPC web uses (get_available_slots_for_restaurants_compact) — one
// round trip for all visible cards — and reduce it to a Set of available ids.
//
// Best-effort: any failure (RPC error, bad shape, RLS) → empty Set, so the chip
// degrades to "shows nothing" rather than erroring. That's no worse than the old
// behavior, which keyed off a mapRestaurantRow default that matched ~nothing.

type CompactSlot = { date_time?: string };
type CompactPayload = { slots?: CompactSlot[] };

const DISCOVER_PARTY_SIZE = 2;

/** Local YYYY-MM-DD for "today" (device local date — Cenaiva is CAD/Toronto-centric). */
export function todayDateKeyLocal(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Local HH:mm (24h) for "from now". */
export function nowTimeLabel24h(now: Date = new Date()): string {
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

/**
 * Returns the set of restaurant ids that have at least one slot today at/after
 * `targetTime` for a party of `DISCOVER_PARTY_SIZE`. Drives the "Available
 * tonight" filter.
 */
export async function fetchAvailableRestaurantIds(
  restaurantIds: string[],
  date: string,
  targetTime: string,
): Promise<Set<string>> {
  const supabase = getSupabase();
  const available = new Set<string>();
  if (!supabase || restaurantIds.length === 0) return available;
  try {
    const { data, error } = await supabase.rpc('get_available_slots_for_restaurants_compact', {
      p_restaurant_ids: restaurantIds,
      p_date: date,
      p_party_size: DISCOVER_PARTY_SIZE,
      p_target_time: targetTime,
    });
    if (error || !data || typeof data !== 'object') return available;
    const map = data as Record<string, CompactPayload>;
    const now = Date.now();
    for (const id of restaurantIds) {
      const slots = map[id]?.slots;
      if (
        Array.isArray(slots) &&
        slots.some((s) => typeof s.date_time === 'string' && new Date(s.date_time).getTime() >= now)
      ) {
        available.add(id);
      }
    }
    return available;
  } catch {
    return available;
  }
}
