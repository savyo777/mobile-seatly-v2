import { getSupabase } from '@/lib/supabase/client';

export interface VisitPhotoRow {
  id: string;
  user_id: string;
  restaurant_id: string;
  booking_id: string | null;
  image_url: string;
  caption: string | null;
  story_filter_id: string | null;
  story_filter_captured_at: number | null;
  rating: number | null;
  tags: string[] | null;
  created_at: string;
  full_name: string | null;
  avatar_url: string | null;
}

export async function insertVisitPhoto(params: {
  userId: string;
  restaurantId: string;
  imageUrl: string;
  caption: string | null;
  bookingId?: string | null;
  storyFilterId?: string | null;
  storyFilterCapturedAt?: number | null;
  rating?: number | null;
  tags?: string[];
}): Promise<string> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase not configured');

  const { data, error } = await supabase
    .from('visit_photos')
    .insert({
      user_id: params.userId,
      restaurant_id: params.restaurantId,
      image_url: params.imageUrl,
      caption: params.caption,
      booking_id: params.bookingId ?? null,
      story_filter_id: params.storyFilterId ?? null,
      story_filter_captured_at: params.storyFilterCapturedAt ?? null,
      rating: params.rating ?? null,
      tags: params.tags && params.tags.length > 0 ? params.tags : null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function listVisitPhotosByRestaurant(
  restaurantId: string,
  limit = 50,
): Promise<VisitPhotoRow[]> {
  const supabase = getSupabase();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('visit_photos')
    .select('id, user_id, restaurant_id, booking_id, image_url, caption, story_filter_id, story_filter_captured_at, rating, tags, created_at, user_profiles!visit_photos_user_id_fkey(full_name, avatar_url)')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;

  return ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
    const profile = row['user_profiles'] as Record<string, unknown> | null;
    return {
      id: row.id as string,
      user_id: row.user_id as string,
      restaurant_id: row.restaurant_id as string,
      booking_id: (row.booking_id as string | null) ?? null,
      image_url: row.image_url as string,
      caption: (row.caption as string | null) ?? null,
      story_filter_id: (row.story_filter_id as string | null) ?? null,
      story_filter_captured_at: (row.story_filter_captured_at as number | null) ?? null,
      rating: (row.rating as number | null) ?? null,
      tags: (row.tags as string[] | null) ?? null,
      created_at: row.created_at as string,
      full_name: (profile?.full_name as string | null) ?? null,
      avatar_url: (profile?.avatar_url as string | null) ?? null,
    };
  });
}
