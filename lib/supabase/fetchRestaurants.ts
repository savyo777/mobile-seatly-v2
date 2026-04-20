import type { RestaurantRow } from '@cenaiva/types';
import { getSupabase } from './client';
import { mapRestaurantRowToRestaurant } from './mapRestaurantRow';
import type { Restaurant } from '@/lib/mock/restaurants';

/** Loads active restaurants from Supabase (requires RLS allowing anon/customer read). */
export async function fetchRestaurantsFromSupabase(): Promise<Restaurant[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) throw error;
  const rows = (data ?? []) as RestaurantRow[];
  return rows.map(mapRestaurantRowToRestaurant);
}
