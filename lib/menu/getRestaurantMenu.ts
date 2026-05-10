import { getSupabase } from '@/lib/supabase/client';

export type MenuCategory = {
  id: string;
  name: string;
  description: string | null;
  sort_order: number | null;
  is_active: boolean;
};

export type MenuModifierOption = {
  id: string;
  modifier_id: string;
  name: string;
  price: number;
  is_available: boolean;
};

export type MenuModifier = {
  id: string;
  menu_item_id: string;
  name: string;
  is_required: boolean;
  min_selections: number | null;
  max_selections: number | null;
  options: MenuModifierOption[];
};

export type MenuItem = {
  id: string;
  restaurant_id: string;
  category_id: string | null;
  category: string | null;
  name: string;
  description: string | null;
  price: number;
  photo_url: string | null;
  allergens: string[];
  dietary_flags: string[];
  preparation_time_minutes: number | null;
  is_available: boolean;
  is_preorderable: boolean;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number | null;
  spice_level: string | null;
  pairing_suggestions: string | null;
  loyalty_points_value: number | null;
  calories: number | null;
  modifiers: MenuModifier[];
};

export type RestaurantMenu = {
  categories: MenuCategory[];
  items: MenuItem[];
};

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string');
}

export async function fetchRestaurantMenu(restaurantId: string): Promise<RestaurantMenu> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return { categories: [], items: [] };

  const [categoriesResult, itemsResult] = await Promise.all([
    supabase
      .from('menu_categories')
      .select('id,name,description,sort_order,is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false }),
    supabase
      .from('menu_items')
      .select(
        'id,restaurant_id,category_id,category,name,description,price,photo_url,allergens,dietary_flags,preparation_time_minutes,is_available,is_preorderable,is_active,is_featured,sort_order,spice_level,pairing_suggestions,loyalty_points_value,calories',
      )
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true, nullsFirst: false }),
  ]);

  if (categoriesResult.error) throw categoriesResult.error;
  if (itemsResult.error) throw itemsResult.error;

  const itemRows = (itemsResult.data ?? []) as Array<Record<string, unknown>>;
  const itemIds = itemRows.map((row) => String(row.id ?? '')).filter(Boolean);

  let modifiers: MenuModifier[] = [];
  if (itemIds.length) {
    const { data: modRows, error: modError } = await supabase
      .from('menu_item_modifiers')
      .select('id,menu_item_id,name,is_required,min_selections,max_selections')
      .in('menu_item_id', itemIds);
    if (modError) throw modError;

    const modIds = (modRows ?? []).map((m) => String((m as Record<string, unknown>).id ?? '')).filter(Boolean);
    let optionsRows: Array<Record<string, unknown>> = [];
    if (modIds.length) {
      const { data: optRows, error: optError } = await supabase
        .from('menu_item_modifier_options')
        .select('id,modifier_id,name,price,is_available')
        .in('modifier_id', modIds);
      if (optError) throw optError;
      optionsRows = (optRows ?? []) as Array<Record<string, unknown>>;
    }

    const optionsByModId = new Map<string, MenuModifierOption[]>();
    for (const row of optionsRows) {
      const modifierId = String(row.modifier_id ?? '');
      if (!modifierId) continue;
      const list = optionsByModId.get(modifierId) ?? [];
      list.push({
        id: String(row.id ?? ''),
        modifier_id: modifierId,
        name: String(row.name ?? ''),
        price: asNumber(row.price),
        is_available: row.is_available !== false,
      });
      optionsByModId.set(modifierId, list);
    }

    modifiers = ((modRows ?? []) as Array<Record<string, unknown>>).map((row) => {
      const modifierId = String(row.id ?? '');
      return {
        id: modifierId,
        menu_item_id: String(row.menu_item_id ?? ''),
        name: String(row.name ?? ''),
        is_required: Boolean(row.is_required),
        min_selections: typeof row.min_selections === 'number' ? row.min_selections : null,
        max_selections: typeof row.max_selections === 'number' ? row.max_selections : null,
        options: optionsByModId.get(modifierId) ?? [],
      };
    });
  }

  const modifiersByItemId = new Map<string, MenuModifier[]>();
  for (const mod of modifiers) {
    const list = modifiersByItemId.get(mod.menu_item_id) ?? [];
    list.push(mod);
    modifiersByItemId.set(mod.menu_item_id, list);
  }

  const categories = ((categoriesResult.data ?? []) as Array<Record<string, unknown>>).map(
    (row): MenuCategory => ({
      id: String(row.id ?? ''),
      name: String(row.name ?? ''),
      description: typeof row.description === 'string' ? row.description : null,
      sort_order: typeof row.sort_order === 'number' ? row.sort_order : null,
      is_active: row.is_active !== false,
    }),
  );

  const items = itemRows.map(
    (row): MenuItem => ({
      id: String(row.id ?? ''),
      restaurant_id: String(row.restaurant_id ?? ''),
      category_id: typeof row.category_id === 'string' ? row.category_id : null,
      category: typeof row.category === 'string' ? row.category : null,
      name: String(row.name ?? ''),
      description: typeof row.description === 'string' ? row.description : null,
      price: asNumber(row.price),
      photo_url: typeof row.photo_url === 'string' ? row.photo_url : null,
      allergens: asStringArray(row.allergens),
      dietary_flags: asStringArray(row.dietary_flags),
      preparation_time_minutes:
        typeof row.preparation_time_minutes === 'number' ? row.preparation_time_minutes : null,
      is_available: row.is_available !== false,
      is_preorderable: row.is_preorderable !== false,
      is_active: row.is_active !== false,
      is_featured: Boolean(row.is_featured),
      sort_order: typeof row.sort_order === 'number' ? row.sort_order : null,
      spice_level: typeof row.spice_level === 'string' ? row.spice_level : null,
      pairing_suggestions: typeof row.pairing_suggestions === 'string' ? row.pairing_suggestions : null,
      loyalty_points_value:
        typeof row.loyalty_points_value === 'number' ? row.loyalty_points_value : null,
      calories: typeof row.calories === 'number' ? row.calories : null,
      modifiers: modifiersByItemId.get(String(row.id ?? '')) ?? [],
    }),
  );

  return { categories, items };
}
