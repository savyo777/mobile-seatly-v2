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

  const { data: photoRows, error } = await supabase
    .from('visit_photos')
    .select('id, user_id, restaurant_id, booking_id, image_url, caption, story_filter_id, story_filter_captured_at, rating, tags, created_at')
    .eq('restaurant_id', restaurantId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  if (!photoRows || photoRows.length === 0) return [];

  // visit_photos.user_id is auth.users.id; look up display info via user_profiles.auth_user_id.
  const authUserIds = [...new Set((photoRows as Array<{ user_id: string }>).map((r) => r.user_id))];
  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('auth_user_id, full_name, avatar_url')
    .in('auth_user_id', authUserIds);

  const profileMap = new Map<string, { full_name: string | null; avatar_url: string | null }>();
  for (const p of (profiles ?? []) as Array<{ auth_user_id: string; full_name: string | null; avatar_url: string | null }>) {
    profileMap.set(p.auth_user_id, { full_name: p.full_name, avatar_url: p.avatar_url });
  }

  return (photoRows as Array<Record<string, unknown>>).map((row) => {
    const profile = profileMap.get(row.user_id as string);
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
      full_name: profile?.full_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    };
  });
}

/**
 * Fetches a single visit photo by id, joined with the poster's profile (full
 * name + avatar) so the snap detail screen can render even when the in-memory
 * mock store has never seen this snap (which is always the case for real
 * customer-uploaded snaps with Supabase UUIDs).
 */
export async function getVisitPhotoById(id: string): Promise<VisitPhotoRow | null> {
  const supabase = getSupabase();
  if (!supabase || !id) return null;

  const { data: row, error } = await supabase
    .from('visit_photos')
    .select(
      'id, user_id, restaurant_id, booking_id, image_url, caption, story_filter_id, story_filter_captured_at, rating, tags, created_at',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const r = row as {
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
  };

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name, avatar_url')
    .eq('auth_user_id', r.user_id)
    .maybeSingle();

  const p = (profile ?? null) as { full_name: string | null; avatar_url: string | null } | null;

  return {
    id: r.id,
    user_id: r.user_id,
    restaurant_id: r.restaurant_id,
    booking_id: r.booking_id,
    image_url: r.image_url,
    caption: r.caption,
    story_filter_id: r.story_filter_id,
    story_filter_captured_at: r.story_filter_captured_at,
    rating: r.rating,
    tags: r.tags,
    created_at: r.created_at,
    full_name: p?.full_name ?? null,
    avatar_url: p?.avatar_url ?? null,
  };
}
