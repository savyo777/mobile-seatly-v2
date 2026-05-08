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
    .select('*');

  if (error) throw error;
  const rows = (data ?? []) as RestaurantRow[];
  return rows
    .filter((row) => row.is_active !== false)
    .map(mapRestaurantRowToRestaurant)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchRestaurantByIdFromSupabase(
  idOrSlug: string,
): Promise<Restaurant | null> {
  const supabase = getSupabase();
  const key = idOrSlug.trim();
  if (!supabase || !key) return null;

  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', key)
    .maybeSingle();

  if (error) throw error;
  if (data) return mapRestaurantRowToRestaurant(data as RestaurantRow);

  const { data: slugData, error: slugError } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', key)
    .maybeSingle();
  if (slugError) return null;
  return slugData ? mapRestaurantRowToRestaurant(slugData as RestaurantRow) : null;
}
