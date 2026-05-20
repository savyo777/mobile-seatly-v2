import { callEdgeFn } from '@/lib/stripe/edgeFnClient';

/**
 * Owner-side subscription payment-method helpers.
 *
 * Two-step flow per MOBILE_STRIPE_TRANSFER.md §C3:
 *   1. Mint a SetupIntent on the restaurant's Stripe customer via
 *      `stripe-setup-intent` (POST with restaurant_id).
 *   2. Present the SetupIntent via PaymentSheet (caller's responsibility,
 *      since useStripe() lives in React-land). After the SDK confirms
 *      the setup intent, the caller hands the resolved
 *      `payment_method` id back to {@link saveRestaurantPaymentMethod},
 *      which attaches + sets as default + writes the consent audit row.
 */

export async function createRestaurantSetupIntent(
  restaurantId: string,
): Promise<{ clientSecret: string }> {
  const res = await callEdgeFn<{ client_secret: string | null; mode: 'test' | 'live' }>({
    fn: 'stripe-setup-intent',
    body: { restaurant_id: restaurantId },
    auth: 'required',
  });
  if (!res.client_secret) {
    throw new Error('Card setup is unavailable right now. Please try again later.');
  }
  return { clientSecret: res.client_secret };
}

export interface SaveRestaurantPaymentMethodArgs {
  restaurantId: string;
  paymentMethodId: string;
  /**
   * Exact disclosure copy shown to the owner at the moment they consented to
   * save the card. The server writes this verbatim into
   * `subscription_consent_log` for CRA-style billing auditability —
   * pass through whatever the UI literally rendered.
   */
  disclosureText: string;
}

export interface SaveRestaurantPaymentMethodResult {
  ok: true;
  paymentMethodAttachedAt: string;
}

export async function saveRestaurantPaymentMethod(
  args: SaveRestaurantPaymentMethodArgs,
): Promise<SaveRestaurantPaymentMethodResult> {
  const res = await callEdgeFn<{ ok: true; payment_method_attached_at: string }>({
    fn: 'save-subscription-payment-method',
    body: {
      restaurant_id: args.restaurantId,
      payment_method_id: args.paymentMethodId,
      disclosure_text: args.disclosureText,
    },
    auth: 'required',
  });
  return { ok: true, paymentMethodAttachedAt: res.payment_method_attached_at };
}
