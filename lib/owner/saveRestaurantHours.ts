import { getSupabase } from '@/lib/supabase/client';
import type {
  RestaurantHoursJson,
  RestaurantWeekdayKey,
} from '@/lib/mock/restaurants';
import { RESTAURANT_WEEKDAY_KEYS } from '@/lib/mock/restaurants';

export interface DailyHoursInput {
  /** 0=Sun … 6=Sat (matches shifts.days_of_week) */
  dayIndex: number;
  isOpen: boolean;
  /** "HH:MM:SS" — required when isOpen is true. */
  startTime: string | null;
  /** "HH:MM:SS" — required when isOpen is true. */
  endTime: string | null;
}

export interface SaveRestaurantHoursArgs {
  restaurantId: string;
  days: DailyHoursInput[];
  /** Turn time (minutes) to stamp on every new shift. Falls back to 90. */
  turnTimeMinutes?: number | null;
}

/**
 * Replaces the active shifts for a restaurant with one new single-day
 * shift per open day AND atomically writes the same week to
 * `restaurants.hours_json`. The two writes together keep three sources
 * in sync:
 *
 *   1. `shifts` — drives operational features (booking slot generation,
 *      staff scheduling, KDS thresholds). Active rows replaced; old
 *      rows deactivated (not deleted) to preserve historical
 *      reservations' shift_id references.
 *   2. `restaurants.hours_json` — single source of truth for "is this
 *      restaurant open / what are the hours" read by both the mobile
 *      customer Discover detail screen and the web restaurant page.
 *      Shape: { monday: {open:'HH:MM',close:'HH:MM'} | null, ... } in
 *      24-hour format matching the web parser at
 *      `apps/web/src/lib/restaurant-hours.ts` of the Seatly repo.
 *
 * If the shifts insert succeeds but the hours_json update fails, we
 * throw — better to surface a half-written state than to silently
 * leave the two sources diverged.
 */
export async function saveRestaurantHours(args: SaveRestaurantHoursArgs): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !args.restaurantId) return;

  const turnTime = Number.isFinite(args.turnTimeMinutes) && (args.turnTimeMinutes ?? 0) > 0
    ? Math.round(args.turnTimeMinutes as number)
    : 90;

  // Step 1: mark every active shift inactive.
  const { error: deactivateError } = await supabase
    .from('shifts')
    .update({ is_active: false })
    .eq('restaurant_id', args.restaurantId)
    .eq('is_active', true);
  if (deactivateError) throw deactivateError;

  // Step 2: insert a new single-day shift for each open day.
  const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const rowsToInsert = args.days
    .filter((d) => d.isOpen && d.startTime && d.endTime)
    .map((d) => ({
      restaurant_id: args.restaurantId,
      name: 'service',
      display_name: `${DAY_NAMES[d.dayIndex] ?? 'Service'} service`,
      days_of_week: [d.dayIndex],
      start_time: d.startTime,
      end_time: d.endTime,
      turn_time_minutes: turnTime,
      slot_duration_minutes: 15,
      is_active: true,
    }));

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await supabase.from('shifts').insert(rowsToInsert);
    if (insertError) throw insertError;
  }

  // Step 3: mirror to restaurants.hours_json so the customer Discover
  // detail page and the web restaurant page see the same hours. Always
  // write — even when all days are closed (results in an object with
  // every weekday key set to null), so that "closed all week" is an
  // explicit state instead of silently falling back to whatever was
  // there before.
  const hoursJson = daysInputToHoursJson(args.days);
  const { error: hoursError } = await supabase
    .from('restaurants')
    .update({ hours_json: hoursJson })
    .eq('id', args.restaurantId);
  if (hoursError) throw hoursError;
}

/**
 * Convert the editor's per-day shifts input into the canonical
 * `RestaurantHoursJson` shape the customer + web sides read.
 *
 * Input dayIndex: 0=Sun…6=Sat (shifts.days_of_week convention).
 * Input startTime/endTime: 'HH:MM:SS' (24h) — same as written to shifts.
 * Output keys: 'sunday','monday',…,'saturday' (RESTAURANT_WEEKDAY_KEYS).
 * Output time format: 'H:MM AM/PM' 12-hour — matches every existing
 * `hours_json` row in production and the web parser (`parseRestaurantHoursJson`
 * in apps/web/src/lib/restaurant-hours.ts), which is tolerant of both
 * 12h and 24h but reads 12h today.
 */
export function daysInputToHoursJson(days: DailyHoursInput[]): RestaurantHoursJson {
  const out: RestaurantHoursJson = {};
  for (const key of RESTAURANT_WEEKDAY_KEYS) {
    out[key] = null;
  }
  for (const day of days) {
    if (day.dayIndex < 0 || day.dayIndex > 6) continue;
    const key = RESTAURANT_WEEKDAY_KEYS[day.dayIndex] as RestaurantWeekdayKey;
    if (!day.isOpen || !day.startTime || !day.endTime) {
      out[key] = null;
      continue;
    }
    out[key] = {
      open: hhmmssTo12h(day.startTime),
      close: hhmmssTo12h(day.endTime),
    };
  }
  return out;
}

function hhmmssTo12h(value: string): string {
  // Tolerant — accepts 'HH:MM', 'HH:MM:SS' 24h, OR anything else.
  // Emits 'H:MM AM/PM'. Returns the input verbatim on parse failure so a
  // malformed string is visible to a reader instead of silently becoming
  // '12:00 AM'.
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  const h24 = Number(match[1]);
  const min = match[2];
  if (!Number.isFinite(h24) || h24 < 0 || h24 > 23) return value;
  const period = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${min} ${period}`;
}

/** Convert "5:00 PM" / "12:00 AM" to "HH:MM:SS" 24h. */
export function time12hToDbString(value: string | null | undefined): string | null {
  if (!value) return null;
  const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return null;
  let h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
