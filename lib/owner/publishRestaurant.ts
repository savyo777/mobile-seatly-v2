import { callEdgeFn, EdgeFnError } from '@/lib/stripe/edgeFnClient';

/**
 * Wraps the `publish-restaurant` edge fn per MOBILE_STRIPE_TRANSFER.md §C4.
 *
 * Atomically (a) creates the Stripe subscription with the 90-day trial,
 * (b) flips `is_published=true` on the restaurants row.
 *
 * The server enforces publish gates — each returns a specific
 * `publish_gate_*` error code. {@link publishGateMessage} maps them to
 * friendly copy that callers can show in an Alert.
 */

export type PublishGateCode =
  | 'publish_gate_kyc_not_verified'
  | 'publish_gate_no_cover_photo'
  | 'publish_gate_no_payment_method'
  | 'publish_gate_no_stripe_customer'
  | 'publish_gate_restaurant_deleted';

export interface PublishRestaurantArgs {
  restaurantId: string;
  /**
   * Exact text of the publish-confirmation modal the owner saw before
   * tapping "Yes, publish". Persisted in `subscription_consent_log` for
   * billing audit defensibility — pass through the literal copy.
   */
  disclosureText: string;
}

export interface PublishRestaurantResult {
  ok: true;
  alreadyPublished: boolean;
  subscriptionId: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

export async function publishRestaurant(
  args: PublishRestaurantArgs,
): Promise<PublishRestaurantResult> {
  const res = await callEdgeFn<{
    ok: true;
    already_published?: boolean;
    subscription_id?: string | null;
    subscription_status?: string | null;
    trial_ends_at?: string | null;
  }>({
    fn: 'publish-restaurant',
    body: { restaurant_id: args.restaurantId, disclosure_text: args.disclosureText },
    auth: 'required',
  });
  return {
    ok: true,
    alreadyPublished: res.already_published === true,
    subscriptionId: res.subscription_id ?? null,
    subscriptionStatus: res.subscription_status ?? null,
    trialEndsAt: res.trial_ends_at ?? null,
  };
}

/**
 * Maps a `publish_gate_*` error to a user-friendly message with a
 * suggested next step. Returns null when the input isn't a known gate
 * code (callers should fall back to `friendlyError`).
 */
export function publishGateMessage(err: unknown): string | null {
  if (!(err instanceof EdgeFnError)) return null;
  const code = typeof err.message === 'string' ? err.message : '';
  switch (code) {
    case 'publish_gate_kyc_not_verified':
      return 'Stripe needs to verify your business before you can publish. Finish Stripe onboarding from Account → Connect to Stripe.';
    case 'publish_gate_no_cover_photo':
      return 'Add a cover photo for your restaurant — it’s shown on the discover map and is required to publish.';
    case 'publish_gate_no_payment_method':
      return 'Add a card on file before publishing. Visit Account → Payment method to save one.';
    case 'publish_gate_no_stripe_customer':
      return 'Stripe billing isn’t set up yet. Add a card under Account → Payment method first.';
    case 'publish_gate_restaurant_deleted':
      return 'This restaurant was deleted. Restore it from your account to publish.';
    default:
      return null;
  }
}
