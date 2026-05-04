import {
  fetchRestaurantByIdFromSupabase,
  fetchRestaurantsFromSupabase,
} from '@/lib/supabase/fetchRestaurants';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';

export type RestaurantCatalogSource = 'supabase' | 'mock' | 'mock_fallback';

const restaurantCache = new Map<string, Restaurant>();

function cacheKey(value: string | null | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function rememberRestaurants(restaurants: Restaurant[]) {
  restaurants.forEach((restaurant) => {
    const idKey = cacheKey(restaurant.id);
    const slugKey = cacheKey(restaurant.slug);
    if (idKey) restaurantCache.set(idKey, restaurant);
    if (slugKey) restaurantCache.set(slugKey, restaurant);
  });
}

export function getCachedRestaurantById(idOrSlug: string | null | undefined): Restaurant | null {
  const key = cacheKey(idOrSlug);
  if (!key) return null;
  return restaurantCache.get(key) ?? null;
}

rememberRestaurants(mockRestaurants);

/**
 * Single entry for Discover (and future screens): live Supabase when configured, else mocks.
 * Falls back to mocks on error or empty result so UI stays usable before RLS/policy fixes.
 */
export async function loadRestaurantsForDiscover(): Promise<{
  list: Restaurant[];
  source: RestaurantCatalogSource;
}> {
  if (!isSupabaseConfigured()) {
    rememberRestaurants(mockRestaurants);
    return { list: mockRestaurants, source: 'mock' };
  }
  try {
    const list = await fetchRestaurantsFromSupabase();
    if (list.length === 0) {
      rememberRestaurants(mockRestaurants);
      return { list: mockRestaurants, source: 'mock_fallback' };
    }
    rememberRestaurants(list);
    return { list, source: 'supabase' };
  } catch {
    rememberRestaurants(mockRestaurants);
    return { list: mockRestaurants, source: 'mock_fallback' };
  }
}

export async function loadRestaurantForBooking(
  idOrSlug: string | null | undefined,
): Promise<Restaurant | null> {
  const cached = getCachedRestaurantById(idOrSlug);
  const key = cacheKey(idOrSlug);
  if (!key) return null;
  if (!isSupabaseConfigured()) return cached;

  try {
    const live = await fetchRestaurantByIdFromSupabase(key);
    if (live) {
      rememberRestaurants([live]);
      return live;
    }
  } catch {
    // Keep the booking flow usable with whatever catalog data is already cached.
  }

  return cached;
}
