// Cenaiva legal document version stamps.
//
// Bump LATEST_LEGAL_VERSION when EITHER Terms or Privacy materially changes
// — bumping it makes every existing user re-hit the acceptance gate at
// app/(auth)/consent.tsx on next sign-in. The per-doc version constants
// are stamped at the top of each rendered screen so the diner can see
// which revision they're reading.
//
// `tos_version` on user_profiles stores the LATEST_LEGAL_VERSION string the
// diner accepted. When `tos_version !== LATEST_LEGAL_VERSION`, the gate
// shows. New users start with `tos_version IS NULL` and hit the gate
// immediately after signup.

export const TERMS_VERSION = '2026-05-21';
export const TERMS_EFFECTIVE_DATE = 'May 10, 2026';
export const TERMS_LAST_UPDATED = 'May 21, 2026';

export const PRIVACY_VERSION = '1.1';
export const PRIVACY_EFFECTIVE_DATE = 'May 21, 2026';
export const PRIVACY_LAST_UPDATED = 'May 21, 2026';

/**
 * The exact agreement text written to the immutable `diner_consent_log` audit
 * trail (PIPEDA / Quebec Law 25 / CASL) via the `log-diner-consent` edge fn.
 * Kept verbatim-identical to the web app's RegisterPage disclosures so a diner's
 * consent rows read the same regardless of which client they accepted on. Bump
 * these alongside the version stamps above.
 */
export const DINER_TERMS_DISCLOSURE =
  'I agree to the Cenaiva Terms of Service (effective 2026-05-10, last updated 2026-05-21).';
export const DINER_PRIVACY_DISCLOSURE =
  'I agree to the Cenaiva Privacy Policy (v1.1, effective 2026-05-21).';

export const PARTNER_AGREEMENT_VERSION = '2.1';
export const PARTNER_AGREEMENT_EFFECTIVE_DATE = 'May 21, 2026';
export const PARTNER_AGREEMENT_LAST_UPDATED = 'May 21, 2026';

/**
 * Single consent stamp written to user_profiles.tos_version when the
 * diner accepts at the consent gate. Covers both Terms AND Privacy —
 * we re-gate on either change. Format: YYYY-MM-DD of the most recent
 * Terms or Privacy update.
 */
export const LATEST_LEGAL_VERSION = '2026-05-21';

/**
 * The minimum age in Cenaiva's Terms §1 ("Eligibility"). Used by the
 * future signup DOB gate (out of scope this commit; reserved here so
 * it can be imported when we do build the gate).
 */
export const MINIMUM_AGE = 16;
