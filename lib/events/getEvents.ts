import { getSupabase } from '@/lib/supabase/client';

export type EventRow = {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  price_per_person: number | null;
  capacity: number | null;
  tickets_sold: number | null;
  is_recurring: boolean;
  recurrence_rule: string | null;
  is_active: boolean;
  is_private: boolean;
  cover_image_url: string | null;
  media_url: string | null;
  media_type: string | null;
  media_name: string | null;
  min_age: number | null;
  dress_code: string | null;
  menu_id: string | null;
  theme: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const EVENT_FIELDS =
  'id,restaurant_id,name,description,date,end_date,start_time,end_time,price_per_person,capacity,tickets_sold,is_recurring,recurrence_rule,is_active,is_private,cover_image_url,media_url,media_type,media_name,min_age,dress_code,menu_id,theme,created_at,updated_at';

export async function fetchUpcomingEvents(options: {
  restaurantId?: string;
  fromDate?: string;
  includePrivate?: boolean;
  limit?: number;
} = {}): Promise<EventRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const fromDate = options.fromDate ?? new Date().toISOString().slice(0, 10);

  let query = supabase
    .from('events')
    .select(EVENT_FIELDS)
    .eq('is_active', true)
    .or(`end_date.gte.${fromDate},date.gte.${fromDate}`)
    .order('date', { ascending: true, nullsFirst: false });

  if (options.restaurantId) query = query.eq('restaurant_id', options.restaurantId);
  if (!options.includePrivate) query = query.eq('is_private', false);
  if (options.limit && options.limit > 0) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as EventRow[]) ?? [];
}

export async function fetchEventById(eventId: string): Promise<EventRow | null> {
  const supabase = getSupabase();
  if (!supabase || !eventId) return null;

  const { data, error } = await supabase
    .from('events')
    .select(EVENT_FIELDS)
    .eq('id', eventId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as EventRow | null;
}
