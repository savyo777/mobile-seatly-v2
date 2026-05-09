// Time-of-day helpers used by the home greeting. The original API was
// hardcoded to America/Toronto in the function names; the implementation
// always took a timezone string. Phase J split the contract into a
// timezone-agnostic core (`getZonedHour24`, `getZonedGreetingPeriod`) and a
// thin Toronto wrapper that the existing call sites still import.

const DEFAULT_HOME_GREETING_TIMEZONE = 'America/Toronto';

/** Hour 0–23 in the given IANA timezone (handles DST). */
export function getZonedHour24(timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value;
  return parseInt(hour ?? '0', 10);
}

export type GreetingPeriod = 'morning' | 'afternoon' | 'evening';

/** Morning: before 12:00. Afternoon: 12:00–16:59. Evening: 17:00+. */
export function getZonedGreetingPeriod(timeZone: string): GreetingPeriod {
  const h = getZonedHour24(timeZone);
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}

// ── Toronto wrappers (kept for back-compat with existing call sites) ────────

/** @deprecated Use `getZonedHour24('America/Toronto')` directly. */
export function getTorontoHour24(): number {
  return getZonedHour24(DEFAULT_HOME_GREETING_TIMEZONE);
}

/** @deprecated Use `getZonedGreetingPeriod('America/Toronto')` directly. */
export type TorontoGreetingPeriod = GreetingPeriod;

/** @deprecated Use `getZonedGreetingPeriod('America/Toronto')` directly. */
export function getTorontoGreetingPeriod(): GreetingPeriod {
  return getZonedGreetingPeriod(DEFAULT_HOME_GREETING_TIMEZONE);
}
