import { getSupabase } from '@/lib/supabase/client';
import type {
  RestaurantHoursJson,
  RestaurantHoursRange,
  RestaurantWeekdayKey,
} from '@/lib/mock/restaurants';

/**
 * Persistent business-hours schedule for a restaurant. Canonical storage is
 * the top-level `restaurants.hours_json` column — the same one the web app
 * writes to and the customer side reads from. We adapt to/from the
 * mobile-picker-friendly shape below (3-letter day keys, 12h "h:mm AM/PM"
 * times, explicit open boolean) so the existing UI doesn't change.
 *
 * Each day stores:
 *  - `open`: whether the restaurant is open that day
 *  - `start` / `end`: time-of-day strings in the form the mobile picker
 *     emits, i.e. `"11:30 AM"` / `"10:00 PM"` (12h with AM/PM). This is
 *     deliberately not normalized to HH:MM 24h so the picker round-trips
 *     unchanged.
 */
export type BusinessHoursDay = {
  open: boolean;
  start: string;
  end: string;
};

export type BusinessHoursDayKey = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type BusinessHoursSchedule = Record<BusinessHoursDayKey, BusinessHoursDay>;

/** Ordered list of day keys — useful for rendering the schedule. */
export const BUSINESS_HOURS_DAY_KEYS: readonly BusinessHoursDayKey[] = [
  'mon',
  'tue',
  'wed',
  'thu',
  'fri',
  'sat',
  'sun',
];

/**
 * Sensible defaults for a new restaurant. Mirrors what the mobile screen
 * has shipped with historically — lunch + dinner Mon–Sun with Sunday closed.
 */
export const DEFAULT_BUSINESS_HOURS: BusinessHoursSchedule = {
  mon: { open: true, start: '11:30 AM', end: '10:00 PM' },
  tue: { open: true, start: '11:30 AM', end: '10:00 PM' },
  wed: { open: true, start: '11:30 AM', end: '10:00 PM' },
  thu: { open: true, start: '11:30 AM', end: '10:00 PM' },
  fri: { open: true, start: '11:30 AM', end: '11:30 PM' },
  sat: { open: true, start: '11:00 AM', end: '11:30 PM' },
  sun: { open: false, start: '11:00 AM', end: '9:00 PM' },
};

// Bidirectional 3-letter ↔ full-name day-key map. The canonical hours_json
// uses full names ("monday".."sunday"); the mobile picker uses the short
// keys above.
const SHORT_TO_LONG: Record<BusinessHoursDayKey, RestaurantWeekdayKey> = {
  mon: 'monday',
  tue: 'tuesday',
  wed: 'wednesday',
  thu: 'thursday',
  fri: 'friday',
  sat: 'saturday',
  sun: 'sunday',
};

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function coerceDay(value: unknown, fallback: BusinessHoursDay): BusinessHoursDay {
  if (!isObject(value)) return fallback;
  const open = typeof value.open === 'boolean' ? value.open : fallback.open;
  const start = typeof value.start === 'string' && value.start.trim() ? value.start : fallback.start;
  const end = typeof value.end === 'string' && value.end.trim() ? value.end : fallback.end;
  return { open, start, end };
}

function coerceSchedule(value: unknown): BusinessHoursSchedule | null {
  if (!isObject(value)) return null;
  // Require at least one recognizable day before we treat the blob as real
  // data — otherwise fall through to defaults at the caller.
  const hasAnyKey = BUSINESS_HOURS_DAY_KEYS.some((key) => key in value);
  if (!hasAnyKey) return null;
  const out = {} as BusinessHoursSchedule;
  for (const key of BUSINESS_HOURS_DAY_KEYS) {
    out[key] = coerceDay(value[key], DEFAULT_BUSINESS_HOURS[key]);
  }
  return out;
}

// "11:00" → "11:00 AM" / "23:00" → "11:00 PM"
function time24To12(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return value;
  const hours24 = Number(m[1]);
  const minutes = m[2];
  if (!Number.isFinite(hours24) || hours24 < 0 || hours24 > 23) return value;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}

// "11:30 AM" → "11:30" / "10:00 PM" → "22:00"
function time12To24(value: string): string {
  const m = value.match(/^(\d{1,2}):(\d{2})\s*([AaPp])\.?[Mm]?\.?$/);
  if (!m) return value;
  let hours = Number(m[1]);
  const minutes = m[2];
  const period = m[3].toUpperCase();
  if (!Number.isFinite(hours) || hours < 1 || hours > 12) return value;
  if (period === 'A') hours = hours === 12 ? 0 : hours;
  else hours = hours === 12 ? 12 : hours + 12;
  return `${hours.toString().padStart(2, '0')}:${minutes}`;
}

