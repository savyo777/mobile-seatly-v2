import { getSupabase } from '@/lib/supabase/client';

/**
 * Persistent business-hours schedule for a restaurant. Lives at
 * `restaurants.settings_json.business_hours` so the web app can eventually
 * read the same shape.
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

async function readSettingsJson(
  restaurantId: string,
): Promise<Record<string, unknown>> {
  const supabase = getSupabase();
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error) throw error;
  const raw = (data as { settings_json?: unknown } | null)?.settings_json;
  return isObject(raw) ? raw : {};
}

/**
 * Read the persisted schedule for `restaurantId`. Returns `null` when no
 * schedule has been saved yet (caller may fall back to
 * `DEFAULT_BUSINESS_HOURS`). Throws when Supabase returns an error.
 */
export async function readBusinessHours(
  restaurantId: string,
): Promise<BusinessHoursSchedule | null> {
  if (!restaurantId) return null;
  const settings = await readSettingsJson(restaurantId);
  return coerceSchedule(settings.business_hours);
}

/**
 * Persist the schedule by merging into `settings_json.business_hours`.
 * Reads the row, replaces the `business_hours` key, writes the merged blob
 * back. Other keys under `settings_json` are preserved.
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
  const existing = await readSettingsJson(restaurantId);
  const merged = { ...existing, business_hours: schedule };
  const { error } = await supabase
    .from('restaurants')
    .update({ settings_json: merged })
    .eq('id', restaurantId);
  if (error) throw error;
}
