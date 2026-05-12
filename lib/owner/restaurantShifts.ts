import { getSupabase } from '@/lib/supabase/client';

export interface RestaurantShift {
  id: string;
  name: string | null;
  displayName: string | null;
  startTime: string | null; // "HH:MM:SS"
  endTime: string | null;
  daysOfWeek: number[]; // 0=Sun … 6=Sat
  turnTimeMinutes: number | null;
  isActive: boolean;
}

/**
 * Reads the `shifts` rows that drive the restaurant's hours. The web app
 * uses this table as the source of truth (one row per service), so the
 * mobile Edit profile screen shows the same content.
 */
export async function fetchRestaurantShifts(restaurantId: string): Promise<RestaurantShift[]> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return [];

  const { data, error } = await supabase
    .from('shifts')
    .select(
      'id,name,display_name,start_time,end_time,days_of_week,turn_time_minutes,is_active',
    )
    .eq('restaurant_id', restaurantId)
    .order('start_time', { ascending: true, nullsFirst: false });
  if (error) return [];

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id ?? ''),
    name: (row.name as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    startTime: (row.start_time as string | null) ?? null,
    endTime: (row.end_time as string | null) ?? null,
    daysOfWeek: Array.isArray(row.days_of_week)
      ? (row.days_of_week as unknown[]).map((d) => Number(d)).filter((n) => Number.isFinite(n))
      : [],
    turnTimeMinutes:
      typeof row.turn_time_minutes === 'number' ? row.turn_time_minutes : null,
    isActive: row.is_active !== false,
  }));
}

/** "5:00 PM – 11:00 PM" */
export function formatShiftWindow(startTime: string | null, endTime: string | null): string {
  const start = formatTime(startTime);
  const end = formatTime(endTime);
  if (!start && !end) return '';
  return `${start || '—'} – ${end || '—'}`;
}

function formatTime(value: string | null): string {
  if (!value) return '';
  const [hStr = '', mStr = ''] = value.split(':');
  const h = Number(hStr);
  const m = Number(mStr);
  if (!Number.isFinite(h)) return '';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour12 = ((h + 11) % 12) + 1;
  const mm = Number.isFinite(m) && m > 0 ? `:${String(m).padStart(2, '0')}` : '';
  return `${hour12}${mm} ${period}`;
}

const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const DAY_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** "Daily" if 7 days, otherwise "Mon · Wed · Fri" style. */
export function formatDaysOfWeek(days: number[]): string {
  if (!days || days.length === 0) return '';
  const unique = Array.from(new Set(days)).sort((a, b) => a - b);
  if (unique.length === 7) return 'Daily';
  // Mon..Fri = [1,2,3,4,5]
  if (unique.length === 5 && unique.every((d, i) => d === i + 1)) return 'Mon–Fri';
  if (unique.length === 2 && unique[0] === 0 && unique[1] === 6) return 'Weekends';
  return unique.map((d) => DAY_SHORT[d] ?? '').filter(Boolean).join(' · ');
}

export interface DailyHoursRow {
  dayIndex: number; // 0=Sun … 6=Sat
  dayLabel: string;
  windows: string[]; // ["5:00 PM – 11:00 PM"] — empty when closed
  isClosed: boolean;
}

/**
 * Transposes the shifts table into a Mon..Sun row list. Each row shows
 * every active shift that includes that day, in start-time order. Days
 * with no covering shift are flagged closed.
 */
export function buildWeeklyHours(shifts: RestaurantShift[]): DailyHoursRow[] {
  // UI order: Mon, Tue, Wed, Thu, Fri, Sat, Sun.
  const order = [1, 2, 3, 4, 5, 6, 0];

  return order.map((dayIndex) => {
    const matching = shifts
      .filter((s) => s.isActive && s.daysOfWeek.includes(dayIndex))
      .sort((a, b) => (a.startTime ?? '').localeCompare(b.startTime ?? ''));
    const windows: string[] = [];
    const seen = new Set<string>();
    for (const s of matching) {
      const w = formatShiftWindow(s.startTime, s.endTime);
      if (!w) continue;
      if (seen.has(w)) continue; // de-dupe duplicate shift rows on the same day
      seen.add(w);
      windows.push(w);
    }
    return {
      dayIndex,
      dayLabel: DAY_LONG[dayIndex] ?? '',
      windows,
      isClosed: windows.length === 0,
    };
  });
}
