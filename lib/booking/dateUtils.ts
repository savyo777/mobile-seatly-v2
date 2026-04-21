import type { DateKey } from '@/lib/booking/availabilityTypes';

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function toLocalDateKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDateKeyLocal(key: DateKey): Date {
  const [y, m, day] = key.split('-').map(Number);
  return new Date(y, m - 1, day);
}

/** Accepts `YYYY-MM-DD` or legacy ISO strings from older booking URLs. */
export function parseBookingDateParam(param: string | undefined): DateKey | null {
  if (!param) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(param)) return param;
  if (/^\d{4}-\d{2}-\d{2}T/.test(param)) return param.slice(0, 10);
  const d = new Date(param);
  if (Number.isNaN(d.getTime())) return null;
  return toLocalDateKey(d);
}
