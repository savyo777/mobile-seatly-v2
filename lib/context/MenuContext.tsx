import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';
import { getSupabase } from '@/lib/supabase/client';
import { menuCategories, mockMenuItems, type MenuItem } from '@/lib/mock/menuItems';

type CategoryWriteResult = { ok: boolean; reason?: 'empty' | 'duplicate' };

type MenuContextValue = {
  ownerRestaurantId: string | null;
  items: MenuItem[];
  updateItem: (id: string, changes: Partial<MenuItem>) => void;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  photos: string[];
  setPhotos: (photos: string[]) => void;
  categories: string[];
  reorderCategories: (next: string[]) => void;
  addCategory: (name: string) => CategoryWriteResult;
  renameCategory: (from: string, to: string) => CategoryWriteResult;
  removeCategory: (name: string) => void;
};

const MenuContext = createContext<MenuContextValue | null>(null);

function num(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function mapRowToMenuItem(row: Record<string, unknown>): MenuItem {
  return {
    id: String(row.id),
    restaurantId: String(row.restaurant_id),
    name: typeof row.name === 'string' ? row.name : 'Menu item',
    description: typeof row.description === 'string' ? row.description : '',
    price: num(row.price),
    category: typeof row.category === 'string' ? row.category : 'Menu',
    photoUrl: typeof row.photo_url === 'string' ? row.photo_url : '',
    allergens: Array.isArray(row.allergens) ? row.allergens.filter((item): item is string => typeof item === 'string') : [],
    dietaryFlags: Array.isArray(row.dietary_flags) ? row.dietary_flags.filter((item): item is string => typeof item === 'string') : [],
    isAvailable: bool(row.is_available, true),
    isPreorderable: bool(row.is_preorderable, false),
    isFeatured: bool(row.is_featured, false),
    preparationTimeMinutes: num(row.preparation_time_minutes, 15),
    calories: num(row.calories),
  };
}

function itemToRow(item: Partial<MenuItem>, restaurantId: string) {
  return {
    restaurant_id: restaurantId,
    name: item.name ?? '',
    description: item.description ?? '',
    price: item.price ?? 0,
    category: item.category ?? 'Menu',
    photo_url: item.photoUrl ?? null,
    allergens: item.allergens ?? [],
    dietary_flags: item.dietaryFlags ?? [],
    is_available: item.isAvailable ?? true,
    is_preorderable: item.isPreorderable ?? false,
    is_featured: item.isFeatured ?? false,
    preparation_time_minutes: item.preparationTimeMinutes ?? 15,
    calories: item.calories ?? 0,
  };
}

function itemToPatch(item: Partial<MenuItem>) {
  const patch: Record<string, unknown> = {};
  if (item.name !== undefined) patch.name = item.name;
  if (item.description !== undefined) patch.description = item.description;
  if (item.price !== undefined) patch.price = item.price;
  if (item.category !== undefined) patch.category = item.category;
  if (item.photoUrl !== undefined) patch.photo_url = item.photoUrl ?? null;
  if (item.allergens !== undefined) patch.allergens = item.allergens;
  if (item.dietaryFlags !== undefined) patch.dietary_flags = item.dietaryFlags;
  if (item.isAvailable !== undefined) patch.is_available = item.isAvailable;
  if (item.isPreorderable !== undefined) patch.is_preorderable = item.isPreorderable;
  if (item.isFeatured !== undefined) patch.is_featured = item.isFeatured;
  if (item.preparationTimeMinutes !== undefined) patch.preparation_time_minutes = item.preparationTimeMinutes;
  if (item.calories !== undefined) patch.calories = item.calories;
  return patch;
}

function categoriesFromItems(items: MenuItem[]): string[] {
  const names = new Set(items.map((item) => item.category).filter(Boolean));
  return [
    ...menuCategories.filter((category) => names.has(category)),
    ...[...names].filter((category) => !menuCategories.includes(category)),
  ];
}

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const { user, isStaffLike } = useAuthSession();
  const [ownerRestaurantId, setOwnerRestaurantId] = useState<string | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [photos, setPhotos] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadOwnerMenu() {
      if (!user || !isStaffLike) {
        setOwnerRestaurantId(null);
        setItems([]);
        setPhotos([]);
        setCategories([]);
        return;
      }

      try {
        const restaurant = await fetchCurrentOwnerRestaurant();
        if (cancelled) return;
        setOwnerRestaurantId(restaurant?.id ?? null);
        setPhotos([restaurant?.coverPhotoUrl, restaurant?.logoUrl].filter((uri): uri is string => Boolean(uri)));

        const supabase = getSupabase();
        if (!supabase || !restaurant?.id) {
          if (isDemoModeEnabled()) {
            const demoItems = mockMenuItems.filter((item) => item.restaurantId === 'r1');
            setItems(demoItems);
            setCategories(categoriesFromItems(demoItems));
          } else {
            setItems([]);
            setCategories([]);
          }
          return;
        }

        const { data, error } = await supabase
          .from('menu_items')
          .select('*')
          .eq('restaurant_id', restaurant.id)
          .order('category', { ascending: true })
          .order('sort_order', { ascending: true })
          .order('name', { ascending: true });
        if (error) throw error;
        if (cancelled) return;
        const next = ((data ?? []) as Record<string, unknown>[]).map(mapRowToMenuItem);
        setItems(next);
        setCategories(categoriesFromItems(next));
      } catch {
        if (!cancelled) {
          setOwnerRestaurantId(null);
          setItems([]);
          setPhotos([]);
          setCategories([]);
        }
      }
    }

    void loadOwnerMenu();
    return () => {
      cancelled = true;
    };
  }, [isStaffLike, user?.id]);

  useEffect(() => {
    setCategories((prev) => {
      const derived = categoriesFromItems(items);
      const seen = new Set(derived);
      const next = [...derived, ...prev.filter((item) => !seen.has(item))];
      return next.join('|') === prev.join('|') ? prev : next;
    });
  }, [items]);

  const updateItem = useCallback((id: string, changes: Partial<MenuItem>) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
    const supabase = getSupabase();
    if (supabase && ownerRestaurantId) {
      void supabase.from('menu_items').update(itemToPatch(changes)).eq('id', id);
    }
  }, [ownerRestaurantId]);

  const addItem = useCallback((item: MenuItem) => {
    const restaurantId = ownerRestaurantId ?? item.restaurantId;
    const localItem = { ...item, restaurantId };
    setItems((prev) => [...prev, localItem]);
    const supabase = getSupabase();
    if (supabase && restaurantId) {
      void supabase
        .from('menu_items')
        .insert(itemToRow(localItem, restaurantId))
        .select('id')
        .single()
        .then(({ data }) => {
          const dbId = typeof data?.id === 'string' ? data.id : null;
          if (dbId) setItems((prev) => prev.map((next) => (next.id === item.id ? { ...next, id: dbId } : next)));
        });
    }
  }, [ownerRestaurantId]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
    const supabase = getSupabase();
    if (supabase) void supabase.from('menu_items').delete().eq('id', id);
  }, []);

  const reorderCategories = useCallback((next: string[]) => {
    setCategories(next);
  }, []);

  const addCategory = useCallback<MenuContextValue['addCategory']>((name) => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    if (categories.some((category) => category.toLowerCase() === trimmed.toLowerCase())) {
      return { ok: false, reason: 'duplicate' };
    }
    setCategories((prev) => [...prev, trimmed]);
    return { ok: true };
  }, [categories]);

  const renameCategory = useCallback<MenuContextValue['renameCategory']>((from, to) => {
    const trimmed = to.trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    if (
      trimmed.toLowerCase() !== from.toLowerCase() &&
      categories.some((category) => category.toLowerCase() === trimmed.toLowerCase())
    ) {
      return { ok: false, reason: 'duplicate' };
    }
    setCategories((prev) => prev.map((category) => (category === from ? trimmed : category)));
    setItems((prev) => prev.map((item) => (item.category === from ? { ...item, category: trimmed } : item)));
    const supabase = getSupabase();
    if (supabase && ownerRestaurantId) {
      void supabase
        .from('menu_items')
        .update({ category: trimmed })
        .eq('restaurant_id', ownerRestaurantId)
        .eq('category', from);
    }
    return { ok: true };
  }, [categories, ownerRestaurantId]);

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((category) => category !== name));
  }, []);

  const value = useMemo<MenuContextValue>(
    () => ({
      ownerRestaurantId,
      items,
      updateItem,
      addItem,
      removeItem,
      photos,
      setPhotos,
      categories,
      reorderCategories,
      addCategory,
      renameCategory,
      removeCategory,
    }),
    [ownerRestaurantId, items, updateItem, addItem, removeItem, photos, categories, reorderCategories, addCategory, renameCategory, removeCategory],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used inside MenuProvider');
  return ctx;
}
