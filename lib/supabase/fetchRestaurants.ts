import type { RestaurantRow } from '@cenaiva/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from './client';
import { mapRestaurantRowToRestaurant } from './mapRestaurantRow';
import type { Restaurant } from '@/lib/mock/restaurants';
import {
  deriveRestaurantPriceRangeFromMenuItems,
  type RestaurantMenuPriceItem,
} from '@/lib/restaurants/pricing';

export type MenuPriceRow = RestaurantMenuPriceItem & {
  restaurant_id: string | null;
  category_id?: string | null;
};

type MenuCategoryRow = {
  id: string;
  restaurant_id: string | null;
  name: string | null;
};

const MENU_PRICE_CHUNK_SIZE = 80;

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    out.push(items.slice(index, index + size));
  }
  return out;
}

async function fetchMenuCategoriesById(
  supabase: SupabaseClient,
  restaurantIds: string[],
): Promise<Map<string, string>> {
  const namesById = new Map<string, string>();
  for (const batch of chunks(restaurantIds, MENU_PRICE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('id,restaurant_id,name')
      .in('restaurant_id', batch)
      .eq('is_active', true);
    if (error) continue;
    ((data ?? []) as MenuCategoryRow[]).forEach((row) => {
      if (row.id && row.name) namesById.set(row.id, row.name);
    });
  }
  return namesById;
}

async function fetchMenuPriceRows(
  supabase: SupabaseClient,
  restaurantIds: string[],
): Promise<MenuPriceRow[]> {
  const categoriesById = await fetchMenuCategoriesById(supabase, restaurantIds);
  const rows: MenuPriceRow[] = [];

  for (const batch of chunks(restaurantIds, MENU_PRICE_CHUNK_SIZE)) {
    const { data, error } = await supabase
      .from('menu_items')
      .select('restaurant_id,price,category,category_id,is_active,is_available')
      .in('restaurant_id', batch)
      .eq('is_active', true)
      .eq('is_available', true)
      .not('category_id', 'is', null);
    if (error) continue;

    rows.push(
      ...((data ?? []) as MenuPriceRow[]).map((row) => ({
        ...row,
        category: row.category_id ? categoriesById.get(row.category_id) ?? null : null,
      })),
    );
  }

  return rows;
}

export function applyMenuDerivedPriceRangesToRestaurants(
  restaurants: Restaurant[],
  menuRows: MenuPriceRow[],
  explicitPriceRangesById?: Map<string, unknown>,
): Restaurant[] {
  if (!menuRows.length) return restaurants;

  const rowsByRestaurantId = new Map<string, MenuPriceRow[]>();
  menuRows.forEach((row) => {
    if (!row.restaurant_id) return;
    const next = rowsByRestaurantId.get(row.restaurant_id) ?? [];
    next.push(row);
    rowsByRestaurantId.set(row.restaurant_id, next);
  });

  return restaurants.map((restaurant) => {
    const items = rowsByRestaurantId.get(restaurant.id) ?? [];
    const explicitPriceRange = explicitPriceRangesById?.has(restaurant.id)
      ? explicitPriceRangesById.get(restaurant.id)
      : restaurant.priceRange;
    if (!items.length && explicitPriceRangesById?.has(restaurant.id)) {
      return {
        ...restaurant,
        priceRange: deriveRestaurantPriceRangeFromMenuItems([], explicitPriceRange, restaurant.priceRange),
      };
    }
    return {
      ...restaurant,
      priceRange: deriveRestaurantPriceRangeFromMenuItems(items, explicitPriceRange, restaurant.priceRange),
    };
  });
}

async function applyMenuDerivedPriceRanges(
  supabase: SupabaseClient,
  restaurants: Restaurant[],
  explicitPriceRangesById?: Map<string, unknown>,
): Promise<Restaurant[]> {
  const restaurantIds = restaurants.map((restaurant) => restaurant.id).filter(Boolean);
  if (!restaurantIds.length) return restaurants;

  const menuRows = await fetchMenuPriceRows(supabase, restaurantIds);
  return applyMenuDerivedPriceRangesToRestaurants(restaurants, menuRows, explicitPriceRangesById);
}

/** Loads active restaurants from Supabase (requires RLS allowing anon/customer read). */
export async function fetchRestaurantsFromSupabase(): Promise<Restaurant[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('restaurants')
    .select('*');

  if (error) throw error;
  const rows = (data ?? []) as RestaurantRow[];
  const activeRows = rows.filter((row) => row.is_active !== false);
  const restaurants = activeRows.map(mapRestaurantRowToRestaurant);
  const explicitPriceRangesById = new Map<string, unknown>(
    activeRows.map((row) => [row.id, row.price_range]),
  );
  try {
    const priced = await applyMenuDerivedPriceRanges(supabase, restaurants, explicitPriceRangesById);
    return priced.sort((a, b) => a.name.localeCompare(b.name));
  } catch {
    return restaurants.sort((a, b) => a.name.localeCompare(b.name));
  }
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

  let row: RestaurantRow | null = data ? (data as RestaurantRow) : null;
  if (!row) {
    const { data: slugData, error: slugError } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', key)
      .maybeSingle();
    if (slugError) return null;
    row = slugData ? (slugData as RestaurantRow) : null;
  }
  if (!row) return null;

  const restaurant = mapRestaurantRowToRestaurant(row);
  try {
    const [priced] = await applyMenuDerivedPriceRanges(
      supabase,
      [restaurant],
      new Map([[restaurant.id, row.price_range]]),
    );
    return priced ?? restaurant;
  } catch {
    return restaurant;
  }
}
