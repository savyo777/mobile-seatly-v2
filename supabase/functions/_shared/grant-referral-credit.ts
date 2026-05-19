// @ts-nocheck
// Owner referral credit grant — server-side helper.
//
// Called from register-restaurant-owner after a new restaurant row is
// inserted with a `referred_by_code`. Idempotent: a re-run for the same
// referred_restaurant_id is a no-op (guarded by the
// `referred.referral_credit_granted_at IS NULL` precheck and by the
// UNIQUE constraint on referral_credit_grants.referred_restaurant_id).
//
// Reward shape: both restaurants get +OWNER_REFERRAL_BONUS_DAYS each.
//   new_trial_end = max(current trial_ends_at, now()) + bonus
//   - For each side, bump restaurants.trial_ends_at.
//   - If that side has a Stripe subscription, push its trial_end too
//     with proration_behavior='none' so the current invoice doesn't
//     issue a proration credit/charge — we just slide the next charge.
//   - Audit row in referral_credit_grants captures the referrer side
//     (matches what the referrer sees in their history list).
//
// Principle: once the referred restaurant is credited, never roll
// back. Referrer credit is best-effort on top — a missing referrer
// restaurant or a Stripe failure on the referrer side does NOT undo
// the referred restaurant's bonus. This avoids the awkward case where
// the new owner sees their trial extension flash and then disappear.

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
    | 'stripe_update_failed_referred'
    | 'db_write_failed_referred';
  daysAdded?: number;
  referredNewTrialEndsAt?: string;
  referrerNewTrialEndsAt?: string;
  referrerCredited?: boolean;
};

function computeNewTrialEnd(currentIso: string | null, now: Date): { iso: string; unix: number } {
  const current = currentIso ? new Date(currentIso) : null;
  const base = current && current > now ? current : now;
  const next = addDaysUtc(base, OWNER_REFERRAL_BONUS_DAYS);
  return { iso: next.toISOString(), unix: Math.floor(next.getTime() / 1000) };
}

export async function tryGrantReferralCredit(
  admin: AdminClient,
  opts: GrantReferralCreditOptions,
): Promise<GrantReferralCreditResult> {
  if (!isValidOwnerReferralCode(opts.referredByCode)) {
    return { granted: false, reason: 'invalid_code' };
  }

  // 1. Reload the referred restaurant.
  const { data: referred, error: referredErr } = await admin
    .from('restaurants')
    .select('id, owner_user_id, trial_ends_at, stripe_subscription_id, referral_credit_granted_at')
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

  // 3. Reject self-referrals defensively.
  if (referrerUserId === referred.owner_user_id) {
    return { granted: false, reason: 'self_referral' };
  }

  const now = new Date();

  // ─── Credit the referred restaurant FIRST. This is the bonus that
  //     directly affects the user who just signed up — they should
  //     see the extra month immediately even if the referrer-side
  //     bookkeeping has problems. ─────────────────────────────────────

  const referredTrial = computeNewTrialEnd(referred.trial_ends_at, now);

  if (referred.stripe_subscription_id) {
    try {
      await stripeRequest(`subscriptions/${referred.stripe_subscription_id}`, {
        trial_end: String(referredTrial.unix),
        proration_behavior: 'none',
      });
    } catch (error) {
      console.error('tryGrantReferralCredit: Stripe update failed (referred)', {
        referredRestaurantId: referred.id,
        subscriptionId: referred.stripe_subscription_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return { granted: false, reason: 'stripe_update_failed_referred' };
    }
  }

  const { error: refExtendErr } = await admin
    .from('restaurants')
    .update({ trial_ends_at: referredTrial.iso })
    .eq('id', referred.id);
  if (refExtendErr) {
    console.error('tryGrantReferralCredit: extend referred trial failed', refExtendErr);
    return { granted: false, reason: 'db_write_failed_referred' };
  }

  // Lock in idempotency the moment the referred bonus is applied. Any
  // subsequent re-invocation hits the `already_granted` branch above.
  const { error: markErr } = await admin
    .from('restaurants')
    .update({ referral_credit_granted_at: now.toISOString() })
    .eq('id', referred.id);
  if (markErr) {
    console.error('tryGrantReferralCredit: mark referred granted failed', markErr);
    // Don't return — the referred trial extension already landed. Just
    // log; ops can backfill the marker. The referrer-side steps below
    // can still run.
  }

  // ─── Credit the referrer (best-effort). If they have no active
  //     restaurant, skip; if their Stripe call fails, skip the DB
  //     extension + audit but still return granted:true. ─────────────

  const { data: referrerRest } = await admin
    .from('restaurants')
    .select('id, trial_ends_at, stripe_subscription_id')
    .eq('owner_user_id', referrerUserId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!referrerRest?.id) {
    console.warn('tryGrantReferralCredit: referrer has no active restaurant', {
      referrerUserId,
      referredRestaurantId: referred.id,
    });
    return {
      granted: true,
      daysAdded: OWNER_REFERRAL_BONUS_DAYS,
      referredNewTrialEndsAt: referredTrial.iso,
      referrerCredited: false,
    };
  }

  const referrerTrial = computeNewTrialEnd(referrerRest.trial_ends_at, now);

  if (referrerRest.stripe_subscription_id) {
    try {
      await stripeRequest(`subscriptions/${referrerRest.stripe_subscription_id}`, {
        trial_end: String(referrerTrial.unix),
        proration_behavior: 'none',
      });
    } catch (error) {
      console.error('tryGrantReferralCredit: Stripe update failed (referrer)', {
        referrerUserId,
        referrerRestaurantId: referrerRest.id,
        subscriptionId: referrerRest.stripe_subscription_id,
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        granted: true,
        daysAdded: OWNER_REFERRAL_BONUS_DAYS,
        referredNewTrialEndsAt: referredTrial.iso,
        referrerCredited: false,
      };
    }
  }

  const { error: referrerExtendErr } = await admin
    .from('restaurants')
    .update({ trial_ends_at: referrerTrial.iso })
    .eq('id', referrerRest.id);
  if (referrerExtendErr) {
    console.error('tryGrantReferralCredit: extend referrer trial failed', referrerExtendErr);
    return {
      granted: true,
      daysAdded: OWNER_REFERRAL_BONUS_DAYS,
      referredNewTrialEndsAt: referredTrial.iso,
      referrerCredited: false,
    };
  }

  const { error: auditErr } = await admin.from('referral_credit_grants').insert({
    referrer_owner_user_id: referrerUserId,
    referrer_restaurant_id: referrerRest.id,
    referred_restaurant_id: referred.id,
    days_added: OWNER_REFERRAL_BONUS_DAYS,
    new_trial_ends_at: referrerTrial.iso,
  });
  if (auditErr) {
    // The trial extensions already landed; audit row is for ops/UI
    // and isn't load-bearing. Log + continue.
    console.error('tryGrantReferralCredit: audit insert failed', auditErr);
  }

  return {
    granted: true,
    daysAdded: OWNER_REFERRAL_BONUS_DAYS,
    referredNewTrialEndsAt: referredTrial.iso,
    referrerNewTrialEndsAt: referrerTrial.iso,
    referrerCredited: true,
  };
}
