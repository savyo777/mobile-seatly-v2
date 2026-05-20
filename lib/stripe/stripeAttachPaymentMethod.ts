import { callEdgeFn, EdgeFnError } from '@/lib/stripe/edgeFnClient';

/**
 * After a diner pays a hold/deposit with `save_card: true`, call this to
 * record the saved card in our DB. Per MOBILE_STRIPE_TRANSFER.md §8 the
 * card is already attached to the diner's Stripe customer by Stripe (the
 * server passes `setup_future_usage: 'off_session'` at PaymentIntent
 * creation), so this endpoint just inserts the `saved_cards` row + sets
 * defaults. Idempotent — calling it twice for the same PI returns the
 * existing row.
 */

export interface SavedCardSummary {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export async function stripeAttachPaymentMethod(
  paymentIntentId: string,
): Promise<SavedCardSummary | null> {
  if (!paymentIntentId) return null;
  try {
    const res = await callEdgeFn<{ saved_card?: SavedCardSummary | null; idempotent?: boolean }>({
      fn: 'stripe-attach-payment-method',
      body: { payment_intent_id: paymentIntentId },
      auth: 'required',
    });
    return res.saved_card ?? null;
  } catch (err) {
    if (err instanceof EdgeFnError && err.status === 401) {
      // Guest checkout: the PI was created without `save_card` and no
      // session exists. Silently no-op — the booking still succeeded;
      // we just have no saved card to persist.
      return null;
    }
    throw err;
  }
}
