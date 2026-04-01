import type { Restaurant } from '@/lib/mock/restaurants';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function parseTimeToDecimalHours(time: string): number {
  const [h, m] = time.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h)) return 0;
  return h + (Number.isNaN(m) ? 0 : m) / 60;
}

/** Whether the restaurant is open now based on mock hours (local device time). */
export function isRestaurantOpenNow(restaurant: Restaurant, now: Date = new Date()): boolean {
  const dayKey = DAYS[now.getDay()];
  const hours = restaurant.hoursJson[dayKey];
  if (!hours) return false;
  const open = parseTimeToDecimalHours(hours.open);
  const close = parseTimeToDecimalHours(hours.close);
  const current = now.getHours() + now.getMinutes() / 60;
  if (close <= open) {
    return current >= open || current < close;
  }
  return current >= open && current < close;
}
