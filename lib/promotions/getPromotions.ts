import { getSupabase } from '@/lib/supabase/client';

export type PromotionRow = {
  id: string;
  restaurant_id: string;
  title: string;
  description: string | null;
  promo_type: string | null;
  discount_value: number | null;
  discount_unit: string | null;
  applies_to: string | null;
  min_order_amount: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_private: boolean;
  promo_code: string | null;
  max_uses: number | null;
  current_uses: number | null;
  // Aggregate tap count, incremented via the increment_promotion_clicks RPC.
  // Added by migration 20260516000000; older rows backfill to 0.
  clicks: number | null;
  badge_color: string | null;
  cover_image_url: string | null;
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  bogo_item_ids: string[] | null;
  free_item_id: string | null;
  free_item_name: string | null;
  eligible_item_ids: string[] | null;
  buy_quantity: number | null;
  get_quantity: number | null;
  is_recurring: boolean;
  recurrence_frequency: string | null;
  recurrence_interval: number | null;
  recurrence_days: string[] | null;
  recurrence_end_at: string | null;
  created_at: string | null;
};

const PROMOTION_FIELDS =
  'id,restaurant_id,title,description,promo_type,discount_value,discount_unit,applies_to,min_order_amount,starts_at,ends_at,is_active,is_private,promo_code,max_uses,current_uses,clicks,badge_color,cover_image_url,media_url,media_type,media_name,bogo_item_ids,free_item_id,free_item_name,eligible_item_ids,buy_quantity,get_quantity,is_recurring,recurrence_frequency,recurrence_interval,recurrence_days,recurrence_end_at,created_at';

export async function fetchActivePromotions(options: {
  restaurantId?: string;
  restaurantIds?: string[];
  includePrivate?: boolean;
  limit?: number;
} = {}): Promise<PromotionRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const nowIso = new Date().toISOString();

  let query = supabase
    .from('promotions')
    .select(PROMOTION_FIELDS)
    .eq('is_active', true)
    .or(`ends_at.is.null,ends_at.gte.${nowIso}`)
    .order('starts_at', { ascending: true, nullsFirst: true });

  if (options.restaurantIds && options.restaurantIds.length > 0) {
    query = query.in('restaurant_id', options.restaurantIds);
  } else if (options.restaurantId) {
    query = query.eq('restaurant_id', options.restaurantId);
  }
  if (!options.includePrivate) query = query.eq('is_private', false);
  if (options.limit && options.limit > 0) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  const rows = ((data ?? []) as PromotionRow[]).filter((row) => {
    if (!row.starts_at) return true;
    return new Date(row.starts_at).toISOString() <= nowIso;
  });
  return rows;
}
