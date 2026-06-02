import { getSupabase } from '@/lib/supabase/client';
import { readDepositTiers, type DepositTier } from '@/lib/booking/depositTiers';

// Owner-side read/write for the per-party deposit policy stored in the
// restaurants.deposit_tiers JSONB column (same column the diner booking flow
// reads via previewDepositCents, and the server's compute_deposit_for_party).
// Each tier = { min_party_size, amount_per_person_cents }; the largest tier a
// party meets applies. Mirrors web's Step7DepositPolicy.

export async function readDepositTiersForRestaurant(restaurantId: string): Promise<DepositTier[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('restaurants')
    .select('deposit_tiers')
    .eq('id', restaurantId)
    .maybeSingle();
  if (error || !data) return [];
  const tiers = readDepositTiers((data as { deposit_tiers?: unknown }).deposit_tiers);
  return tiers.sort((a, b) => a.min_party_size - b.min_party_size);
}

export async function saveDepositTiers(restaurantId: string, tiers: DepositTier[]): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Supabase is not configured.');
  // Validate + de-dupe by min_party_size (last one wins) + sort ascending, so
  // the stored policy is always clean regardless of edit order.
  const byMin = new Map<number, DepositTier>();
  for (const tier of readDepositTiers(tiers)) {
    byMin.set(tier.min_party_size, tier);
  }
  const clean = Array.from(byMin.values()).sort((a, b) => a.min_party_size - b.min_party_size);
  const { error } = await supabase
    .from('restaurants')
    .update({ deposit_tiers: clean })
    .eq('id', restaurantId);
  if (error) throw new Error(error.message);
}
