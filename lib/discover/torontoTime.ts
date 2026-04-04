/** Hour 0–23 in America/Toronto (handles EST/EDT). */
export function getTorontoHour24(): number {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Toronto',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(new Date());
  const hour = parts.find((p) => p.type === 'hour')?.value;
  return parseInt(hour ?? '0', 10);
}

/** Morning: before 12:00. Afternoon: 12:00–16:59. Evening: 17:00+. */
export type TorontoGreetingPeriod = 'morning' | 'afternoon' | 'evening';

export function getTorontoGreetingPeriod(): TorontoGreetingPeriod {
  const h = getTorontoHour24();
  if (h < 12) return 'morning';
  if (h < 17) return 'afternoon';
  return 'evening';
}
