import type { CalendarCell, DateKey, TimeSlotOption } from '@/lib/booking/availabilityTypes';
import {
  coerceBookableDateKey,
  getMockCalendarMonth,
  getMockShiftConfig,
  getMockTimeSlots,
  isMockDateBookable,
  nextMockBookableDateKey,
} from '@/lib/mock/bookingAvailability';
import { parseDateKeyLocal } from '@/lib/booking/dateUtils';

export function getShiftConfig(restaurantId: string) {
  return getMockShiftConfig(restaurantId);
}

export function getCalendarMonth(
  restaurantId: string,
  year: number,
  monthIndex: number,
): CalendarCell[] {
  return getMockCalendarMonth(restaurantId, year, monthIndex);
}

export function getTimeSlotsForDate(
  restaurantId: string,
  dateKey: DateKey,
  partySize: number,
): TimeSlotOption[] {
  return getMockTimeSlots(restaurantId, dateKey, partySize);
}

export function isDateBookable(restaurantId: string, dateKey: DateKey) {
  return isMockDateBookable(restaurantId, dateKey);
}

export function firstBookableDateKey(restaurantId: string) {
  return nextMockBookableDateKey(restaurantId);
}

export { coerceBookableDateKey };

export function nextBookableDateAfter(restaurantId: string, afterDateKey: DateKey): DateKey {
  const from = parseDateKeyLocal(afterDateKey);
  from.setDate(from.getDate() + 1);
  return nextMockBookableDateKey(restaurantId, from);
}
