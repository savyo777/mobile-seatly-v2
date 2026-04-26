import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { menuCategories, mockMenuItems, type MenuItem } from '@/lib/mock/menuItems';

type CategoryWriteResult = { ok: boolean; reason?: 'empty' | 'duplicate' };

type MenuContextValue = {
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

const DEFAULT_PHOTOS = [
  'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
  'https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=400',
];

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>(
    mockMenuItems.filter((m) => m.restaurantId === 'r1'),
  );
  const [photos, setPhotos] = useState<string[]>(DEFAULT_PHOTOS);
  const [categories, setCategories] = useState<string[]>(menuCategories);

  useEffect(() => {
    setCategories((prev) => {
      const seen = new Set(prev);
      const next = [...prev];
      items.forEach((i) => {
        if (!seen.has(i.category)) {
          next.push(i.category);
          seen.add(i.category);
        }
      });
      return next.length === prev.length ? prev : next;
    });
  }, [items]);

  const updateItem = useCallback((id: string, changes: Partial<MenuItem>) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));
  }, []);

  const addItem = useCallback((item: MenuItem) => {
    setItems((prev) => [...prev, item]);
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const reorderCategories = useCallback((next: string[]) => {
    setCategories(next);
  }, []);

  const addCategory = useCallback<MenuContextValue['addCategory']>((name) => {
    const trimmed = name.trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    let result: CategoryWriteResult = { ok: true };
    setCategories((prev) => {
      if (prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
        result = { ok: false, reason: 'duplicate' };
        return prev;
      }
      return [...prev, trimmed];
    });
    return result;
  }, []);

  const renameCategory = useCallback<MenuContextValue['renameCategory']>((from, to) => {
    const trimmed = to.trim();
    if (!trimmed) return { ok: false, reason: 'empty' };
    let result: CategoryWriteResult = { ok: true };
    setCategories((prev) => {
      if (
        trimmed.toLowerCase() !== from.toLowerCase() &&
        prev.some((c) => c.toLowerCase() === trimmed.toLowerCase())
      ) {
        result = { ok: false, reason: 'duplicate' };
        return prev;
      }
      return prev.map((c) => (c === from ? trimmed : c));
    });
    if (result.ok) {
      setItems((prev) => prev.map((m) => (m.category === from ? { ...m, category: trimmed } : m)));
    }
    return result;
  }, []);

  const removeCategory = useCallback((name: string) => {
    setCategories((prev) => prev.filter((c) => c !== name));
  }, []);

  const value = useMemo(
    () => ({
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
    [items, updateItem, addItem, removeItem, photos, categories, reorderCategories, addCategory, renameCategory, removeCategory],
  );

  return <MenuContext.Provider value={value}>{children}</MenuContext.Provider>;
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used inside MenuProvider');
  return ctx;
}
