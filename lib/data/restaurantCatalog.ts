import { fetchRestaurantsFromSupabase } from '@/lib/supabase/fetchRestaurants';
import { isSupabaseConfigured } from '@/lib/supabase/env';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';

export type RestaurantCatalogSource = 'supabase' | 'mock' | 'mock_fallback';

/**
 * Single entry for Discover (and future screens): live Supabase when configured, else mocks.
 * Falls back to mocks on error or empty result so UI stays usable before RLS/policy fixes.
 */
export async function loadRestaurantsForDiscover(): Promise<{
  list: Restaurant[];
  source: RestaurantCatalogSource;
}> {
  if (!isSupabaseConfigured()) {
    return { list: mockRestaurants, source: 'mock' };
  }
  try {
    const list = await fetchRestaurantsFromSupabase();
    if (list.length === 0) {
      return { list: mockRestaurants, source: 'mock_fallback' };
    }
    return { list, source: 'supabase' };
  } catch {
    return { list: mockRestaurants, source: 'mock_fallback' };
  }
}
