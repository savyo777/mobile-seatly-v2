// Integration tests for `tryGrantReferralCredit` — the server-side helper
// that slides both restaurants' trial_ends_at forward by 30 days when a
// new owner signs up with someone else's referral code.
//
// Strategy: drive the helper with a hand-rolled, deterministic fake of
// the `admin` Supabase client (just the table/method chains the helper
// actually calls) plus a jest.mock of `./stripe.ts`. No network, no
// database — every assertion is on the recorded calls and the helper's
// return value.

// Mock the Deno-targeted stripe module. The helper imports it as
// `./stripe.ts`; jest.doMock resolves by the same specifier.
const stripeRequestMock = jest.fn();
jest.mock('@/supabase/functions/_shared/stripe', () => ({
  __esModule: true,
  stripeRequest: (...args: unknown[]) => stripeRequestMock(...args),
}));

import { tryGrantReferralCredit } from '@/supabase/functions/_shared/grant-referral-credit';
import { OWNER_REFERRAL_BONUS_DAYS } from '@/supabase/functions/_shared/referral-policy';

// ─── Fake admin client ──────────────────────────────────────────────────
//
// The helper only uses three tables (`restaurants`, `owner_referral_codes`,
// `referral_credit_grants`) and a small subset of supabase-js query-builder
// chains. We implement only what's needed; anything else throws so a test
// that drifts past the supported surface fails loudly instead of silently
// returning `undefined`.

type Restaurant = {
  id: string;
  owner_user_id: string;
  trial_ends_at: string | null;
  stripe_subscription_id: string | null;
  is_active?: boolean;
  created_at?: string;
  referral_credit_granted_at?: string | null;
};

type CodeRow = { code: string; owner_user_id: string };

type AuditRow = {
  referrer_owner_user_id: string;
  referrer_restaurant_id: string;
  referred_restaurant_id: string;
  days_added: number;
  new_trial_ends_at: string;
};

type FakeOptions = {
  restaurants: Restaurant[];
  codes: CodeRow[];
  // Forced errors for specific operations.
  forceErrors?: {
    updateReferredTrial?: boolean;
    markReferredGranted?: boolean;
    updateReferrerTrial?: boolean;
    insertAudit?: boolean;
  };
};

