// Policy-layer tests for the owner Refer & Earn feature.
//
// The mobile policy (`lib/owner/referralPolicy.ts`) and the server policy
// (`supabase/functions/_shared/referral-policy.ts`) are deliberately
// duplicated — Deno-side can't reach into the mobile module graph. These
// tests assert the two stay in lock-step on the values that matter:
// bonus days, code regex, and the deep-link path.

import {
  OWNER_REFERRAL_BONUS_DAYS,
  OWNER_REFERRAL_CODE_RE,
  OWNER_REFERRAL_DEEP_LINK_PATH,
  OWNER_REFERRAL_QUERY_PARAM,
  buildOwnerReferralDeepLink,
  isValidOwnerReferralCode,
} from '@/lib/owner/referralPolicy';
import {
  OWNER_REFERRAL_BONUS_DAYS as SERVER_BONUS_DAYS,
  OWNER_REFERRAL_CODE_RE as SERVER_CODE_RE,
  addDaysUtc,
  isValidOwnerReferralCode as serverIsValid,
} from '@/supabase/functions/_shared/referral-policy';

describe('owner referral policy constants', () => {
  it('grants 30 days per side', () => {
    expect(OWNER_REFERRAL_BONUS_DAYS).toBe(30);
  });

  it('keeps mobile + server bonus days in lock-step', () => {
    expect(OWNER_REFERRAL_BONUS_DAYS).toBe(SERVER_BONUS_DAYS);
  });

  it('keeps mobile + server code regex in lock-step', () => {
    expect(OWNER_REFERRAL_CODE_RE.source).toBe(SERVER_CODE_RE.source);
  });
});

describe('isValidOwnerReferralCode', () => {
  const valid = ['CNV-OWNER-ABC123', 'CNV-OWNER-000000', 'CNV-OWNER-ZZZZZZ'];
  const invalid = [
    'cnv-owner-abc123', // lowercase prefix
    'CNV-OWNER-abc123', // lowercase chars
    'CNV-OWNER-ABC12', // 5 chars
    'CNV-OWNER-ABC1234', // 7 chars
    'CNV-OWNER-ABC-12', // dash in body
    'CNVOWNER-ABC123', // missing dash
    'CNV-OWNER- ABC123', // space
    '',
    null,
    undefined,
    42,
  ];

  it.each(valid)('accepts %s', (code) => {
    expect(isValidOwnerReferralCode(code)).toBe(true);
    expect(serverIsValid(code)).toBe(true);
  });

  it.each(invalid as unknown[])('rejects %p', (code) => {
    expect(isValidOwnerReferralCode(code)).toBe(false);
    expect(serverIsValid(code)).toBe(false);
  });
});

describe('buildOwnerReferralDeepLink', () => {
  it('uses the documented cenaiva:// scheme and owner-signup path', () => {
    const link = buildOwnerReferralDeepLink('CNV-OWNER-ABC123');
    expect(link).toBe(`cenaiva://${OWNER_REFERRAL_DEEP_LINK_PATH}?${OWNER_REFERRAL_QUERY_PARAM}=CNV-OWNER-ABC123`);
  });

  it('URL-encodes weird characters defensively', () => {
    // The regex blocks anything but [A-Z0-9] inside a real code, but the
    // builder is also exposed for hand-crafted test/QA codes; make sure
    // it doesn't smuggle unsafe characters into the URL.
    const link = buildOwnerReferralDeepLink('a b&c');
    expect(link).toContain('a%20b%26c');
  });
});

describe('addDaysUtc', () => {
  it('adds whole days in UTC, ignoring local DST', () => {
    const base = new Date('2026-03-08T05:00:00.000Z'); // US DST start day
    const result = addDaysUtc(base, 30);
    expect(result.toISOString()).toBe('2026-04-07T05:00:00.000Z');
  });

  it('rolls over months correctly', () => {
    const base = new Date('2026-01-31T12:00:00.000Z');
    const result = addDaysUtc(base, 30);
    // 31 Jan + 30d = 2 Mar (Jan has 31, Feb has 28 in 2026)
    expect(result.toISOString()).toBe('2026-03-02T12:00:00.000Z');
  });

  it('does not mutate the input', () => {
    const base = new Date('2026-05-01T00:00:00.000Z');
    const baseIso = base.toISOString();
    addDaysUtc(base, 30);
    expect(base.toISOString()).toBe(baseIso);
  });
});
