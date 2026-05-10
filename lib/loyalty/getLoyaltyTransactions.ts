import { getSupabase } from '@/lib/supabase/client';

export type LoyaltyTransactionRow = {
  id: string;
  guest_id: string | null;
  restaurant_id: string | null;
  order_id: string | null;
  type: string | null;
  points: number;
  balance_after: number | null;
  description: string | null;
  created_at: string | null;
};

export async function fetchLoyaltyTransactionsForGuests(
  guestIds: string[],
  options: { restaurantId?: string; limit?: number } = {},
): Promise<LoyaltyTransactionRow[]> {
  const supabase = getSupabase();
  const ids = guestIds.filter((id) => typeof id === 'string' && id.length > 0);
  if (!supabase || !ids.length) return [];

  let query = supabase
    .from('loyalty_transactions')
    .select('id,guest_id,restaurant_id,order_id,type,points,balance_after,description,created_at')
    .in('guest_id', ids)
    .order('created_at', { ascending: false });

  if (options.restaurantId) query = query.eq('restaurant_id', options.restaurantId);
  if (options.limit && options.limit > 0) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return ((data ?? []) as LoyaltyTransactionRow[]) ?? [];
}

/**
 * Fetch loyalty history for the user. We resolve the user's guest rows first, since
 * loyalty_transactions is keyed by guest_id (per restaurant), not by user_profile_id.
 */
export async function fetchLoyaltyTransactionsForUser(
  userProfileId: string,
  options: { restaurantId?: string; limit?: number } = {},
): Promise<LoyaltyTransactionRow[]> {
  const supabase = getSupabase();
  if (!supabase || !userProfileId) return [];

  const { data: guestRows, error: guestError } = await supabase
    .from('guests')
    .select('id')
    .eq('user_profile_id', userProfileId);
  if (guestError) throw guestError;

  const guestIds = ((guestRows ?? []) as Array<{ id?: string }>)
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.length > 0);

  if (!guestIds.length) return [];
  return fetchLoyaltyTransactionsForGuests(guestIds, options);
}
