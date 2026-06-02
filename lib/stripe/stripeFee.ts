/**
 * Stripe fee math — mobile mirror of the canonical "Option B" diner-charge model.
 *
 * SOURCE OF TRUTH (keep this byte-for-byte equivalent — do not let it drift):
 *   - server: supabase/functions/_shared/stripe-fee.ts
 *   - shared: packages/mobile-shared/src/pricing/dinerCharge.ts (web ↔ mobile mirror)
 *   - web UI: apps/web/src/lib/stripe-fee.ts (re-exports the shared package)
 *
 * The diner pays the deposit / pre-order PLUS two visible add-on fees:
 *   1. Cenaiva platform fee — 2% of FOOD only (not tax, not tip)
 *   2. Stripe processing fee — 2.9% + 30¢ CAD, grossed up off the top
 *
 * Total charged = food + tax + cenaivaFee + processingFee.
 *   cenaivaFee     = max(round(foodCents * 0.02), 1)   // commission on food only
 *   subtotal       = foodCents + taxCents + cenaivaFee
 *   dinerTotal     = ceil((subtotal + 30) / 0.971)      // grossed up for Stripe
 *   processingFee  = dinerTotal − subtotal
 *   applicationFee = cenaivaFee + processingFee         // application_fee_amount on the PI
 *
 * Restaurant nets food + tax (100%); Cenaiva nets exactly cenaivaFee.
 *
 * Note: on the holds happy-path the SERVER recomputes this and binds via hold_id,
 * so these client-side values are display-only there. Callers MUST still send
 * `amount_cents = food` and `tax_cents` separately so the server can split them —
 * folding tax into the food base over-commissions the restaurant and trips the
 * server's `amount_mismatch` guard.
 *
 * Worked examples (food base, tax = 0):
 *   $20 food → diner pays $21.32 (platform $0.40, processing $0.92)
 *   $40 food → diner pays $42.33 (platform $0.80, processing $1.53)
 *   $100 food → diner pays $105.36 (platform $2.00, processing $3.36)
 */

/** Stripe's per-charge percent fee. 1 - 0.029 = 0.971 (the gross-up denominator). */
export const STRIPE_FEE_PERCENT = 0.029;
/** Stripe's flat per-charge fee in cents ($0.30 CAD). */
export const STRIPE_FEE_FIXED_CENTS = 30;
/** Cenaiva's platform fee — 2% of the FOOD portion only (not tax, not tip). */
export const PLATFORM_FEE_PERCENT = 0.02;

export interface DinerCharge {
  /** Food-only portion (commission base: pre-order subtotal + deposit). */
  foodCents: number;
  /** Tax portion (passes through to the restaurant, no commission). */
  taxCents: number;
  /** Restaurant's net = foodCents + taxCents. */
  baseCents: number;
  /** Cenaiva platform fee — 2% of food only. Visible line item. */
  cenaivaFeeCents: number;
  /** Stripe processing fee — visible line item. */
  processingFeeCents: number;
  /** What the diner's card is charged: food + tax + cenaivaFee + processingFee. */
  dinerTotalCents: number;
  /** `application_fee_amount` on the PaymentIntent = cenaivaFee + processingFee. */
  applicationFeeCents: number;
  /** Always true under Option B — kept for callers/UI that check the flag. */
  dinerPaysFee: boolean;
}

/**
 * Compute the diner-pays-all-fees charge.
 *
 * @param foodCents the commission-bearing portion (pre-order subtotal + deposit)
 * @param taxCents  the HST/GST that passes through to the restaurant (no commission)
 *
 * Caller passes `dinerTotalCents` as the PaymentIntent `amount` and
 * `applicationFeeCents` as `application_fee_amount`. The cart UI shows four
 * lines (food · tax · cenaivaFeeCents · processingFeeCents) summing to
 * `dinerTotalCents`.
 */
export function computeDinerCharge(foodCents: number, taxCents: number = 0): DinerCharge {
  const food = Math.max(0, Math.round(Number.isFinite(foodCents) ? foodCents : 0));
  const tax = Math.max(0, Math.round(Number.isFinite(taxCents) ? taxCents : 0));
  if (food + tax <= 0) {
    return {
      foodCents: 0,
      taxCents: 0,
      baseCents: 0,
      cenaivaFeeCents: 0,
      processingFeeCents: 0,
      dinerTotalCents: 0,
      applicationFeeCents: 0,
      dinerPaysFee: false,
    };
  }
  // Stripe rejects application_fee_amount < 1¢; clamp at 1¢ for tiny food bases.
  const cenaivaFee = food > 0 ? Math.max(Math.round(food * PLATFORM_FEE_PERCENT), 1) : 0;
  const subtotal = food + tax + cenaivaFee;
  // Gross up so Stripe's 2.9% + 30¢ comes off the top of dinerTotal, leaving
  // exactly `subtotal` (= food + tax + cenaivaFee) to settle to the restaurant.
  const dinerTotal = Math.ceil((subtotal + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT));
  const processingFee = dinerTotal - subtotal;

  return {
    foodCents: food,
    taxCents: tax,
    baseCents: food + tax,
    cenaivaFeeCents: cenaivaFee,
    processingFeeCents: processingFee,
    dinerTotalCents: dinerTotal,
    applicationFeeCents: cenaivaFee + processingFee,
    dinerPaysFee: true,
  };
}

/**
 * Format helpers used by checkout UI. Centralized here so the cart, the
 * PaymentSheet preview, and the receipt screen all render the same
 * dollar string for the same cent value.
 */
export function formatCents(cents: number): string {
  const n = Number.isFinite(cents) ? cents : 0;
  const dollars = n / 100;
  // CAD-tuned; non-localized for v1 per doc §28 (Cenaiva is CAD-only).
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: 'CAD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(dollars);
}