function buildFakeAdmin(opts: FakeOptions) {
  const restaurants = opts.restaurants.map((r) => ({ ...r }));
  const codes = opts.codes.map((c) => ({ ...c }));
  const audits: AuditRow[] = [];
  const updateCalls: Array<{ table: string; patch: Record<string, unknown>; id: string }> = [];

  const restaurantsTable = () => {
    let selectCols: string[] = [];
    let filters: Array<{ col: string; val: unknown }> = [];
    let orderDesc = false;
    let pendingUpdate: Record<string, unknown> | null = null;

    const api: any = {
      select(cols: string) {
        selectCols = cols.split(',').map((c) => c.trim());
        return api;
      },
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return api;
      },
      order(_col: string, options?: { ascending?: boolean }) {
        orderDesc = options?.ascending === false;
        return api;
      },
      limit(_n: number) {
        return api;
      },
      maybeSingle: async () => {
        let rows = restaurants.filter((r) =>
          filters.every((f) => (r as Record<string, unknown>)[f.col] === f.val),
        );
        if (orderDesc) {
          rows = [...rows].sort((a, b) =>
            (b.created_at ?? '').localeCompare(a.created_at ?? ''),
          );
        }
        const row = rows[0] ?? null;
        if (!row) return { data: null, error: null };
        // Project only requested columns to mimic supabase-js.
        const projected: Record<string, unknown> = {};
        for (const c of selectCols) projected[c] = (row as Record<string, unknown>)[c];
        return { data: projected, error: null };
      },
      update(patch: Record<string, unknown>) {
        pendingUpdate = patch;
        // After update(), eq() / select() chain again. Reset filter slate
        // so the update applies only to rows matching subsequent eq()s.
        filters = [];
        const updateApi: any = {
          eq(col: string, val: unknown) {
            filters.push({ col, val });
            return updateApi;
          },
          then(resolve: (v: { error: { message: string } | null }) => void) {
            const matching = restaurants.filter((r) =>
              filters.every((f) => (r as Record<string, unknown>)[f.col] === f.val),
            );
            if (matching.length === 0) {
              resolve({ error: { message: 'no rows matched' } });
              return;
            }
            for (const r of matching) {
              for (const [k, v] of Object.entries(pendingUpdate ?? {})) {
                (r as Record<string, unknown>)[k] = v;
              }
              updateCalls.push({ table: 'restaurants', patch: pendingUpdate ?? {}, id: r.id });
            }
            // Forced-error hooks: identify which update this is by the
            // patch shape.
            if (
              opts.forceErrors?.updateReferredTrial &&
              pendingUpdate &&
              'trial_ends_at' in pendingUpdate &&
              !('referral_credit_granted_at' in pendingUpdate) &&
              matching[0]?.id === opts.restaurants[0].id /* referred is index 0 in our setup */
            ) {
              resolve({ error: { message: 'forced: extend referred trial' } });
              return;
            }
            if (
              opts.forceErrors?.markReferredGranted &&
              pendingUpdate &&
              'referral_credit_granted_at' in pendingUpdate
            ) {
              resolve({ error: { message: 'forced: mark granted' } });
              return;
            }
            if (
              opts.forceErrors?.updateReferrerTrial &&
              pendingUpdate &&
              'trial_ends_at' in pendingUpdate &&
              matching[0]?.id !== opts.restaurants[0].id
            ) {
              resolve({ error: { message: 'forced: extend referrer trial' } });
              return;
            }
            resolve({ error: null });
          },
        };
        return updateApi;
      },
    };
    return api;
  };

  const codesTable = () => {
    let filters: Array<{ col: string; val: unknown }> = [];
    const api: any = {
      select(_cols: string) {
        return api;
      },
      eq(col: string, val: unknown) {
        filters.push({ col, val });
        return api;
      },
      maybeSingle: async () => {
        const row = codes.find((c) =>
          filters.every((f) => (c as Record<string, unknown>)[f.col] === f.val),
        );
        return { data: row ?? null, error: null };
      },
    };
    return api;
  };

  const grantsTable = () => ({
    insert(row: AuditRow) {
      if (opts.forceErrors?.insertAudit) {
        return Promise.resolve({ error: { message: 'forced: audit insert' } });
      }
      audits.push(row);
      return Promise.resolve({ error: null });
    },
  });

  return {
    admin: {
      from(table: string) {
        if (table === 'restaurants') return restaurantsTable();
        if (table === 'owner_referral_codes') return codesTable();
        if (table === 'referral_credit_grants') return grantsTable();
        throw new Error(`fake admin: unsupported table ${table}`);
      },
    },
    state: { restaurants, audits, updateCalls },
  };
}

const REFERRED_ID = '00000000-0000-0000-0000-000000000001';
const REFERRER_ID = '00000000-0000-0000-0000-000000000002';
const REFERRED_OWNER = 'auth-user-referred';
const REFERRER_OWNER = 'auth-user-referrer';
const CODE = 'CNV-OWNER-ABC123';

function defaultRestaurants(overrides: Partial<Restaurant> = {}): Restaurant[] {
  return [
    {
      id: REFERRED_ID,
      owner_user_id: REFERRED_OWNER,
      trial_ends_at: '2026-06-01T00:00:00.000Z',
      stripe_subscription_id: null,
      is_active: true,
      created_at: '2026-05-19T00:00:00.000Z',
      referral_credit_granted_at: null,
      ...overrides,
    },
    {
      id: REFERRER_ID,
      owner_user_id: REFERRER_OWNER,
      trial_ends_at: '2026-07-01T00:00:00.000Z',
      stripe_subscription_id: null,
      is_active: true,
      created_at: '2026-04-01T00:00:00.000Z',
      referral_credit_granted_at: null,
    },
  ];
}

const codes = (): CodeRow[] => [{ code: CODE, owner_user_id: REFERRER_OWNER }];

beforeEach(() => {
  stripeRequestMock.mockReset();
});

