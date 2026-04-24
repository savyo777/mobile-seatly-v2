import type {
  BookingShiftMock,
  CalendarCell,
  DateKey,
  TimeSlotOption,
} from '@/lib/booking/availabilityTypes';
import { parseDateKeyLocal, toLocalDateKey } from '@/lib/booking/dateUtils';

const DEFAULT_SHIFT: BookingShiftMock = {
  slotDurationMinutes: 15,
  advanceBookingDays: 45,
  closedWeekdays: [2], // Tuesday closed for demo
  blackoutDateKeys: [],
  serviceStart: { hour: 11, minute: 30 },
  serviceEnd: { hour: 22, minute: 0 },
};

/** Per-restaurant overrides for mock demos */
const MOCK_SHIFTS: Record<string, Partial<BookingShiftMock>> = {
  r1: { closedWeekdays: [0], slotDurationMinutes: 15 },
  r2: { closedWeekdays: [1], slotDurationMinutes: 30 },
  r3: { blackoutDateKeys: [] },
};

export function getMockShiftConfig(restaurantId: string): BookingShiftMock {
  const extra = MOCK_SHIFTS[restaurantId] ?? {};
  const merged: BookingShiftMock = {
    ...DEFAULT_SHIFT,
    ...extra,
    closedWeekdays: extra.closedWeekdays ?? DEFAULT_SHIFT.closedWeekdays,
    blackoutDateKeys: [
      ...DEFAULT_SHIFT.blackoutDateKeys,
      ...(extra.blackoutDateKeys ?? []),
    ],
  };
  return merged;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + n);
  return d;
}

function hash33(s: string) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return Math.abs(h);
}

/** Demo blackouts relative to "today" so the UI always shows some blocked days */
function effectiveBlackouts(config: BookingShiftMock, restaurantId: string): Set<DateKey> {
  const set = new Set(config.blackoutDateKeys);
  const h = hash33(restaurantId);
  set.add(toLocalDateKey(daysFromNow(5 + (h % 4))));
  set.add(toLocalDateKey(daysFromNow(12 + (h % 3))));
  return set;
}

export function getMockCalendarMonth(
  restaurantId: string,
  year: number,
  monthIndex: number,
): CalendarCell[] {
  const config = getMockShiftConfig(restaurantId);
  const blackouts = effectiveBlackouts(config, restaurantId);
  const today = startOfDay(new Date());
  const todayKey = toLocalDateKey(today);
  const maxDate = daysFromNow(config.advanceBookingDays);

  const first = new Date(year, monthIndex, 1);
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const startWeekday = first.getDay();

  const cells: CalendarCell[] = [];
  const prevMonthLast = new Date(year, monthIndex, 0).getDate();

  for (let i = 0; i < startWeekday; i++) {
    const day = prevMonthLast - startWeekday + i + 1;
    const d = new Date(year, monthIndex - 1, day);
    const dateKey = toLocalDateKey(d);
    cells.push({
      dateKey,
      inMonth: false,
      selectable: isDateSelectable(config, blackouts, d, maxDate),
      isToday: dateKey === todayKey,
    });
  }

  for (let day = 1; day <= lastDay; day++) {
    const d = new Date(year, monthIndex, day);
    const dateKey = toLocalDateKey(d);
    cells.push({
      dateKey,
      inMonth: true,
      selectable: isDateSelectable(config, blackouts, d, maxDate),
      isToday: dateKey === todayKey,
    });
  }

  let nextTrailing = 1;
  while (cells.length % 7 !== 0) {
    const d = new Date(year, monthIndex + 1, nextTrailing);
    const dateKey = toLocalDateKey(d);
    cells.push({
      dateKey,
      inMonth: false,
      selectable: isDateSelectable(config, blackouts, d, maxDate),
      isToday: dateKey === todayKey,
    });
    nextTrailing += 1;
  }

  return cells;
}

function isDateSelectable(
  config: BookingShiftMock,
  blackouts: Set<DateKey>,
  d: Date,
  maxDate: Date,
) {
  const dayStart = startOfDay(d);
  const today = startOfDay(new Date());
  if (dayStart < today) return false;
  if (dayStart > startOfDay(maxDate)) return false;
  if (config.closedWeekdays.includes(d.getDay())) return false;
  const key = toLocalDateKey(d);
  if (blackouts.has(key)) return false;
  return true;
}

/** Exposed for initial date selection in booking UI */
export function isMockDateBookable(restaurantId: string, dateKey: DateKey): boolean {
  const config = getMockShiftConfig(restaurantId);
  const blackouts = effectiveBlackouts(config, restaurantId);
  const base = parseDateKeyLocal(dateKey);
  const maxDate = daysFromNow(config.advanceBookingDays);
  return isDateSelectable(config, blackouts, base, maxDate);
}

export function nextMockBookableDateKey(restaurantId: string, from?: Date): DateKey {
  const start = from ?? new Date();
  start.setHours(0, 0, 0, 0);
  for (let i = 0; i < 120; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toLocalDateKey(d);
    if (isMockDateBookable(restaurantId, key)) return key;
  }
  return toLocalDateKey(start);
}

function formatSlotLabel(d: Date) {
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

export function getMockTimeSlots(
  restaurantId: string,
  dateKey: DateKey,
  partySize: number,
): TimeSlotOption[] {
  const config = getMockShiftConfig(restaurantId);
  const blackouts = effectiveBlackouts(config, restaurantId);
  const base = parseDateKeyLocal(dateKey);
  const maxDate = daysFromNow(config.advanceBookingDays);
  if (!isDateSelectable(config, blackouts, base, maxDate)) {
    return [];
  }

  const { serviceStart, serviceEnd, slotDurationMinutes: step } = config;
  const out: TimeSlotOption[] = [];

  let cursor = new Date(base);
  cursor.setHours(serviceStart.hour, serviceStart.minute, 0, 0);

  const end = new Date(base);
  end.setHours(serviceEnd.hour, serviceEnd.minute, 0, 0);

  let i = 0;
  while (cursor <= end) {
    const slotId = `${dateKey}T${pad(cursor.getHours())}:${pad(cursor.getMinutes())}`;
    const label = formatSlotLabel(cursor);
    const h = hash33(`${restaurantId}|${slotId}|${partySize}`);
    const capacityBlocked = partySize >= 7 ? h % 4 === 0 : h % 9 === 0;
    out.push({
      slotId,
      label,
      available: !capacityBlocked,
    });
    cursor = new Date(cursor.getTime() + step * 60 * 1000);
    i += 1;
    if (i > 200) break;
  }

  return out;
}
