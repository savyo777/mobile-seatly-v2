import { useStripe } from '@stripe/stripe-react-native';
import { createHoldPaymentIntent } from '@/lib/booking/holdApi';
import { confirmDepositPaid, prepareDeposit } from '@/lib/booking/publicBookingApi';
import { friendlyError, isUserCancellation } from '@/lib/errors/friendlyError';
import { secureRandomUuidV4 } from '@/lib/utils/secureRandom';

type StripeApi = ReturnType<typeof useStripe>;

export type PayReservationDepositArgs = {
  reservationId: string;
  restaurantId: string;
  /** Deposit amount in cents (food-equivalent base; deposits carry no tax). */
  amountCents: number;
  email: string;
  fullName: string;
  phone?: string;
  /** From the caller's `useStripe()` — these must come from a component. */
  initPaymentSheet: StripeApi['initPaymentSheet'];
  presentPaymentSheet: StripeApi['presentPaymentSheet'];
};

/**
 * Collect a reservation deposit via the canonical PI-first flow, mirroring web's
 * DepositPayPage:
 *
 *   prepare-deposit (insert the row) → create-public-payment-intent with
 *   deposit_payment_ids:[rowId] (server stamps pi.metadata + grosses up) →
 *   Stripe PaymentSheet (card entry) → confirm-deposit-paid (server re-verifies
 *   the PI against Stripe before flipping the row to 'charged').
 *
 * Deposits carry no tax, so tax_cents is 0. This NEVER touches confirm-deposit-stub.
 *
 * Replaces the old broken assumption that prepare-deposit returns a
 * stripe_payment_intent_id (it never does — it records the row with a NULL PI),
 * which made every no-hold / activity deposit throw "Could not start the deposit
 * charge."
 *
 * @returns 'paid' on success, 'cancelled' if the diner dismissed the sheet.
 * @throws on any failure (caller surfaces friendlyError).
 */
export async function payReservationDeposit(
  args: PayReservationDepositArgs,
): Promise<'paid' | 'cancelled'> {
  const { payments } = await prepareDeposit({
    reservation_id: args.reservationId,
    payers: [{ email: args.email, full_name: args.fullName, amount_cents: args.amountCents }],
  });

  // bookingDepositsEnabled() === false (debug override) → nothing to charge.
  if (payments.length === 0) return 'paid';

  for (const payment of payments) {
    const intent = await createHoldPaymentIntent({
      restaurant_id: args.restaurantId,
      amount_cents: payment.amount_cents,
      tax_cents: 0,
      deposit_payment_ids: [payment.id],
      currency: 'cad',
      customer_email: args.email || null,
      customer_name: args.fullName || null,
      // Fresh UUID per attempt so Stripe doesn't dedup retries (Bug #110).
      idempotency_key: secureRandomUuidV4(),
    });

    const initResult = await args.initPaymentSheet({
      paymentIntentClientSecret: intent.client_secret,
      merchantDisplayName: 'Cenaiva',
      returnURL: 'cenaiva://stripe-redirect',
      applePay: { merchantCountryCode: 'CA' },
      googlePay: { merchantCountryCode: 'CA', testEnv: __DEV__ },
      allowsDelayedPaymentMethods: false,
      defaultBillingDetails: {
        name: args.fullName || undefined,
        email: args.email || undefined,
        phone: args.phone || undefined,
        // CA so Stripe shows the alphanumeric keyboard for postal codes.
        address: { country: 'CA' },
      },
    });
    if (initResult.error) {
      throw new Error(
        friendlyError(initResult.error, 'Could not start the deposit charge. Please try again.'),
      );
    }

    const presentResult = await args.presentPaymentSheet();
    if (presentResult.error) {
      if (isUserCancellation(presentResult.error)) return 'cancelled';
      throw new Error(
        friendlyError(presentResult.error, 'Could not complete the deposit payment. Please try again.'),
      );
    }

    await confirmDepositPaid({ payment_id: payment.id, payment_intent_id: intent.payment_intent_id });
  }

  return 'paid';
}
