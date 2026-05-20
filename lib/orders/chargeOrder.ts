import { callEdgeFn, EdgeFnError } from '@/lib/stripe/edgeFnClient';

/**
 * Wrapper around `stripe-charge-order` for diner pay-the-bill.
 *
 * Per MOBILE_STRIPE_TRANSFER.md §23.9. Charges an open order off-session
 * using the diner's default saved card on the connected restaurant
 * account. Server enforces the 5.5% application fee on BASE and the
 * <$12 gross-up rule.
 *
 * On SCA challenge the server returns 402 with `requires_action` +
 * `client_secret` so the mobile client can call
 * `useStripe().handleNextAction(clientSecret)` then re-issue the
 * charge. The wrapper surfaces that as an `EdgeFnError` with
 * `code: 'requires_action'` + the secret on `body`.
 */

export type ChargeOrderRequest =
  | { order_id: string; tip_amount: number }
  | { order_id: string; tip_percentage: number };

export interface ChargeOrderSuccess {
  ok: true;
  total_charged: number; // base CAD (server-net amount)
  tip_amount: number;
  paid_at: string;
  processing_fee?: number;
  diner_charged?: number; // grossed-up total the diner saw on their statement
  mode: 'test' | 'live';
}

export async function chargeOrder(req: ChargeOrderRequest): Promise<ChargeOrderSuccess> {
  return callEdgeFn<ChargeOrderSuccess>({
    fn: 'stripe-charge-order',
    body: req as unknown as Record<string, unknown>,
    auth: 'required',
  });
}

/**
 * Extracts the SCA next-action client_secret + connected-account id from
 * an EdgeFnError thrown by {@link chargeOrder}. Returns null if this
 * wasn't an SCA challenge.
 */
export function readNextActionFromError(
  err: unknown,
): { clientSecret: string; stripeAccountId: string | null } | null {
  if (!(err instanceof EdgeFnError)) return null;
  if (err.status !== 402) return null;
  const body = err.body as
    | { requires_action?: boolean; client_secret?: string | null; stripe_account_id?: string | null }
    | null
    | undefined;
  if (!body?.requires_action || !body.client_secret) return null;
  return {
    clientSecret: body.client_secret,
    stripeAccountId: body.stripe_account_id ?? null,
  };
}
