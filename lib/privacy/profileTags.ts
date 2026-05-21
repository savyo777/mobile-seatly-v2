/**
 * Build 3d — client wrapper for `get-my-profile-tags`. Implements
 * ToS §18 + §6.4: diner reviews what restaurants see about them.
 *
 * Note: §6.4 says the scoring engine is "preparing — not yet active".
 * Until it ships, expect mostly-empty tags + 0 scores. The UI still
 * surfaces the review path so once scores light up there's nothing
 * new to ship client-side.
 */

import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export interface ProfileTagsAggregate {
  all_tags: string[];
  max_no_show_risk_score: number;
  max_lifetime_value_score: number;
  total_visits: number;
  total_no_shows: number;
  restaurants_known_at: number;
}

export interface ProfileTagsPerRestaurant {
  guest_id: string;
  restaurant_id: string;
  restaurant_name: string;
  tags: string[];
  no_show_risk_score: number;
  lifetime_value_score: number;
  total_visits: number;
  no_show_count: number;
  last_visit_at: string | null;
}

export interface MyProfileTagsResult {
  ok: true;
  aggregate: ProfileTagsAggregate;
  per_restaurant: ProfileTagsPerRestaurant[];
}

export async function getMyProfileTags(): Promise<MyProfileTagsResult> {
  if (!isSupabaseConfigured()) throw new Error('Supabase is not configured.');
  const { url, anonKey } = getSupabaseEnv();
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase client not ready.');

  const session = await supabase.auth.getSession();
  const accessToken = session.data.session?.access_token;
  if (!accessToken) throw new Error('Please sign in.');

  const response = await fetch(`${url}/functions/v1/get-my-profile-tags`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : `Failed (${response.status}).`;
    throw new Error(message);
  }
  return payload as MyProfileTagsResult;
}
