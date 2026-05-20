// Stripe fee math — locks the threshold + gross-up policy that BOTH the
// mobile client AND the server's _shared/stripe-fee.ts implement. If these
// drift, PaymentIntents fail Stripe verification because the diner total
// won't match what the server expects.
//
// Per MOBILE_STRIPE_TRANSFER.md §2.

import {
  ABSORB_FEE_THRESHOLD_CENTS,
  CENAIVA_APPLICATION_FEE_PERCENT,
  STRIPE_FEE_FIXED_CENTS,
  STRIPE_FEE_PERCENT,
  computeDinerCharge,
  formatCents,
} from '../../lib/stripe/stripeFee';

describe('computeDinerCharge', () => {
  describe('boundary / sanity', () => {
    it('returns zeros for non-positive bases', () => {
      expect(computeDinerCharge(0)).toEqual({
        baseCents: 0,
        dinerTotalCents: 0,
        processingFeeCents: 0,
        applicationFeeCents: 0,
        dinerPaysFee: false,
      });
      expect(computeDinerCharge(-100)).toEqual({
        baseCents: 0,
        dinerTotalCents: 0,
        processingFeeCents: 0,
        applicationFeeCents: 0,
        dinerPaysFee: false,
      });
      expect(computeDinerCharge(Number.NaN).baseCents).toBe(0);
      expect(computeDinerCharge(Number.POSITIVE_INFINITY).baseCents).toBe(0);
    });

    it('rounds non-integer bases', () => {
      const out = computeDinerCharge(1199.6);
      expect(out.baseCents).toBe(1200);
      expect(out.dinerPaysFee).toBe(false); // 1200 hits absorb threshold
    });
  });

  describe('below threshold — diner pays Stripe fee', () => {
    it('grosses up a $5 deposit', () => {
      // base = 500; grossed = ceil((500 + 30) / 0.971) = ceil(545.83) = 546
      const out = computeDinerCharge(500);
      expect(out.baseCents).toBe(500);
      expect(out.dinerTotalCents).toBe(546);
      expect(out.processingFeeCents).toBe(46);
      expect(out.applicationFeeCents).toBe(28); // round(500 * 0.055) = 28
      expect(out.dinerPaysFee).toBe(true);
    });

    it('grosses up a $1 minimum charge with the 1¢ application-fee floor', () => {
      const out = computeDinerCharge(100);
      // base 100, grossed = ceil((100 + 30) / 0.971) = ceil(133.88) = 134
      expect(out.baseCents).toBe(100);
      expect(out.dinerTotalCents).toBe(134);
      expect(out.processingFeeCents).toBe(34);
      // round(100 * 0.055) = 6, well above the 1¢ floor
      expect(out.applicationFeeCents).toBe(6);
      expect(out.dinerPaysFee).toBe(true);
    });

    it('enforces ≥ 1¢ application fee on very small charges', () => {
      const out = computeDinerCharge(10); // $0.10 — pathological but possible
      // round(10 * 0.055) = 1 (already exactly the floor)
      expect(out.applicationFeeCents).toBe(1);
      // base 10; grossed = ceil(40 / 0.971) = ceil(41.19) = 42
      expect(out.dinerTotalCents).toBe(42);
    });

    it('one cent below the threshold still grosses up', () => {
      const out = computeDinerCharge(ABSORB_FEE_THRESHOLD_CENTS - 1);
      expect(out.dinerPaysFee).toBe(true);
      // base 1199; grossed = ceil((1199 + 30) / 0.971) = ceil(1265.70) = 1266
      expect(out.dinerTotalCents).toBe(1266);
      expect(out.processingFeeCents).toBe(67);
    });

    it('the gross-up math actually covers Stripe’s fee', () => {
      // For every grossed-up amount the formula should yield:
      //   grossed - (grossed * 0.029 + 30) ≥ base
      // i.e. after Stripe’s cut, the merchant still nets ≥ base.
      const cases = [100, 250, 500, 800, 1100, 1199];
      for (const base of cases) {
        const { dinerTotalCents } = computeDinerCharge(base);
        const stripeFee = dinerTotalCents * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_CENTS;
        const net = dinerTotalCents - stripeFee;
        expect(net).toBeGreaterThanOrEqual(base - 0.0001); // tiny FP slack
      }
    });
  });

  describe('at or above threshold — Cenaiva absorbs the fee', () => {
    it('right at the threshold ($12)', () => {
      const out = computeDinerCharge(ABSORB_FEE_THRESHOLD_CENTS);
      expect(out.baseCents).toBe(1200);
      expect(out.dinerTotalCents).toBe(1200);
      expect(out.processingFeeCents).toBe(0);
      expect(out.applicationFeeCents).toBe(66); // round(1200 * 0.055)
      expect(out.dinerPaysFee).toBe(false);
    });

    it('larger deposit — diner pays exactly the base', () => {
      const out = computeDinerCharge(5000); // $50 deposit
      expect(out.dinerTotalCents).toBe(5000);
      expect(out.processingFeeCents).toBe(0);
      expect(out.applicationFeeCents).toBe(275); // round(5000 * 0.055)
      expect(out.dinerPaysFee).toBe(false);
    });

    it('large order — application fee is 5.5% of the BASE, not the grossed-up total', () => {
      // Verifies footgun #11 from the doc: app fee must be off the BASE.
      const base = 100_00; // $100
      const out = computeDinerCharge(base);
      expect(out.applicationFeeCents).toBe(Math.round(base * CENAIVA_APPLICATION_FEE_PERCENT));
      expect(out.dinerTotalCents).toBe(base);
    });
  });
});

describe('formatCents', () => {
  it('formats CAD with two decimal places', () => {
    expect(formatCents(1234)).toMatch(/12\.34/);
    expect(formatCents(0)).toMatch(/0\.00/);
  });

  it('handles non-finite input gracefully', () => {
    expect(formatCents(Number.NaN)).toMatch(/0\.00/);
  });
});
