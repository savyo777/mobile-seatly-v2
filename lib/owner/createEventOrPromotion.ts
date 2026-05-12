import { getSupabase } from '@/lib/supabase/client';

export interface EventInput {
  restaurant_id: string;
  name: string;
  description?: string | null;
  theme?: string | null;
  dress_code?: string | null;
  min_age?: number | null;
  date?: string | null;          // YYYY-MM-DD
  end_date?: string | null;      // YYYY-MM-DD
  start_time?: string | null;    // HH:MM:SS
  end_time?: string | null;      // HH:MM:SS
  fixed_arrival_time?: boolean;
  is_recurring?: boolean;
  recurrence_rule?: string | null;
  price_per_person?: number | null;
  capacity?: number | null;
  is_private?: boolean;
  menu_id?: string | null;
  cover_image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  media_name?: string | null;
}

export interface PromotionInput {
  restaurant_id: string;
  title: string;
  promo_type: 'percent' | 'amount' | 'bogo' | 'free_item';
  description?: string | null;
  discount_value?: number | null;
  discount_unit?: string | null;
  applies_to?: 'all' | 'items';
  eligible_item_ids?: string[];
  min_order_amount?: number | null;
  starts_at?: string | null;     // ISO timestamp
  ends_at?: string | null;       // ISO timestamp
  promo_code?: string | null;
  max_uses?: number | null;
  badge_color?: string;
  bogo_item_ids?: string[];
  buy_quantity?: number;
  get_quantity?: number;
  free_item_id?: string | null;
  free_item_name?: string | null;
  is_recurring?: boolean;
  recurrence_frequency?: 'daily' | 'weekly' | 'monthly' | null;
  recurrence_interval?: number;
  recurrence_days?: number[];    // 0=Sun..6=Sat
  recurrence_end_at?: string | null;
  start_time_of_day?: string | null; // HH:MM:SS
  end_time_of_day?: string | null;   // HH:MM:SS
  is_private?: boolean;
  cover_image_url?: string | null;
  media_url?: string | null;
  media_type?: string | null;
  media_name?: string | null;
}

export async function createEvent(input: EventInput): Promise<{ id: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('events')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return { id: String(data.id) };
}

export async function createPromotion(input: PromotionInput): Promise<{ id: string }> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('promotions')
    .insert(input)
    .select('id')
    .single();
  if (error) throw error;
  return { id: String(data.id) };
}
