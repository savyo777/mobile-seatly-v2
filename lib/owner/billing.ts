import { callEdgeFn } from '@/lib/stripe/edgeFnClient';

/**
 * Owner billing wrappers.
 *
 * Surfaces the four billing edge fns referenced by MOBILE_STRIPE_TRANSFER.md
 * §C6 on a single mobile API:
 *   - get-restaurant-payment-method (default card brand/last4/exp)
 *   - update-subscription-payment-method (swap default card after SetupIntent)
 *   - get-next-bill-preview (upcoming invoice with line items)
 *   - list-stripe-payouts (pending + recent payouts on the Connect account)
 *   - update-billing-details (legal name + email + address + tax ID)
 */

// ── get-restaurant-payment-method ──────────────────────────────────────────

export interface RestaurantCardSummary {
  hasCard: boolean;
  brand: string | null;
  last4: string | null;
  expMonth: number | null;
  expYear: number | null;
}

export async function getRestaurantPaymentMethod(
  restaurantId: string,
): Promise<RestaurantCardSummary> {
  const res = await callEdgeFn<{
    ok: true;
    has_card: boolean;
    brand?: string | null;
    last4?: string | null;
    exp_month?: number | null;
    exp_year?: number | null;
  }>({
    fn: 'get-restaurant-payment-method',
    body: { restaurant_id: restaurantId },
    auth: 'required',
  });
  return {
    hasCard: res.has_card === true,
    brand: res.brand ?? null,
    last4: res.last4 ?? null,
    expMonth: res.exp_month ?? null,
    expYear: res.exp_year ?? null,
  };
}

// ── update-subscription-payment-method ─────────────────────────────────────

export async function updateRestaurantPaymentMethod(args: {
  restaurantId: string;
  paymentMethodId: string;
}): Promise<{ ok: true; subscriptionId: string | null; defaultPaymentMethod: string }> {
  const res = await callEdgeFn<{
    ok: true;
    default_payment_method: string;
    subscription_id: string | null;
  }>({
    fn: 'update-subscription-payment-method',
    body: { restaurant_id: args.restaurantId, payment_method_id: args.paymentMethodId },
    auth: 'required',
  });
  return {
    ok: true,
    subscriptionId: res.subscription_id ?? null,
    defaultPaymentMethod: res.default_payment_method,
  };
}

// ── get-next-bill-preview ──────────────────────────────────────────────────

export interface NextBillLineItem {
  description: string;
  amountCents: number;
  quantity: number;
  isSubscription: boolean;
}

export type NextBillPreview =
  | { hasUpcoming: false; reason: 'trialing' | 'no_subscription' | 'no_customer' | 'unknown' }
  | {
      hasUpcoming: true;
      nextAmountCents: number;
      nextDateIso: string | null;
      currency: string;
      lineItems: NextBillLineItem[];
    };

export async function getNextBillPreview(restaurantId: string): Promise<NextBillPreview> {
  const res = await callEdgeFn<{
    ok: true;
    has_upcoming: boolean;
    reason?: 'trialing' | 'no_subscription' | 'no_customer';
    next_amount_cents?: number;
    next_date_iso?: string | null;
    currency?: string;
    line_items?: Array<{
      description: string;
      amount_cents: number;
      quantity: number;
      is_subscription?: boolean;
    }>;
  }>({
    fn: 'get-next-bill-preview',
    body: { restaurant_id: restaurantId },
    auth: 'required',
  });
  if (!res.has_upcoming) {
    return { hasUpcoming: false, reason: res.reason ?? 'unknown' };
  }
  return {
    hasUpcoming: true,
    nextAmountCents: res.next_amount_cents ?? 0,
    nextDateIso: res.next_date_iso ?? null,
    currency: res.currency ?? 'cad',
    lineItems: (res.line_items ?? []).map((l) => ({
      description: l.description,
      amountCents: l.amount_cents,
      quantity: l.quantity,
      isSubscription: l.is_subscription === true,
    })),
  };
}

// ── list-stripe-payouts ────────────────────────────────────────────────────

export interface PayoutRow {
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  arrivalDateIso: string | null;
  createdIso: string | null;
}

export interface PayoutsSnapshot {
  hasAccount: boolean;
  payoutsEnabled: boolean;
  availableBalanceCents: number;
  pendingBalanceCents: number;
  payouts: PayoutRow[];
}

export async function listStripePayouts(restaurantId: string): Promise<PayoutsSnapshot> {
  const res = await callEdgeFn<{
    ok: true;
    has_account: boolean;
    payouts_enabled: boolean;
    available_balance_cents: number;
    pending_balance_cents: number;
    payouts: Array<{
      id: string;
      amount_cents: number;
      currency: string;
      status: string;
      arrival_date_iso: string | null;
      created_iso: string | null;
    }>;
  }>({
    fn: 'list-stripe-payouts',
    body: { restaurant_id: restaurantId },
    auth: 'required',
  });
  return {
    hasAccount: res.has_account === true,
    payoutsEnabled: res.payouts_enabled === true,
    availableBalanceCents: res.available_balance_cents,
    pendingBalanceCents: res.pending_balance_cents,
    payouts: (res.payouts ?? []).map((p) => ({
      id: p.id,
      amountCents: p.amount_cents,
      currency: p.currency,
      status: p.status,
      arrivalDateIso: p.arrival_date_iso,
      createdIso: p.created_iso,
    })),
  };
}

// ── update-billing-details ─────────────────────────────────────────────────

export interface BillingDetailsPatch {
  legalName?: string | null;
  billingEmail?: string | null;
  address?: {
    line1?: string | null;
    line2?: string | null;
    city?: string | null;
    province?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
  /**
   * `undefined` = leave tax ID unchanged. `null` = clear it.
   * Otherwise set to the new value (server reconciles add/remove on Stripe).
   */
  taxId?: { type: string; value: string } | null;
}

export async function updateBillingDetails(args: {
  restaurantId: string;
  patch: BillingDetailsPatch;
}): Promise<void> {
  const body: Record<string, unknown> = { restaurant_id: args.restaurantId };
  if (args.patch.legalName !== undefined) body.legal_name = args.patch.legalName;
  if (args.patch.billingEmail !== undefined) body.billing_email = args.patch.billingEmail;
  if (args.patch.address !== undefined) {
    body.address = args.patch.address
      ? {
          line1: args.patch.address.line1,
          line2: args.patch.address.line2,
          city: args.patch.address.city,
          province: args.patch.address.province,
          postal_code: args.patch.address.postalCode,
          country: args.patch.address.country,
        }
      : null;
  }
  if (args.patch.taxId !== undefined) body.tax_id = args.patch.taxId;
  await callEdgeFn<{ ok: true }>({
    fn: 'update-billing-details',
    body,
    auth: 'required',
  });
}
