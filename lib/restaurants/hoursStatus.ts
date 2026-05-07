import type {
  RestaurantHoursJson,
  RestaurantWeekdayKey,
} from '@/lib/mock/restaurants';

export type HoursRange = { open: string; close: string };

const WEEKDAY_KEYS: RestaurantWeekdayKey[] = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const WEEKDAY_INDEX: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

type ParsedClockTime = {
  hour: number;
  minute: number;
  minutes: number;
  hasMeridiem: boolean;
};

function parseClockTime(value: string | null | undefined): ParsedClockTime | null {
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

export function formatClockMinutes(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hour24 = Math.floor(minutesInDay / 60);
  const minute = minutesInDay % 60;
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

export function formatHoursRange(hours: HoursRange | null | undefined): string {
  const range = normalizeHoursRange(hours);
  if (!range) return 'Closed';
  return `${formatClockMinutes(range.open)} - ${formatClockMinutes(range.close)}`;
}

function zonedWeekdayAndMinute(now: Date, timeZone: string): { dayIndex: number; minute: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);

  const weekday = parts.find((part) => part.type === 'weekday')?.value.toLowerCase() ?? 'sunday';
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

  return {
    dayIndex: WEEKDAY_INDEX[weekday] ?? 0,
    minute: hour * 60 + minute,
  };
}

export function currentRestaurantWeekdayKey(
  now: Date = new Date(),
  timeZone = 'America/Toronto',
): RestaurantWeekdayKey {
  return WEEKDAY_KEYS[zonedWeekdayAndMinute(now, timeZone).dayIndex];
}

export function isRestaurantOpenForHours(
  hoursJson: RestaurantHoursJson | null | undefined,
  now: Date = new Date(),
  timeZone = 'America/Toronto',
): boolean {
  if (!hoursJson) return false;
  const { dayIndex, minute } = zonedWeekdayAndMinute(now, timeZone);
  const todayRange = normalizeHoursRange(hoursJson[WEEKDAY_KEYS[dayIndex]]);

  if (todayRange && minute >= todayRange.open && minute < todayRange.close) {
    return true;
  }

  const previousDayIndex = (dayIndex + 6) % 7;
  const previousRange = normalizeHoursRange(hoursJson[WEEKDAY_KEYS[previousDayIndex]]);
  if (!previousRange || previousRange.close <= 1440) return false;
  return minute + 1440 < previousRange.close;
}
