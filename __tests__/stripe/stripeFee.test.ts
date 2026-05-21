// Stripe fee math — locks the Option B gross-up policy that BOTH the
// mobile client AND the server's _shared/stripe-fee.ts implement.
// Per STRIPE_INTEGRATION_HANDOFF.md §3.1 + STRIPE_UPDATES.md, every
// diner-facing PI uses the same formula:
//
//   cenaivaFee = ceil(base * 0.055)
//   subtotal   = base + cenaivaFee
//   dinerTotal = ceil((subtotal + 30) / 0.971)
//   processing = dinerTotal - subtotal
//
// If client and server diverge, Stripe rejects the PI with
// "amount does not match" and diners see different totals on web vs
// mobile (MOBILE_STRIPE_TRANSFER.md §17.5 hard rule).

import {
  CENAIVA_APPLICATION_FEE_PERCENT,
  STRIPE_FEE_FIXED_CENTS,
  STRIPE_FEE_PERCENT,
  computeDinerCharge,
  formatCents,
} from '../../lib/stripe/stripeFee';

describe('computeDinerCharge (Option B — always gross-up)', () => {
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
      // Under Option B everything > 0 grosses up — no threshold branch
      expect(out.dinerPaysFee).toBe(true);
    });
  });

  describe('worked examples (canonical Option B formula in IEEE-754 JS)', () => {
    // The STRIPE_UPDATES.md table has a few rows that differ by ±1¢
    // from what this formula actually produces in JavaScript (the
    // table appears to have been computed with slightly different
    // intermediate rounding). The verified production PI is the
    // source of truth — pi_3TZXkN… for a $20 base charged
    // amount=2204¢, application_fee_amount=110¢ (per
    // STRIPE_INTEGRATION_HANDOFF.md §13). My formula matches that
    // PI exactly, so I lock against the computed values below.

    it('$5 base → $5.75 total', () => {
      const out = computeDinerCharge(500);
      expect(out.applicationFeeCents).toBe(28); // ceil(500*0.055)
      expect(out.dinerTotalCents).toBe(575); // ceil(558/0.971) ≈ 574.665
      expect(out.processingFeeCents).toBe(47); // 575 - 528
    });

    it('$10 base → $11.18 total', () => {
      const out = computeDinerCharge(1000);
      expect(out.applicationFeeCents).toBe(55); // ceil(1000*0.055)
      expect(out.dinerTotalCents).toBe(1118); // ceil(1085/0.971)
      expect(out.processingFeeCents).toBe(63);
    });

    it('$20 base → $22.04 total (matches verified PI pi_3TZXkN…)', () => {
      const out = computeDinerCharge(2000);
      expect(out.applicationFeeCents).toBe(110); // ceil(2000*0.055)
      expect(out.dinerTotalCents).toBe(2204); // ceil(2140/0.971)
      expect(out.processingFeeCents).toBe(94);
    });

    it('$40 base → $43.77 total (party-4 MICKY deposit)', () => {
      const out = computeDinerCharge(4000);
      expect(out.applicationFeeCents).toBe(220); // ceil(4000*0.055)
      expect(out.dinerTotalCents).toBe(4377); // ceil(4250/0.971)
      expect(out.processingFeeCents).toBe(157);
    });

    it('$80 base → $87.23 total', () => {
      const out = computeDinerCharge(8000);
      expect(out.applicationFeeCents).toBe(440); // ceil(8000*0.055)
      expect(out.dinerTotalCents).toBe(8723);
      expect(out.processingFeeCents).toBe(283);
    });

    it('$100 base → $108.96 total', () => {
      const out = computeDinerCharge(10_000);
      expect(out.applicationFeeCents).toBe(550); // ceil(10000*0.055)
      expect(out.dinerTotalCents).toBe(10_896);
      expect(out.processingFeeCents).toBe(346);
    });
  });

  describe('invariants', () => {
    it('application fee is always 5.5% of BASE (not the grossed-up total)', () => {
      // Verifies footgun #11: app fee must be off the BASE.
      const cases = [100, 250, 500, 1000, 2000, 4000, 10_000, 50_000];
      for (const base of cases) {
        const out = computeDinerCharge(base);
        const expected = Math.max(Math.ceil(base * CENAIVA_APPLICATION_FEE_PERCENT), 1);
        expect(out.applicationFeeCents).toBe(expected);
      }
    });

    it('gross-up math actually covers Stripe’s fee', () => {
      // For every grossed-up amount the formula should yield:
      //   grossed - (grossed * 0.029 + 30) ≥ base + applicationFee
      // i.e. after Stripe's cut, the merchant nets at least the
      // base + platform fee (so both get paid in full).
      const cases = [100, 250, 500, 1199, 1200, 1500, 2000, 4000, 10_000];
      for (const base of cases) {
        const out = computeDinerCharge(base);
        const stripeFee = out.dinerTotalCents * STRIPE_FEE_PERCENT + STRIPE_FEE_FIXED_CENTS;
        const net = out.dinerTotalCents - stripeFee;
        expect(net).toBeGreaterThanOrEqual(base + out.applicationFeeCents - 0.5); // FP slack
      }
    });

    it('enforces ≥ 1¢ application fee on very small charges', () => {
      const out = computeDinerCharge(10); // $0.10 — pathological but possible
      // ceil(10 * 0.055) = ceil(0.55) = 1 — already exactly the floor
      expect(out.applicationFeeCents).toBe(1);
    });

    it('dinerPaysFee is always true for positive bases under Option B', () => {
      for (const base of [1, 100, 1199, 1200, 5000, 100_000]) {
        expect(computeDinerCharge(base).dinerPaysFee).toBe(true);
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
