import { callEdgeFn } from '@/lib/stripe/edgeFnClient';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Owner subscription lifecycle wrappers — pause, cancel, resume, restart.
 *
 * State machine per MOBILE_STRIPE_TRANSFER.md §9. Buttons surfaced by the
 * staff subscription screen are gated on `subscription_status`:
 *
 *   trialing / active           → Pause • Cancel plan
 *   cancel_pending (cancel set) → Resume subscription
 *   paused                       → Resume subscription
 *   ended / cancelled           → Restart subscription
 *
 * Pause + Cancel are confirmation-modal-required. Resume + Restart are
 * single-tap (low-stakes positive actions) per the doc.
 *
 * Each wrapper returns the updated `subscription_status` so the caller can
 * re-render without a Supabase round-trip. {@link getSubscriptionStatus}
 * is the read for cold-start hydration.
 */

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'paused'
  | 'past_due'
  | 'incomplete'
  | 'cancelled'
  | 'cancel_pending'
  | 'ended'
  | 'none';

export interface RestaurantSubscriptionSnapshot {
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  /**
   * Reflects `cancel_at_period_end` mirrored onto the restaurants row.
   * True means the subscription will end at the current period close,
   * so UI should surface "Resume subscription" instead of "Cancel".
   */
  cancelPending: boolean;
}

export async function getSubscriptionStatus(
  restaurantId: string,
): Promise<RestaurantSubscriptionSnapshot | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from('restaurants')
    .select('subscription_status, trial_ends_at, subscription_cancel_at_period_end')
    .eq('id', restaurantId)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    subscription_status: string | null;
    trial_ends_at: string | null;
    subscription_cancel_at_period_end: boolean | null;
  };
  const raw = (row.subscription_status ?? 'none') as SubscriptionStatus;
  return {
    status: raw,
    trialEndsAt: row.trial_ends_at ?? null,
    cancelPending: row.subscription_cancel_at_period_end === true,
  };
}

type LifecycleResponse = {
  ok?: boolean;
  subscription_status?: string | null;
  cancel_at_period_end?: boolean | null;
};

async function callLifecycle(fn: string, restaurantId: string): Promise<LifecycleResponse> {
  return callEdgeFn<LifecycleResponse>({
    fn,
    body: { restaurant_id: restaurantId },
    auth: 'required',
  });
}

export async function pauseSubscription(restaurantId: string): Promise<LifecycleResponse> {
  return callLifecycle('pause-subscription', restaurantId);
}

export async function cancelSubscription(restaurantId: string): Promise<LifecycleResponse> {
  return callLifecycle('cancel-subscription', restaurantId);
}

export async function resumeSubscription(restaurantId: string): Promise<LifecycleResponse> {
  return callLifecycle('resume-subscription', restaurantId);
}

export async function restartSubscription(restaurantId: string): Promise<LifecycleResponse> {
  return callLifecycle('restart-subscription', restaurantId);
}
