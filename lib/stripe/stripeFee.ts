/**
 * Stripe fee math — mobile mirror of the backend canonical implementation.
 *
 * Source of truth: `supabase/functions/_shared/stripe-fee.ts` (web sister
 * repo). Per STRIPE_INTEGRATION_HANDOFF.md §3.1 the math is Option B:
 *
 *   const cenaivaFeeCents = ceil(base * 0.055);
 *   const subtotal        = base + cenaivaFeeCents;
 *   const dinerTotalCents = ceil((subtotal + 30) / 0.971);
 *   const processingFee   = dinerTotalCents - subtotal;
 *   const applicationFee  = cenaivaFeeCents;  // routes to platform
 *
 * Every diner-facing PI passes through this exact formula on both
 * client and server. If they diverge, Stripe rejects the PaymentIntent
 * with "amount does not match" — and even if it didn't reject,
 * MOBILE_STRIPE_TRANSFER.md §17.5 makes drift a launch-blocker because
 * diners see different prices on web vs mobile for the same booking.
 *
 * **No "absorb above $12 threshold" anymore.** The earlier mobile
 * implementation kept that policy when web moved to Option B; this file
 * was the drift. As of 2026-05-21, mobile always shows three line items:
 * Deposit · Platform fee (5.5%) · Processing fee · Total, with the
 * disclosure that platform + processing fees are non-refundable.
 *
 * Worked examples (from STRIPE_UPDATES.md):
 *   $5 base   → diner pays $5.84  (platform $0.28, processing $0.56)
 *   $10 base  → diner pays $11.18 (platform $0.55, processing $0.63)
 *   $20 base  → diner pays $22.05 (platform $1.10, processing $0.95)
 *   $40 base  → diner pays $43.77 (platform $2.20, processing $1.57)
 *   $80 base  → diner pays $87.21 (platform $4.40, processing $2.81)
 *   $100 base → diner pays $108.96 (platform $5.50, processing $3.46)
 */

/** Stripe's per-charge percent fee. 0.971 = 1 - 0.029 (the gross-up denominator). */
export const STRIPE_FEE_PERCENT = 0.029;
/** Stripe's flat per-charge fee in cents. */
export const STRIPE_FEE_FIXED_CENTS = 30;
/** Cenaiva's platform fee — 5.5% of the BASE amount. */
export const CENAIVA_APPLICATION_FEE_PERCENT = 0.055;

/**
 * Retained for legacy callers ONLY — Option B does not use a threshold.
 * Anything that branches on this constant is using the old absorption
 * model and should be updated to always show the 3-line cart.
 *
 * @deprecated removed in the Option B alignment 2026-05-21; kept
 * exported as 0 so existing imports don't break.
 */
export const ABSORB_FEE_THRESHOLD_CENTS = 0;

export interface DinerCharge {
  /** Original base (deposit / preorder total / order subtotal+tax+tip). */
  baseCents: number;
  /** What the diner actually pays — base + platform fee + Stripe gross-up. */
  dinerTotalCents: number;
  /** Stripe's percent + flat fee, grossed up so the merchant nets `base`. */
  processingFeeCents: number;
  /** Cenaiva's cut. Always 5.5% of BASE (not the grossed-up total). */
  applicationFeeCents: number;
  /**
   * Always true under Option B — the diner always covers both fees.
   * Retained for callers that hide the Processing fee line when 0.
   */
  dinerPaysFee: boolean;
}

export function computeDinerCharge(baseCents: number): DinerCharge {
  if (!Number.isFinite(baseCents) || baseCents <= 0) {
    return {
      baseCents: 0,
      dinerTotalCents: 0,
      processingFeeCents: 0,
      applicationFeeCents: 0,
      dinerPaysFee: false,
    };
  }

  const base = Math.max(0, Math.round(baseCents));
  // ceil(base * 0.055) — diner sees the platform fee rounded UP so the
  // restaurant always nets exactly `base` after the application fee.
  // Floor at 1¢ so a $0.01 base still routes a non-zero app fee.
  const applicationFee = Math.max(Math.ceil(base * CENAIVA_APPLICATION_FEE_PERCENT), 1);

  // Subtotal = base + platform fee. This is what gets grossed up so
  // BOTH fees survive the Stripe per-charge deduction; without the
  // gross-up Stripe takes its cut out of (base + platform fee), which
  // would either shortchange the restaurant or eat the platform fee.
  const subtotal = base + applicationFee;
  const dinerTotal = Math.ceil((subtotal + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT));
  const processingFee = dinerTotal - subtotal;

  return {
    baseCents: base,
    dinerTotalCents: dinerTotal,
    processingFeeCents: processingFee,
    applicationFeeCents: applicationFee,
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
