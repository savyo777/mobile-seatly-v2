import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadRestaurantsForDiscover } from '@/lib/data/restaurantCatalog';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { friendlyError } from '@/lib/errors/friendlyError';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';
import {
  menuCategories as mockMenuCategories,
  mockMenuItems,
  type MenuItem as MockMenuItem,
} from '@/lib/mock/menuItems';

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number | null;
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  price: number;
  category: string | null;
  category_id: string | null;
  photo_url: string | null;
  is_available: boolean | null;
  is_preorderable: boolean | null;
  sort_order: number | null;
};

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : fallback;
  if (typeof value === 'string') {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

const menuCategoriesCache = new Map<string, MenuCategory[]>();
const menuItemsCache = new Map<string, MenuItem[]>();

function mockMenuItemToPublic(item: MockMenuItem): MenuItem {
  return {
    id: item.id,
    restaurant_id: item.restaurantId,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    category_id: null,
    photo_url: item.photoUrl?.trim() || null,
    is_available: item.isAvailable,
    is_preorderable: item.isPreorderable,
    sort_order: 0,
  };
}

function fallbackMenuItemsFor(restaurantId: string | null | undefined): MenuItem[] {
  if (!restaurantId) return [];
  return mockMenuItems
    .filter((item) => item.restaurantId === restaurantId)
    .map(mockMenuItemToPublic);
}

function fallbackMenuCategoriesFor(restaurantId: string | null | undefined): MenuCategory[] {
  const items = fallbackMenuItemsFor(restaurantId);
  if (!items.length) return [];
  const names = new Set(items.map((item) => item.category).filter((name): name is string => Boolean(name)));
  const ordered = [
    ...mockMenuCategories.filter((name) => names.has(name)),
    ...[...names].filter((name) => !mockMenuCategories.includes(name)),
  ];
  return ordered.map((name, index) => ({
    id: `mock-${restaurantId}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    sort_order: index,
  }));
}

export function useCenaivaRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => (isDemoModeEnabled() ? mockRestaurants : []));
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent && restaurants.length === 0) setLoading(true);
    setError(null);
    try {
      const { list } = await loadRestaurantsForDiscover();
      setRestaurants(list);
    } catch (err) {
      setError(friendlyError(err, "Couldn't load restaurants. Pull to retry."));
      setRestaurants(isDemoModeEnabled() ? mockRestaurants : []);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload({ silent: true });
  }, [reload]);

  return { restaurants, loading, hasLoaded, error, reload };
}

export function usePublicMenuCategories(restaurantId: string | null | undefined) {
  const [categories, setCategories] = useState<MenuCategory[]>(
    () => menuCategoriesCache.get(String(restaurantId ?? '')) ?? (isDemoModeEnabled() ? fallbackMenuCategoriesFor(restaurantId) : []),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!restaurantId) {
      setCategories([]);
      setLoading(false);
      return;
    }

    const cached = menuCategoriesCache.get(restaurantId);
    const fallback = cached ?? (isDemoModeEnabled() ? fallbackMenuCategoriesFor(restaurantId) : []);
    setCategories(fallback);
    setLoading(fallback.length === 0);

    (async () => {
      setError(null);
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setCategories([]);
          return;
        }
        const { data, error } = await supabase
          .from('menu_categories')
          .select('id,name,sort_order')
          .eq('restaurant_id', restaurantId)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          const liveCategories = (data ?? []) as MenuCategory[];
          const next = liveCategories.length ? liveCategories : isDemoModeEnabled() ? fallback : [];
          menuCategoriesCache.set(restaurantId, next);
          setCategories(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(friendlyError(err, "Couldn't load the menu categories."));
          setCategories(isDemoModeEnabled() ? fallback : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  return { categories, loading, error };
}

export function usePublicMenuItems(restaurantId: string | null | undefined) {
  const [items, setItems] = useState<MenuItem[]>(
    () => menuItemsCache.get(String(restaurantId ?? '')) ?? (isDemoModeEnabled() ? fallbackMenuItemsFor(restaurantId) : []),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!restaurantId) {
      setItems([]);
      setLoading(false);
      return;
    }

    const cached = menuItemsCache.get(restaurantId);
    const fallback = cached ?? (isDemoModeEnabled() ? fallbackMenuItemsFor(restaurantId) : []);
    setItems(fallback);
    setLoading(fallback.length === 0);

    (async () => {
      setError(null);
      try {
        const supabase = getSupabase();
        if (!supabase) {
          setItems([]);
          return;
        }
        const { data, error } = await supabase
          .from('menu_items')
          .select('id,restaurant_id,name,description,price,category,category_id,photo_url,is_available,is_preorderable,is_active,sort_order')
          .eq('restaurant_id', restaurantId)
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        if (!cancelled) {
          const liveItems = (data ?? []).map((row) => ({
              id: String(row.id),
              restaurant_id: String(row.restaurant_id),
              name: String(row.name ?? 'Menu item'),
              description: typeof row.description === 'string' ? row.description : null,
              price: num(row.price),
              category: typeof row.category === 'string' ? row.category : null,
              category_id: typeof row.category_id === 'string' ? row.category_id : null,
              photo_url: typeof row.photo_url === 'string' && row.photo_url.trim() ? row.photo_url : null,
              is_available: typeof row.is_available === 'boolean' ? row.is_available : null,
              is_preorderable: typeof row.is_preorderable === 'boolean' ? row.is_preorderable : null,
              sort_order: typeof row.sort_order === 'number' ? row.sort_order : null,
            }));
          const next = liveItems.length ? liveItems : isDemoModeEnabled() ? fallback : [];
          menuItemsCache.set(restaurantId, next);
          setItems(next);
        }
      } catch (err) {
        if (!cancelled) {
          setError(friendlyError(err, "Couldn't load the menu."));
          setItems(isDemoModeEnabled() ? fallback : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [restaurantId]);

  const preorderableItems = useMemo(
    () => items.filter((item) => item.is_available !== false && item.is_preorderable !== false),
    [items],
  );

  return { items, preorderableItems, loading, error };
}
