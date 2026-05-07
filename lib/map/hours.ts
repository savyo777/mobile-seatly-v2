import type { Restaurant } from '@/lib/mock/restaurants';
import { isRestaurantOpenForHours } from '@/lib/restaurants/hoursStatus';

/** Whether the restaurant is open now based on restaurant hours in the venue timezone. */
export function isRestaurantOpenNow(restaurant: Restaurant, now: Date = new Date()): boolean {
  return isRestaurantOpenForHours(restaurant.hoursJson, now);
}
