import { getSupabase } from '@/lib/supabase/client';
import {
  BOOKING_WINDOW_MAX_DAYS,
  DEFAULT_BOOKING_WINDOW_DAYS,
  MAX_ONLINE_PARTY_SIZE,
} from '@/lib/booking/bookingLimits';
import { DEFAULT_SLOT_DURATION_MINUTES } from '@/lib/booking/bookingDefaults';

/**
 * Reservation-settings state surfaced by the staff `Reservation settings`
 * screen. Persisted under `restaurants.settings_json.reservation_settings`.
 *
 * Keep this in sync with the four numeric controls on
 * `app/(staff)/reservation-settings.tsx`. The toggle switches on that screen
 * are intentionally NOT persisted here yet — when they get wired up, extend
 * this type and `DEFAULT_RESERVATION_SETTINGS` together.
 */
export type ReservationSettings = {
  /** Largest party that can book online. */
  maxOnlinePartySize: number;
  /** How far in advance guests can book, in days. */
  bookingWindowDays: number;
  /** Length of a single reservation slot, in minutes. */
  slotDurationMinutes: number;
  /**
   * Minimum lead time before a slot at which a guest can still book, in
   * MINUTES. The screen calls this "Minimum lead time"; the task brief
   * refers to it as "cancellation notice". Both surface the same value.
   */
  cancellationNoticeMinutes: number;
};

/**
 * Defaults derived from the centralized booking constants. The picker on the
 * screen defaults to 10 for max party (not MAX_ONLINE_PARTY_SIZE — that's the
 * ceiling for the stepper), so we mirror that here.
 */
export const DEFAULT_RESERVATION_SETTINGS: ReservationSettings = {
  maxOnlinePartySize: 10,
  bookingWindowDays: DEFAULT_BOOKING_WINDOW_DAYS,
  slotDurationMinutes: DEFAULT_SLOT_DURATION_MINUTES,
  cancellationNoticeMinutes: 60,
};

const SETTINGS_KEY = 'reservation_settings';

function pickNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function normalize(raw: unknown): ReservationSettings {
  const source =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const merged: ReservationSettings = {
    maxOnlinePartySize: Math.min(
      MAX_ONLINE_PARTY_SIZE,
      Math.max(1, pickNumber(source.maxOnlinePartySize, DEFAULT_RESERVATION_SETTINGS.maxOnlinePartySize)),
    ),
    bookingWindowDays: Math.min(
      BOOKING_WINDOW_MAX_DAYS,
      Math.max(1, pickNumber(source.bookingWindowDays, DEFAULT_RESERVATION_SETTINGS.bookingWindowDays)),
    ),
    slotDurationMinutes: Math.max(
      1,
      pickNumber(source.slotDurationMinutes, DEFAULT_RESERVATION_SETTINGS.slotDurationMinutes),
    ),
    cancellationNoticeMinutes: Math.max(
      0,
      pickNumber(source.cancellationNoticeMinutes, DEFAULT_RESERVATION_SETTINGS.cancellationNoticeMinutes),
    ),
  };
  return merged;
}

/**
 * Load reservation settings for a given restaurant. Returns
 * `DEFAULT_RESERVATION_SETTINGS` if the row is missing or has no
 * `settings_json.reservation_settings` key. Stored fields override defaults.
 */
export async function readReservationSettings(
  restaurantId: string,
): Promise<ReservationSettings> {
  if (!restaurantId) return DEFAULT_RESERVATION_SETTINGS;
  const supabase = getSupabase();
  if (!supabase) return DEFAULT_RESERVATION_SETTINGS;

  const { data, error } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error || !data) return DEFAULT_RESERVATION_SETTINGS;

  const settingsJson = (data as { settings_json?: unknown }).settings_json;
  if (!settingsJson || typeof settingsJson !== 'object' || Array.isArray(settingsJson)) {
    return DEFAULT_RESERVATION_SETTINGS;
  }
  const slice = (settingsJson as Record<string, unknown>)[SETTINGS_KEY];
  return normalize(slice);
}

/**
 * Persist reservation settings for a given restaurant. Merges the new value
 * into the existing `settings_json` so unrelated keys (website, cuisine,
 * etc.) are preserved.
 */
export async function writeReservationSettings(
  restaurantId: string,
  value: ReservationSettings,
): Promise<void> {
  if (!restaurantId) throw new Error('writeReservationSettings: restaurantId is required');
  const supabase = getSupabase();
  if (!supabase) throw new Error('writeReservationSettings: Supabase client is not configured');

  const { data: existing, error: readError } = await supabase
    .from('restaurants')
    .select('settings_json')
    .eq('id', restaurantId)
    .maybeSingle();
  if (readError) throw readError;

  const currentRaw = (existing as { settings_json?: unknown } | null)?.settings_json;
  const current =
    currentRaw && typeof currentRaw === 'object' && !Array.isArray(currentRaw)
      ? (currentRaw as Record<string, unknown>)
      : {};
  const nextSettings: Record<string, unknown> = {
    ...current,
    [SETTINGS_KEY]: normalize(value),
  };

  const { error: writeError } = await supabase
    .from('restaurants')
    .update({ settings_json: nextSettings })
    .eq('id', restaurantId);
  if (writeError) throw writeError;
}
