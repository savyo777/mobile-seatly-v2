/**
 * Stripe fee math — single mobile source of truth.
 *
 * Mirrors the web app's `apps/web/src/lib/stripe-fee.ts` AND the server's
 * `supabase/functions/_shared/stripe-fee.ts` byte-for-byte (the web team
 * verified parity 2026-05-20 — see MOBILE_STRIPE_TRANSFER.md §2). If the
 * web version drifts, this must too — both client AND server must agree
 * or Stripe rejects PaymentIntents that disagree on the diner total.
 *
 * Threshold-based policy:
 *   - Below $12 base: diner pays the Stripe processing fee on top
 *     (gross-up). Cenaiva would lose money absorbing 2.9% + $0.30 on a
 *     $5 deposit.
 *   - At or above $12 base: Cenaiva absorbs the Stripe fee (5.5%
 *     application fee covers it comfortably).
 *
 * The 5.5% application fee is always charged on the BASE amount, never
 * the grossed-up total — otherwise diners would pay 5.5% on the Stripe
 * fee too, which is per-doc footgun #11.
 *
 * Mobile UI rule: when `processingFeeCents > 0`, show a "Processing fee"
 * line on the cart. When `== 0`, hide the line entirely.
 */

export const ABSORB_FEE_THRESHOLD_CENTS = 1200; // $12 CAD
export const STRIPE_FEE_PERCENT = 0.029;
export const STRIPE_FEE_FIXED_CENTS = 30;
export const CENAIVA_APPLICATION_FEE_PERCENT = 0.055;

export interface DinerCharge {
  /** Original base (deposit / preorder total / order subtotal+tax+tip). */
  baseCents: number;
  /** What the diner actually pays — base + processing fee gross-up if below threshold. */
  dinerTotalCents: number;
  /** Gross-up amount. 0 when base >= threshold. */
  processingFeeCents: number;
  /** Cenaiva's cut. Always 5.5% of BASE (not the grossed-up total). */
  applicationFeeCents: number;
  /** True when the diner is being asked to cover Stripe's fee. UI shows the "Processing fee" line. */
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
  const applicationFee = Math.max(Math.round(base * CENAIVA_APPLICATION_FEE_PERCENT), 1);

  if (base >= ABSORB_FEE_THRESHOLD_CENTS) {
    // Cenaiva absorbs the Stripe fee. Diner pays base, period.
    return {
      baseCents: base,
      dinerTotalCents: base,
      processingFeeCents: 0,
      applicationFeeCents: applicationFee,
      dinerPaysFee: false,
    };
  }

  // Gross-up formula from the doc: ceil((base + 30) / 0.971).
  // 0.971 = 1 - 0.029, the Stripe percent fee. +30 covers the $0.30 fixed.
  const grossed = Math.ceil((base + STRIPE_FEE_FIXED_CENTS) / (1 - STRIPE_FEE_PERCENT));
  return {
    baseCents: base,
    dinerTotalCents: grossed,
    processingFeeCents: grossed - base,
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
