// Server-side mirror of `lib/owner/referralPolicy.ts`. Edge-function code
// runs under Deno and can't pull from the mobile app's module graph, so
// the policy constants live here too. Keep these in lock-step with the
// mobile-side file.

export const OWNER_REFERRAL_BONUS_DAYS = 60;

export const OWNER_REFERRAL_CODE_RE = /^CNV-OWNER-[A-Z0-9]{6}$/;

export function isValidOwnerReferralCode(value: unknown): value is string {
  return typeof value === 'string' && OWNER_REFERRAL_CODE_RE.test(value);
}

export function addDaysUtc(base: Date, days: number): Date {
  const result = new Date(base.getTime());
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}
