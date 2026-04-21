/**
 * Booking availability contract — mock now; swap implementation in
 * lib/booking/getAvailability.ts when the edge function is ready.
 */

/** Local calendar day `YYYY-MM-DD`. */
export type DateKey = string;

export type BookingShiftMock = {
  slotDurationMinutes: 15 | 30;
  advanceBookingDays: number;
  /** ISO weekday 0 = Sun … 6 = Sat — no service these days */
  closedWeekdays: number[];
  /** Explicit no-booking dates (local keys) */
  blackoutDateKeys: DateKey[];
  /** First/last seating (24h labels, local interpretation) */
  serviceStart: { hour: number; minute: number };
  serviceEnd: { hour: number; minute: number };
};

export type CalendarCell = {
  dateKey: DateKey | null;
  inMonth: boolean;
  selectable: boolean;
  isToday: boolean;
};

export type TimeSlotOption = {
  /** Stable ISO timestamp for the slot start (local wall time as Z is tricky; use minutes-from-midnight payload) */
  slotId: string;
  label: string;
  available: boolean;
};
