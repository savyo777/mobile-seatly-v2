import { getSupabase } from '@/lib/supabase/client';

/**
 * Increments the `clicks` counter on a promotion row by 1. Fire-and-forget:
 * the function never throws to the caller, so a tap handler can use
 * `void incrementPromotionClicks(id)` without a try/catch. Failures are
 * logged in dev only.
 *
 * Server-side this routes through the `increment_promotion_clicks` RPC
 * (migration 20260516000000) which runs as SECURITY DEFINER so neither
 * anon nor authenticated callers need direct UPDATE rights on the row.
 *
 * Used today by the owner Promos tab (`app/(staff)/promotions/index.tsx`)
 * when an owner taps their own promo card. Will be used identically by the
 * diner-side promo surface when that ships — same helper, same RPC, no
 * infra changes.
 */
export async function incrementPromotionClicks(promotionId: string): Promise<void> {
  if (!promotionId) return;
  const supabase = getSupabase();
  if (!supabase) return;
  try {
    const { error } = await supabase.rpc('increment_promotion_clicks', {
      p_promotion_id: promotionId,
    });
    if (error && __DEV__) {
      console.warn('[promotions] increment_promotion_clicks RPC failed', error);
    }
  } catch (err) {
    if (__DEV__) console.warn('[promotions] increment_promotion_clicks threw', err);
  }
}