describe('tryGrantReferralCredit', () => {
  it('rejects malformed codes without touching the DB', async () => {
    const fake = buildFakeAdmin({ restaurants: defaultRestaurants(), codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: 'not-a-code',
    });
    expect(result).toEqual({ granted: false, reason: 'invalid_code' });
    expect(fake.state.updateCalls).toHaveLength(0);
    expect(stripeRequestMock).not.toHaveBeenCalled();
  });

  it('returns referred_restaurant_missing when the referred row is gone', async () => {
    const fake = buildFakeAdmin({ restaurants: [], codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('referred_restaurant_missing');
  });

  it('is idempotent: already_granted on a re-run', async () => {
    const restaurants = defaultRestaurants();
    restaurants[0].referral_credit_granted_at = '2026-05-19T10:00:00.000Z';
    const fake = buildFakeAdmin({ restaurants, codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result).toEqual({ granted: false, reason: 'already_granted' });
    expect(fake.state.updateCalls).toHaveLength(0);
  });

  it('returns unknown_code when the code is well-formed but not in the DB', async () => {
    const fake = buildFakeAdmin({ restaurants: defaultRestaurants(), codes: [] });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result).toEqual({ granted: false, reason: 'unknown_code' });
  });

  it('rejects self-referral (same auth user owns both restaurants)', async () => {
    const restaurants = defaultRestaurants();
    restaurants[1].owner_user_id = REFERRED_OWNER; // referrer owner == referred owner
    const fake = buildFakeAdmin({
      restaurants,
      codes: [{ code: CODE, owner_user_id: REFERRED_OWNER }],
    });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result).toEqual({ granted: false, reason: 'self_referral' });
    expect(fake.state.updateCalls).toHaveLength(0);
  });

  it('happy path (no Stripe): extends both restaurants by 30 days and writes the audit row', async () => {
    const fake = buildFakeAdmin({ restaurants: defaultRestaurants(), codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });

    expect(result.granted).toBe(true);
    expect(result.daysAdded).toBe(OWNER_REFERRAL_BONUS_DAYS);
    expect(result.referrerCredited).toBe(true);

    // Referred: 2026-06-01 + 30d = 2026-07-01
    expect(result.referredNewTrialEndsAt).toBe('2026-07-01T00:00:00.000Z');
    // Referrer: 2026-07-01 + 30d = 2026-07-31
    expect(result.referrerNewTrialEndsAt).toBe('2026-07-31T00:00:00.000Z');

    const referred = fake.state.restaurants.find((r) => r.id === REFERRED_ID)!;
    const referrer = fake.state.restaurants.find((r) => r.id === REFERRER_ID)!;
    expect(referred.trial_ends_at).toBe('2026-07-01T00:00:00.000Z');
    expect(referred.referral_credit_granted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(referrer.trial_ends_at).toBe('2026-07-31T00:00:00.000Z');

    expect(fake.state.audits).toHaveLength(1);
    expect(fake.state.audits[0]).toMatchObject({
      referrer_owner_user_id: REFERRER_OWNER,
      referrer_restaurant_id: REFERRER_ID,
      referred_restaurant_id: REFERRED_ID,
      days_added: OWNER_REFERRAL_BONUS_DAYS,
      new_trial_ends_at: '2026-07-31T00:00:00.000Z',
    });

    expect(stripeRequestMock).not.toHaveBeenCalled();
  });

  it('uses now() as the base when trial_ends_at is already in the past', async () => {
    const restaurants = defaultRestaurants({
      trial_ends_at: '2020-01-01T00:00:00.000Z', // long expired
    });
    const fake = buildFakeAdmin({ restaurants, codes: codes() });
    const before = Date.now();
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    const after = Date.now();

    expect(result.granted).toBe(true);
    const newEnd = new Date(result.referredNewTrialEndsAt!).getTime();
    const lowerBound = before + (OWNER_REFERRAL_BONUS_DAYS - 1) * 86_400_000;
    const upperBound = after + (OWNER_REFERRAL_BONUS_DAYS + 1) * 86_400_000;
    expect(newEnd).toBeGreaterThan(lowerBound);
    expect(newEnd).toBeLessThan(upperBound);
  });

  it('pushes Stripe trial_end with proration_behavior=none when subscriptions exist', async () => {
    const restaurants = defaultRestaurants();
    restaurants[0].stripe_subscription_id = 'sub_referred';
    restaurants[1].stripe_subscription_id = 'sub_referrer';
    stripeRequestMock.mockResolvedValue({});

    const fake = buildFakeAdmin({ restaurants, codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });

    expect(result.granted).toBe(true);
    expect(result.referrerCredited).toBe(true);
    expect(stripeRequestMock).toHaveBeenCalledTimes(2);
    expect(stripeRequestMock).toHaveBeenNthCalledWith(1, 'subscriptions/sub_referred', {
      trial_end: String(Math.floor(new Date('2026-07-01T00:00:00.000Z').getTime() / 1000)),
      proration_behavior: 'none',
    });
    expect(stripeRequestMock).toHaveBeenNthCalledWith(2, 'subscriptions/sub_referrer', {
      trial_end: String(Math.floor(new Date('2026-07-31T00:00:00.000Z').getTime() / 1000)),
      proration_behavior: 'none',
    });
  });

  it('blocks the grant when Stripe fails on the referred side (the user-facing side must not get a half-applied bonus)', async () => {
    const restaurants = defaultRestaurants();
    restaurants[0].stripe_subscription_id = 'sub_referred';
    stripeRequestMock.mockRejectedValueOnce(new Error('stripe down'));

    const fake = buildFakeAdmin({ restaurants, codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result).toEqual({ granted: false, reason: 'stripe_update_failed_referred' });

    // No DB changes should have landed.
    const referred = fake.state.restaurants.find((r) => r.id === REFERRED_ID)!;
    expect(referred.trial_ends_at).toBe('2026-06-01T00:00:00.000Z');
    expect(referred.referral_credit_granted_at).toBeNull();
    expect(fake.state.audits).toHaveLength(0);
  });

  it('still credits the referred side when Stripe fails on the referrer side (best-effort referrer)', async () => {
    const restaurants = defaultRestaurants();
    restaurants[0].stripe_subscription_id = null; // referred has no sub → no stripe call for them
    restaurants[1].stripe_subscription_id = 'sub_referrer';
    stripeRequestMock.mockRejectedValueOnce(new Error('stripe boom on referrer'));

    const fake = buildFakeAdmin({ restaurants, codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });

    expect(result.granted).toBe(true);
    expect(result.referrerCredited).toBe(false);
    expect(result.referredNewTrialEndsAt).toBe('2026-07-01T00:00:00.000Z');
    expect(result.referrerNewTrialEndsAt).toBeUndefined();

    // Referred row got both the trial extension and the granted marker.
    const referred = fake.state.restaurants.find((r) => r.id === REFERRED_ID)!;
    expect(referred.trial_ends_at).toBe('2026-07-01T00:00:00.000Z');
    expect(referred.referral_credit_granted_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    // Referrer row was NOT extended.
    const referrer = fake.state.restaurants.find((r) => r.id === REFERRER_ID)!;
    expect(referrer.trial_ends_at).toBe('2026-07-01T00:00:00.000Z');
    // Audit row is not written when the referrer extension didn't land.
    expect(fake.state.audits).toHaveLength(0);
  });

  it('credits the referred side and reports referrerCredited=false when the referrer has no active restaurant', async () => {
    // Only the referred restaurant exists; the code resolves to a user
    // who has no active restaurant.
    const restaurants: Restaurant[] = [
      {
        id: REFERRED_ID,
        owner_user_id: REFERRED_OWNER,
        trial_ends_at: '2026-06-01T00:00:00.000Z',
        stripe_subscription_id: null,
        is_active: true,
        created_at: '2026-05-19T00:00:00.000Z',
        referral_credit_granted_at: null,
      },
    ];
    const fake = buildFakeAdmin({ restaurants, codes: codes() });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });

    expect(result.granted).toBe(true);
    expect(result.referrerCredited).toBe(false);
    expect(result.referredNewTrialEndsAt).toBe('2026-07-01T00:00:00.000Z');
    expect(fake.state.audits).toHaveLength(0);
  });

  it("doesn't roll back when the audit insert fails — the trial extensions are still load-bearing", async () => {
    const fake = buildFakeAdmin({
      restaurants: defaultRestaurants(),
      codes: codes(),
      forceErrors: { insertAudit: true },
    });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result.granted).toBe(true);
    expect(result.referrerCredited).toBe(true);
    expect(fake.state.audits).toHaveLength(0);

    // Both rows extended even though audit failed.
    const referred = fake.state.restaurants.find((r) => r.id === REFERRED_ID)!;
    const referrer = fake.state.restaurants.find((r) => r.id === REFERRER_ID)!;
    expect(referred.trial_ends_at).toBe('2026-07-01T00:00:00.000Z');
    expect(referrer.trial_ends_at).toBe('2026-07-31T00:00:00.000Z');
  });

  it('fails closed with db_write_failed_referred if the referred-side update fails', async () => {
    const fake = buildFakeAdmin({
      restaurants: defaultRestaurants(),
      codes: codes(),
      forceErrors: { updateReferredTrial: true },
    });
    const result = await tryGrantReferralCredit(fake.admin as any, {
      referredRestaurantId: REFERRED_ID,
      referredByCode: CODE,
    });
    expect(result).toEqual({ granted: false, reason: 'db_write_failed_referred' });
    expect(fake.state.audits).toHaveLength(0);
  });
});
