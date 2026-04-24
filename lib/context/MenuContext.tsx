import React, { createContext, useContext, useState } from 'react';
import { mockMenuItems, type MenuItem } from '@/lib/mock/menuItems';

type MenuContextValue = {
  items: MenuItem[];
  updateItem: (id: string, changes: Partial<MenuItem>) => void;
  addItem: (item: MenuItem) => void;
  removeItem: (id: string) => void;
  photos: string[];
  setPhotos: (photos: string[]) => void;
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

  const updateItem = (id: string, changes: Partial<MenuItem>) =>
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)));

  const addItem = (item: MenuItem) => setItems((prev) => [...prev, item]);

  const removeItem = (id: string) => setItems((prev) => prev.filter((m) => m.id !== id));

  return (
    <MenuContext.Provider value={{ items, updateItem, addItem, removeItem, photos, setPhotos }}>
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu() {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error('useMenu must be used inside MenuProvider');
  return ctx;
}
