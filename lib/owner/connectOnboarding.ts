import { callEdgeFn } from '@/lib/stripe/edgeFnClient';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Wrappers for the owner Stripe Connect onboarding flow.
 *
 * The mobile app uses the Safari-popup variant per MOBILE_STRIPE_TRANSFER.md
 * §C2: we mint an Account Link URL via `create-onboarding-link`, open it
 * with `expo-web-browser.openAuthSessionAsync`, and Stripe redirects back
 * through the `cenaiva://stripe/connect/return` deep link when the owner
 * finishes (or `…/refresh` if the link expires mid-flow). After return,
 * the caller refreshes the restaurant row to read the updated
 * `stripe_charges_enabled` / `stripe_details_submitted` flags — the
 * stripe-webhook (`account.updated`) writes those onto the row.
 */

export interface OnboardingLink {
  url: string;
  expiresAt: number | null;
  accountId: string;
}

export async function createOnboardingLink(restaurantId: string): Promise<OnboardingLink> {
  const res = await callEdgeFn<{ url: string; expires_at: number | null; account_id: string }>({
    fn: 'create-onboarding-link',
    body: { restaurant_id: restaurantId },
    auth: 'required',
  });
  return { url: res.url, expiresAt: res.expires_at ?? null, accountId: res.account_id };
}

export interface RestaurantConnectStatus {
  stripeAccountId: string | null;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
}

/**
 * Refetches the owner's restaurant row to read the latest Connect flags.
 * The `account.updated` webhook stamps `stripe_charges_enabled` +
 * `stripe_payouts_enabled` + `stripe_details_submitted` directly onto
 * the row, so this is the cheapest way to know if onboarding finished.
 */
export async function getConnectStatus(restaurantId: string): Promise<RestaurantConnectStatus | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase
    .from('restaurants')
    .select('stripe_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_details_submitted')
    .eq('id', restaurantId)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    stripe_account_id: string | null;
    stripe_charges_enabled: boolean | null;
    stripe_payouts_enabled: boolean | null;
    stripe_details_submitted: boolean | null;
  };
  return {
    stripeAccountId: row.stripe_account_id ?? null,
    chargesEnabled: row.stripe_charges_enabled === true,
    payoutsEnabled: row.stripe_payouts_enabled === true,
    detailsSubmitted: row.stripe_details_submitted === true,
  };
}
