import { getSupabase } from '@/lib/supabase/client';

// Persists the owner's category list + order to the menu_categories table.
//
// Mobile menu_items reference their category by NAME (a text column), unlike
// web which uses a category_id FK. So rather than diff individual rows, we treat
// menu_categories as the authoritative ORDERED LIST OF NAMES for a restaurant and
// replace-all on every edit. This keeps ordering authoritative without per-row
// reconciliation, and items keep referencing categories by name as before.
//
// Everything here is BEST-EFFORT: any failure (RLS, network) leaves the table
// as-is and the next menu load falls back to deriving categories from the items
// themselves — i.e. exactly the prior behavior, no regression.

export async function fetchOrderedCategoryNames(restaurantId: string): Promise<string[]> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return [];
  try {
    const { data, error } = await supabase
      .from('menu_categories')
      .select('name, sort_order')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true)
      .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return (data as Array<{ name?: unknown }>)
      .map((row) => (typeof row.name === 'string' ? row.name.trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export async function syncOrderedCategories(restaurantId: string, names: string[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return;
  try {
    // De-dupe case-insensitively, preserving first occurrence + order.
    const seen = new Set<string>();
    const rows: Array<{ restaurant_id: string; name: string; sort_order: number; is_active: boolean }> = [];
    for (const raw of names) {
      const name = raw.trim();
      if (!name) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({ restaurant_id: restaurantId, name, sort_order: rows.length, is_active: true });
    }
    // Replace-all: clear the restaurant's rows, then re-insert in order.
    await supabase.from('menu_categories').delete().eq('restaurant_id', restaurantId);
    if (rows.length > 0) {
      await supabase.from('menu_categories').insert(rows);
    }
  } catch (err) {
    if (__DEV__) console.warn('[menu] syncOrderedCategories failed', err);
  }
}
