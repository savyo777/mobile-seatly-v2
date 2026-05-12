/**
 * Floor capacity — owner/staff helper that sums `tables.capacity` for a
 * restaurant on-device.
 *
 * Replaces the `restaurant_floor_capacity(p_restaurant_id)` Supabase RPC for
 * mobile callers. The server-side RPC remains in place for the web app and
 * for `supabase/functions/create-public-booking/index.ts`.
 */

import { getSupabase } from '@/lib/supabase/client';

/**
 * Returns the total seated capacity across active tables for `restaurantId`.
 * Returns 0 on any error or when the result set is empty.
 */
export async function fetchFloorCapacity(restaurantId: string): Promise<number> {
  const supabase = getSupabase();
  if (!supabase) return 0;
  try {
    const { data, error } = await supabase
      .from('tables')
      .select('capacity')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);
    if (error) return 0;
    const rows = (data ?? []) as Array<{ capacity: number | null }>;
    return rows.reduce((sum, row) => sum + (row.capacity ?? 0), 0);
  } catch {
    return 0;
  }
}
