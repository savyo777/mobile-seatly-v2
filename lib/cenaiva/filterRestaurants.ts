import type { FiltersDelta } from '@cenaiva/assistant';
import type { Restaurant } from '@/lib/mock/restaurants';

function normalize(value: string | null | undefined): string {
  return (value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function includesNormalized(source: string, target: string): boolean {
  return Boolean(source && target && source.includes(target));
}

function restaurantSearchText(restaurant: Restaurant): string {
  return normalize([
    restaurant.name,
    restaurant.cuisineType,
    restaurant.city,
    restaurant.area,
    restaurant.description,
    ...(restaurant.tags ?? []),
  ].join(' '));
}

function matchesCuisine(restaurant: Restaurant, cuisines: string[] | undefined): boolean {
  const cleaned = (cuisines ?? []).map(normalize).filter(Boolean);
  if (!cleaned.length) return true;
  const cuisineText = normalize([
    restaurant.cuisineType,
    restaurant.name,
    ...(restaurant.tags ?? []),
  ].join(' '));
  return cleaned.some((cuisine) => includesNormalized(cuisineText, cuisine));
}

export function filterCenaivaRestaurants(
  restaurants: Restaurant[],
  markerRestaurantIds: string[],
  filters: FiltersDelta | null | undefined,
): Restaurant[] {
  const markerIds = Array.isArray(markerRestaurantIds) ? markerRestaurantIds : [];
  const restaurantsById = new Map(restaurants.map((restaurant) => [restaurant.id, restaurant]));
  let next = markerIds.length
    ? markerIds
        .map((restaurantId) => restaurantsById.get(restaurantId))
        .filter((restaurant): restaurant is Restaurant => Boolean(restaurant))
    : restaurants;

  next = next.filter((restaurant) => matchesCuisine(restaurant, filters?.cuisine));

  const city = normalize(filters?.city);
  if (city) {
    next = next.filter((restaurant) => includesNormalized(normalize(restaurant.city), city));
  }

  const query = normalize(filters?.query);
  if (query) {
    next = next.filter((restaurant) => includesNormalized(restaurantSearchText(restaurant), query));
  }

  return next;
}
