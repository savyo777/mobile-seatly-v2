import { key } from '@/lib/storage/keys';

// Owner-side "Refer & Earn" policy. Single source of truth so the mobile
// app, the edge function, and any future Stripe webhook stay aligned.
// Mirrored server-side in `supabase/functions/_shared/referral-policy.ts`.

// +30 days per side — referrer AND referred each get 1 month free
// the moment a referral signup completes.
export const OWNER_REFERRAL_BONUS_DAYS = 30;

// Code format: CNV-OWNER-XXXXXX (6 chars, uppercase alphanumeric).
// Generation happens server-side in `get_or_create_owner_referral_code`.
export const OWNER_REFERRAL_CODE_RE = /^CNV-OWNER-[A-Z0-9]{6}$/;

// Deep-link scheme path: cenaiva://owner-signup?ref=CNV-OWNER-XXXXXX
export const OWNER_REFERRAL_DEEP_LINK_PATH = 'owner-signup';
export const OWNER_REFERRAL_QUERY_PARAM = 'ref';

// AsyncStorage slot for a pending referral captured before signup.
// Cleared once the referral is consumed by a successful registration.
export const OWNER_REFERRAL_PENDING_STORAGE_KEY = key('owner_referral_pending');

export type PendingOwnerReferral = {
  code: string;
  capturedAt: string;
};

export function isValidOwnerReferralCode(value: unknown): value is string {
  return typeof value === 'string' && OWNER_REFERRAL_CODE_RE.test(value);
}

export function buildOwnerReferralDeepLink(code: string): string {
  return `cenaiva://${OWNER_REFERRAL_DEEP_LINK_PATH}?${OWNER_REFERRAL_QUERY_PARAM}=${encodeURIComponent(code)}`;
}
