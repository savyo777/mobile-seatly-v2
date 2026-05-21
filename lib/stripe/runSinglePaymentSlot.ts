/**
 * Generic Stripe PaymentSheet runner used by both single-pay and
 * split-tender flows.
 *
 * Why a helper: the holds-path single-pay flow in step6-payment.tsx
 * wraps PaymentSheet with `confirm-hold-paid` and saved-card handling.
 * Split-tender needs the SAME initPaymentSheet/presentPaymentSheet
 * dance per slot but settles via `confirm-deposit-paid` instead, so it
 * can't reuse that wrapped function. This helper covers only the
 * Stripe SDK part — the caller composes the post-settle step.
 *
 * Returns:
 *   { outcome: 'confirmed' }  → sheet completed; PI is succeeded
 *   { outcome: 'cancelled' }  → user dismissed the sheet
 *   { outcome: 'error', message: string }  → init or present errored
 *
 * Mirrors the wallet config + CA postal-code keyboard fix from
 * step6-payment.tsx so the sheet looks identical across both flows.
 */

import type { useStripe } from '@stripe/stripe-react-native';
import { friendlyError, isUserCancellation } from '@/lib/errors/friendlyError';

export type SlotPaymentOutcome =
  | { outcome: 'confirmed' }
  | { outcome: 'cancelled' }
  | { outcome: 'error'; message: string };

export interface RunSinglePaymentSlotParams {
  /** From `useStripe()` — caller passes the destructured methods. */
  initPaymentSheet: ReturnType<typeof useStripe>['initPaymentSheet'];
  presentPaymentSheet: ReturnType<typeof useStripe>['presentPaymentSheet'];
  /** From the create-public-payment-intent response. */
  clientSecret: string;
  /** What to display in the sheet's merchant header. */
  merchantDisplayName?: string;
  /** Deep-link the sheet returns to after 3DS. */
  returnURL?: string;
  /**
   * Optional billing defaults. Most useful: name + email so the sheet
   * doesn't ask Person K for those fields when they enter their card.
   * Postal-code country defaults to CA so Stripe's keyboard becomes
   * alphanumeric for Canadian codes (M5V 2T6 vs 90210).
   */
  billing?: {
    name?: string;
    email?: string;
    phone?: string;
    country?: string;
  };
}

export async function runSinglePaymentSlot(
  params: RunSinglePaymentSlotParams,
): Promise<SlotPaymentOutcome> {
  const {
    initPaymentSheet,
    presentPaymentSheet,
    clientSecret,
    merchantDisplayName = 'Cenaiva',
    returnURL = 'cenaiva://stripe-redirect',
    billing,
  } = params;

  const initResult = await initPaymentSheet({
    paymentIntentClientSecret: clientSecret,
    merchantDisplayName,
    returnURL,
    applePay: { merchantCountryCode: 'CA' },
    googlePay: { merchantCountryCode: 'CA', testEnv: __DEV__ },
    allowsDelayedPaymentMethods: false,
    defaultBillingDetails: {
      name: billing?.name || undefined,
      email: billing?.email || undefined,
      phone: billing?.phone || undefined,
      address: { country: billing?.country ?? 'CA' },
    },
  });
  if (initResult.error) {
    return {
      outcome: 'error',
      message: friendlyError(initResult.error, 'Could not start the payment. Please try again.'),
    };
  }

  const presentResult = await presentPaymentSheet();
  if (presentResult.error) {
    if (isUserCancellation(presentResult.error)) {
      return { outcome: 'cancelled' };
    }
    return {
      outcome: 'error',
      message: friendlyError(presentResult.error, 'Could not complete payment. Please try again.'),
    };
  }
  return { outcome: 'confirmed' };
}
