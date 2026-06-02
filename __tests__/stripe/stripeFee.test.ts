// Stripe fee math — locks the canonical "Option B" diner-charge model that
// BOTH the mobile client AND the server's _shared/stripe-fee.ts implement
// (mirror of packages/mobile-shared/src/pricing/dinerCharge.ts):
//
//   cenaivaFee = max(round(food * 0.02), 1)   // 2% of FOOD only (not tax)
//   subtotal   = food + tax + cenaivaFee
//   dinerTotal = ceil((subtotal + 30) / 0.971)
//   processing = dinerTotal - subtotal
//   appFee     = cenaivaFee + processing
//
// If client and server diverge, Stripe rejects the PI with "amount does not
// match" and diners see different totals on web vs mobile. The single most
// important regression guard here: tax is NOT part of the commission base.

import {
  PLATFORM_FEE_PERCENT,
  STRIPE_FEE_FIXED_CENTS,
  STRIPE_FEE_PERCENT,
  computeDinerCharge,
  formatCents,
} from '../../lib/stripe/stripeFee';

describe('computeDinerCharge (Option B — 2% of food, always gross-up)', () => {
  describe('boundary / sanity', () => {
    it('returns zeros for non-positive bases', () => {
      expect(computeDinerCharge(0)).toEqual({
        foodCents: 0,
        taxCents: 0,
        baseCents: 0,
        cenaivaFeeCents: 0,
        processingFeeCents: 0,
        dinerTotalCents: 0,
        applicationFeeCents: 0,
        dinerPaysFee: false,
      });
      expect(computeDinerCharge(-100).foodCents).toBe(0);
      expect(computeDinerCharge(Number.NaN).foodCents).toBe(0);
      expect(computeDinerCharge(Number.POSITIVE_INFINITY).foodCents).toBe(0);
    });

    it('rounds non-integer food/tax', () => {
      const out = computeDinerCharge(1199.6, 119.4);
      expect(out.foodCents).toBe(1200);
      expect(out.taxCents).toBe(119);
      expect(out.dinerPaysFee).toBe(true);
    });

    it('defaults tax to 0 when omitted', () => {
      expect(computeDinerCharge(2000)).toEqual(computeDinerCharge(2000, 0));
    });
  });

  describe('worked examples (food only, tax = 0)', () => {
    it('$5 food → $5.57 total', () => {
      const out = computeDinerCharge(500);
      expect(out.cenaivaFeeCents).toBe(10); // round(500*0.02)
      expect(out.dinerTotalCents).toBe(557);
      expect(out.processingFeeCents).toBe(47);
      expect(out.applicationFeeCents).toBe(57); // cenaivaFee + processing
    });

    it('$20 food → $21.32 total', () => {
      const out = computeDinerCharge(2000);
      expect(out.cenaivaFeeCents).toBe(40);
      expect(out.dinerTotalCents).toBe(2132);
      expect(out.processingFeeCents).toBe(92);
      expect(out.applicationFeeCents).toBe(132);
    });

    it('$40 food → $42.33 total', () => {
      const out = computeDinerCharge(4000);
      expect(out.cenaivaFeeCents).toBe(80);
      expect(out.dinerTotalCents).toBe(4233);
      expect(out.processingFeeCents).toBe(153);
      expect(out.applicationFeeCents).toBe(233);
    });

    it('$100 food → $105.36 total', () => {
      const out = computeDinerCharge(10_000);
      expect(out.cenaivaFeeCents).toBe(200);
      expect(out.dinerTotalCents).toBe(10_536);
      expect(out.processingFeeCents).toBe(336);
      expect(out.applicationFeeCents).toBe(536);
    });
  });

  describe('tax passes through with NO commission (the §1/§6 money bug)', () => {
    it('$40 food + $5.20 tax → fee is 2% of food only, tax untouched', () => {
      const out = computeDinerCharge(4000, 520);
      expect(out.foodCents).toBe(4000);
      expect(out.taxCents).toBe(520);
      expect(out.baseCents).toBe(4520); // restaurant nets food + tax
      expect(out.cenaivaFeeCents).toBe(80); // 2% of 4000 — NOT of 4520
      expect(out.dinerTotalCents).toBe(4769);
      expect(out.processingFeeCents).toBe(169);
      expect(out.applicationFeeCents).toBe(249);
    });

    it('folding tax into the food base over-charges commission (regression guard)', () => {
      const split = computeDinerCharge(4000, 520);
      const folded = computeDinerCharge(4520, 0); // the OLD (buggy) behavior
      expect(folded.cenaivaFeeCents).toBeGreaterThan(split.cenaivaFeeCents);
    });
  });

  describe('invariants', () => {
    it('cenaiva fee is always round(2% of FOOD), floored at 1¢', () => {
      const cases = [100, 250, 500, 1000, 2000, 4000, 10_000, 50_000];
      for (const food of cases) {
        const out = computeDinerCharge(food);
        const expected = Math.max(Math.round(food * PLATFORM_FEE_PERCENT), 1);
        expect(out.cenaivaFeeCents).toBe(expected);
      }
    });

    it('application fee equals cenaivaFee + processing fee', () => {
      for (const [food, tax] of [[500, 0], [2000, 260], [4000, 520], [10_000, 1300]]) {
        const out = computeDinerCharge(food, tax);
        expect(out.applicationFeeCents).toBe(out.cenaivaFeeCents + out.processingFeeCents);
      }
    });

    it('gross-up covers Stripe’s fee so the restaurant nets food + tax + cenaivaFee', () => {
      const cases = [[100, 0], [500, 65], [2000, 260], [4000, 520], [10_000, 1300]];
      for (const [food, tax] of cases) {
        const out = computeDinerCharge(food, tax);
        const stripeFee = out.dinerTotalCents * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_CENTS;
        const net = out.dinerTotalCents - stripeFee;
        expect(net).toBeGreaterThanOrEqual(food + tax + out.cenaivaFeeCents - 0.5); // FP slack
      }
    });

    it('enforces ≥ 1¢ cenaiva fee on very small food bases', () => {
      expect(computeDinerCharge(10).cenaivaFeeCents).toBe(1); // round(0.2)=0 → floored to 1
      expect(computeDinerCharge(25).cenaivaFeeCents).toBe(1);
    });

    it('dinerPaysFee is always true for positive bases', () => {
      for (const food of [1, 100, 1200, 5000, 100_000]) {
        expect(computeDinerCharge(food).dinerPaysFee).toBe(true);
      }
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
