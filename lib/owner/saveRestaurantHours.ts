import { getSupabase } from '@/lib/supabase/client';

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
 * shift per open day. Existing active shifts (multi-day or not) are
 * marked inactive — we don't delete to keep historical reservations'
 * shift_id references valid. Inactive shifts are left alone.
 *
 * This is the safest write path because:
 *   1. New shifts have a clean shape the booking flow understands
 *      (one day per shift, fresh start/end).
 *   2. The deactivated shifts remain in the table so the booking RLS
 *      and historical analytics keep working.
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

  if (rowsToInsert.length === 0) return;

  const { error: insertError } = await supabase.from('shifts').insert(rowsToInsert);
  if (insertError) throw insertError;
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
