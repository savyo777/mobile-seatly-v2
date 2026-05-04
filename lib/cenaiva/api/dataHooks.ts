import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchRestaurantsFromSupabase } from '@/lib/supabase/fetchRestaurants';
import { getSupabase } from '@/lib/supabase/client';
import { mockRestaurants, type Restaurant } from '@/lib/mock/restaurants';

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

export function useCenaivaRestaurants() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const live = await fetchRestaurantsFromSupabase();
      setRestaurants(live.length ? live : mockRestaurants);
    } catch (err) {
      setError(String(err));
      setRestaurants(mockRestaurants);
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { restaurants, loading, hasLoaded, error, reload };
}

export function usePublicMenuCategories(restaurantId: string | null | undefined) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!restaurantId) {
      setCategories([]);
      return;
    }

    (async () => {
      setLoading(true);
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
          setCategories((data ?? []) as MenuCategory[]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setCategories([]);
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
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!restaurantId) {
      setItems([]);
      return;
    }

    (async () => {
      setLoading(true);
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
          setItems(
            (data ?? []).map((row) => ({
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
            })),
          );
        }
      } catch (err) {
        if (!cancelled) {
          setError(String(err));
          setItems([]);
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
