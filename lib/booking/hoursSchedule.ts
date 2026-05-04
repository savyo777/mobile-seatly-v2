/**
 * Booking-side parsing of restaurant hoursJson (same rules as discover detail).
 * Used so reservations cannot be placed on closed days or after tonight's closing time.
 */

export const BOOKING_WEEKDAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export type BookingWeekdayKey = typeof BOOKING_WEEKDAY_KEYS[number];
export type HoursRange = { open: string; close: string };
export type SpecialHoursRange = {
  date?: string;
  closed?: boolean;
  from?: string;
  to?: string;
  open?: string;
  close?: string;
};
export type BookingHoursJson = Partial<Record<BookingWeekdayKey, HoursRange | null>> & {
  special?: SpecialHoursRange[];
};

type ParsedClockTime = {
  hour: number;
  minute: number;
  minutes: number;
  hasMeridiem: boolean;
};

export function parseClockTime(value: string | null | undefined): ParsedClockTime | null {
  const cleaned = String(value ?? '').trim().toLowerCase().replace(/\./g, '');
  const match = cleaned.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?\s*(am|pm)?$/);
  if (!match) return null;

  const rawHour = Number(match[1]);
  const minute = match[2] == null ? 0 : Number(match[2]);
  const meridiem = match[3] as 'am' | 'pm' | undefined;
  if (!Number.isFinite(rawHour) || !Number.isFinite(minute) || minute < 0 || minute > 59) {
    return null;
  }
  if (!meridiem && (rawHour < 0 || rawHour > 23)) return null;
  if (meridiem && (rawHour < 1 || rawHour > 12)) return null;

  let hour = rawHour;
  if (meridiem === 'pm' && hour < 12) hour += 12;
  if (meridiem === 'am' && hour === 12) hour = 0;

  return {
    hour,
    minute,
    minutes: hour * 60 + minute,
    hasMeridiem: Boolean(meridiem),
  };
}

/** Minutes from midnight for open / close (close may exceed 1440 for overnight service). */
export function normalizeHoursRange(hours: HoursRange | null | undefined): { open: number; close: number } | null {
  if (!hours) return null;
  const open = parseClockTime(hours.open);
  const close = parseClockTime(hours.close);
  if (!open || !close) return null;

  let closeMinutes = close.minutes;
  if (!close.hasMeridiem && closeMinutes <= open.minutes) {
    closeMinutes += open.minutes < 12 * 60 && close.hour <= 12 ? 12 * 60 : 24 * 60;
    if (closeMinutes <= open.minutes) closeMinutes += 12 * 60;
  } else if (closeMinutes <= open.minutes) {
    closeMinutes += 24 * 60;
  }

  return { open: open.minutes, close: closeMinutes };
}

function readHoursRange(raw: unknown): HoursRange | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  if (entry.closed === true) return null;
  const open = typeof entry.open === 'string' ? entry.open : entry.from;
  const close = typeof entry.close === 'string' ? entry.close : entry.to;
  if (typeof open !== 'string' || typeof close !== 'string') return null;
  return { open, close };
}

function specialHoursForDate(
  hoursJson: BookingHoursJson | undefined,
  dateKey: string,
): SpecialHoursRange | null {
  const specials = Array.isArray(hoursJson?.special) ? hoursJson.special : [];
  return specials.find((entry) => entry?.date === dateKey) ?? null;
}

export function getBookingMinutesWindowForDate(
  hoursJson: BookingHoursJson | undefined,
  dateKey: string,
  jsWeekday: number,
): { open: number; close: number } | null {
  if (!hoursJson) return null;
  const special = specialHoursForDate(hoursJson, dateKey);
  if (special) return normalizeHoursRange(readHoursRange(special));
  return getBookingMinutesWindowForJsDay(hoursJson, jsWeekday);
}

export function isClosedBookingDate(
  hoursJson: BookingHoursJson | undefined,
  dateKey: string,
  jsWeekday: number,
): boolean {
  if (!hoursJson) return false;
  return !getBookingMinutesWindowForDate(hoursJson, dateKey, jsWeekday);
}

export function deriveClosedJsWeekdaysFromHoursJson(
  hoursJson: BookingHoursJson | undefined,
): number[] {
  if (!hoursJson) return [];
  const closed: number[] = [];
  for (let dow = 0; dow < 7; dow++) {
    const key = BOOKING_WEEKDAY_KEYS[dow];
    const raw = readHoursRange(hoursJson[key]);
    const win = normalizeHoursRange(raw);
    if (!win) closed.push(dow);
  }
  return closed;
}

export function getBookingMinutesWindowForJsDay(
  hoursJson: BookingHoursJson | undefined,
  jsWeekday: number,
): { open: number; close: number } | null {
  if (!hoursJson) return null;
  const key = BOOKING_WEEKDAY_KEYS[jsWeekday];
  return normalizeHoursRange(readHoursRange(hoursJson[key]));
}

export function minutesToHourMinute(totalMinutes: number): { hour: number; minute: number } {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  return {
    hour: Math.floor(minutesInDay / 60),
    minute: minutesInDay % 60,
  };
}

/** Last seated reservation minute on the calendar day (same calendar day as opening). */
export function sameDayClosingMinute(window: { open: number; close: number }): number {
  if (window.close <= 1440) return window.close;
  return 1439;
}

/**
 * True when `dateKey` is today (local) and the venue has stopped accepting same-day bookings
 * for today's session (current time ≥ closing on that calendar day).
 */
export function isFinishedServingLocalDay(
  hoursJson: BookingHoursJson | undefined,
  dateKey: string,
  now: Date = new Date(),
): boolean {
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (dateKey !== todayKey) return false;
  const win = getBookingMinutesWindowForDate(hoursJson, dateKey, now.getDay());
  if (!win) return true;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const closeCut = sameDayClosingMinute(win);
  return nowMin >= closeCut;
}