// Convert the canonical hours_json blob into the owner-picker shape. A null
// range (or missing day) is treated as "closed".
function hoursJsonToSchedule(json: RestaurantHoursJson | null): BusinessHoursSchedule | null {
  if (!json) return null;
  let touched = false;
  const out = {} as BusinessHoursSchedule;
  for (const short of BUSINESS_HOURS_DAY_KEYS) {
    const long = SHORT_TO_LONG[short];
    const range = json[long];
    const fallback = DEFAULT_BUSINESS_HOURS[short];
    if (range === undefined) {
      out[short] = fallback;
      continue;
    }
    touched = true;
    if (range === null) {
      out[short] = { open: false, start: fallback.start, end: fallback.end };
      continue;
    }
    out[short] = {
      open: true,
      start: time24To12(range.open),
      end: time24To12(range.close),
    };
  }
  return touched ? out : null;
}

// Convert the owner-picker shape into the canonical hours_json blob. Closed
// days become explicit nulls so a reader can distinguish "closed" from
// "unset".
function scheduleToHoursJson(schedule: BusinessHoursSchedule): RestaurantHoursJson {
  const out: RestaurantHoursJson = {};
  for (const short of BUSINESS_HOURS_DAY_KEYS) {
    const day = schedule[short];
    const long = SHORT_TO_LONG[short];
    if (!day.open) {
      out[long] = null;
      continue;
    }
    const range: RestaurantHoursRange = {
      open: time12To24(day.start),
      close: time12To24(day.end),
    };
    out[long] = range;
  }
  return out;
}

async function readRestaurantHoursColumns(
  restaurantId: string,
): Promise<{ hoursJson: Record<string, unknown> | null; settingsJson: Record<string, unknown> }> {
  const supabase = getSupabase();
  if (!supabase) return { hoursJson: null, settingsJson: {} };
  const { data, error } = await supabase
    .from('restaurants')
    .select('hours_json, settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  const row = data as { hours_json?: unknown; settings_json?: unknown } | null;
  const hoursJson = isObject(row?.hours_json) ? row!.hours_json : null;
  const settingsJson = isObject(row?.settings_json) ? row!.settings_json : {};
  return { hoursJson, settingsJson };
}

/**
 * Read the persisted schedule for `restaurantId`. Returns `null` when no
 * schedule has been saved yet (caller may fall back to
 * `DEFAULT_BUSINESS_HOURS`). Throws when Supabase returns an error.
 *
 * Source-of-truth order:
 *   1. `restaurants.hours_json` — the canonical column. This is what the
 *      web app writes when an owner edits hours there and what the
 *      customer side reads when rendering "11 AM – 11 PM" on the diner
 *      restaurant page.
 *   2. `restaurants.settings_json.business_hours` — the older mobile-only
 *      nested location, kept as a fallback for rows that were never
 *      migrated. Will go away once those rows are touched again.
 */
export async function readBusinessHours(
  restaurantId: string,
): Promise<BusinessHoursSchedule | null> {
  if (!restaurantId) return null;
  const { hoursJson, settingsJson } = await readRestaurantHoursColumns(restaurantId);
  const canonical = hoursJsonToSchedule(hoursJson as RestaurantHoursJson | null);
  if (canonical) return canonical;
  return coerceSchedule(settingsJson.business_hours);
}

/**
 * Persist the schedule. Writes BOTH:
 *  - `restaurants.hours_json` — the canonical column the web + customer
 *    side use. This is the change that makes owner-mobile edits visible
 *    on the diner page immediately.
 *  - `restaurants.settings_json.business_hours` — mirrored during the
 *    transition so any older reader (e.g. an older mobile build still in
 *    the field) keeps working. We can drop this mirror in a follow-up
 *    cleanup commit once nothing reads it anymore.
 *
 * Other keys under `settings_json` are preserved.
 */
export async function writeBusinessHours(
  restaurantId: string,
  schedule: BusinessHoursSchedule,
): Promise<void> {
  if (!restaurantId) {
    throw new Error('writeBusinessHours requires a restaurantId');
  }
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }
  const { settingsJson } = await readRestaurantHoursColumns(restaurantId);
  const hoursJson = scheduleToHoursJson(schedule);
  const mergedSettings = { ...settingsJson, business_hours: schedule };
  const { error } = await supabase
    .from('restaurants')
    .update({ hours_json: hoursJson, settings_json: mergedSettings })
    .eq('id', restaurantId);
  if (error) throw error;
}
