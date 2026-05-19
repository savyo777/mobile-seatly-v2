// @ts-nocheck
// Owner referral credit grant — server-side helper.
//
// Called from register-restaurant-owner after a new restaurant row is
// inserted with a `referred_by_code`. Idempotent: a re-run for the same
// referred_restaurant_id is a no-op.
//
// Mechanism (works the same for trial-state and post-trial referrers):
//   new_trial_end = max(current trial_ends_at, now()) + OWNER_REFERRAL_BONUS_DAYS
//   - Update restaurants.trial_ends_at on the referrer's primary restaurant.
//   - If the referrer has a Stripe subscription, push its trial_end too
//     with proration_behavior='none' so Stripe simply pauses billing
//     until the new date (no proration credit on the current invoice).
//   - Record an audit row in referral_credit_grants and mark the
//     referred restaurant's referral_credit_granted_at.
//
// Failures (Stripe down, referrer has no subscription yet, unknown
// code) never throw — they return {granted:false, reason} so the
// registration that triggered this call still succeeds.

import {
  OWNER_REFERRAL_BONUS_DAYS,
  addDaysUtc,
  isValidOwnerReferralCode,
} from './referral-policy.ts';
import { stripeRequest } from './stripe.ts';

type AdminClient = {
  from: (table: string) => any;
};

export type GrantReferralCreditOptions = {
  referredRestaurantId: string;
  referredByCode: string;
};

export type GrantReferralCreditResult = {
  granted: boolean;
  reason?:
    | 'invalid_code'
    | 'already_granted'
    | 'referred_restaurant_missing'
    | 'unknown_code'
    | 'self_referral'
    | 'referrer_no_active_restaurant'
    | 'stripe_update_failed'
    | 'db_write_failed';
  daysAdded?: number;
  newTrialEndsAt?: string;
};

export async function tryGrantReferralCredit(
  admin: AdminClient,
  opts: GrantReferralCreditOptions,
): Promise<GrantReferralCreditResult> {
  if (!isValidOwnerReferralCode(opts.referredByCode)) {
    return { granted: false, reason: 'invalid_code' };
  }

  // 1. Reload the referred restaurant. Bail if it doesn't exist or was
  //    already credited.
  const { data: referred, error: referredErr } = await admin
    .from('restaurants')
    .select('id, owner_user_id, referred_by_code, referral_credit_granted_at')
    .eq('id', opts.referredRestaurantId)
    .maybeSingle();
  if (referredErr || !referred) {
    return { granted: false, reason: 'referred_restaurant_missing' };
  }
  if (referred.referral_credit_granted_at) {
    return { granted: false, reason: 'already_granted' };
  }

  // 2. Resolve the referral code → referrer owner.
  const { data: codeRow, error: codeErr } = await admin
    .from('owner_referral_codes')
    .select('owner_user_id')
    .eq('code', opts.referredByCode)
    .maybeSingle();
  if (codeErr || !codeRow?.owner_user_id) {
    return { granted: false, reason: 'unknown_code' };
  }
  const referrerUserId = codeRow.owner_user_id as string;

  // 3. Reject self-referrals defensively. (UI shouldn't allow it but a
  //    crafted edge-function call could.)
  if (referrerUserId === referred.owner_user_id) {
    return { granted: false, reason: 'self_referral' };
  }

  // 4. Pick the referrer's primary restaurant — most recently created,
  //    is_active. Apply the credit to that one. Subscription presence
  //    is optional; we still extend trial_ends_at in the DB even if
  //    Stripe isn't wired up yet.
  const { data: referrerRest, error: referrerErr } = await admin
    .from('restaurants')
    .select('id, trial_ends_at, stripe_subscription_id')
    .eq('owner_user_id', referrerUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (referrerErr || !referrerRest?.id) {
    return { granted: false, reason: 'referrer_no_active_restaurant' };
  }

  // 5. Compute the new trial-end timestamp.
  const now = new Date();
  const currentEnd = referrerRest.trial_ends_at ? new Date(referrerRest.trial_ends_at) : null;
  const base = currentEnd && currentEnd > now ? currentEnd : now;
  const newTrialEnd = addDaysUtc(base, OWNER_REFERRAL_BONUS_DAYS);
  const newTrialEndIso = newTrialEnd.toISOString();
  const newTrialEndUnix = Math.floor(newTrialEnd.getTime() / 1000);

  // 6. If a Stripe subscription exists, push its trial_end too. Use
  //    proration_behavior=none so the current invoice doesn't issue a
  //    proration credit/charge — we just slide the next charge date.
  if (referrerRest.stripe_subscription_id) {
    try {
      await stripeRequest(`subscriptions/${referrerRest.stripe_subscription_id}`, {
        trial_end: String(newTrialEndUnix),
        proration_behavior: 'none',
      });
    } catch (error) {
      console.error('tryGrantReferralCredit: Stripe update failed', {
        referrerUserId,
        referrerRestaurantId: referrerRest.id,
        subscriptionId: referrerRest.stripe_subscription_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return { granted: false, reason: 'stripe_update_failed' };
    }
  }

  // 7. Persist DB changes + audit row. The UNIQUE on
  //    referral_credit_grants.referred_restaurant_id guards against
  //    double-grants if this function is invoked twice (idempotency).
  const { error: extendErr } = await admin
    .from('restaurants')
    .update({ trial_ends_at: newTrialEndIso })
    .eq('id', referrerRest.id);
  if (extendErr) {
    console.error('tryGrantReferralCredit: extend referrer trial failed', extendErr);
    return { granted: false, reason: 'db_write_failed' };
  }

  const { error: markErr } = await admin
    .from('restaurants')
    .update({ referral_credit_granted_at: now.toISOString() })
    .eq('id', referred.id);
  if (markErr) {
    console.error('tryGrantReferralCredit: mark referred granted failed', markErr);
    return { granted: false, reason: 'db_write_failed' };
  }

  const { error: auditErr } = await admin.from('referral_credit_grants').insert({
    referrer_owner_user_id: referrerUserId,
    referrer_restaurant_id: referrerRest.id,
    referred_restaurant_id: referred.id,
    days_added: OWNER_REFERRAL_BONUS_DAYS,
    new_trial_ends_at: newTrialEndIso,
  });
  if (auditErr) {
    // Don't reverse the trial extension — the referrer has already
    // benefited. Just log so ops can reconcile if needed.
    console.error('tryGrantReferralCredit: audit insert failed', auditErr);
  }

  return {
    granted: true,
    daysAdded: OWNER_REFERRAL_BONUS_DAYS,
    newTrialEndsAt: newTrialEndIso,
  };
}
