/**
 * Deep-link allowlist + origin validation.
 *
 * The cenaiva:// scheme handler in `app/_layout.tsx` (and the per-screen
 * handlers in the staff Connect-return flow) previously accepted any URL
 * whose path happened to contain a recognized substring. That's a weak
 * guard — a malicious universal link or a side-loaded URL could trigger
 * recovery / referral / Stripe-return handlers with attacker-supplied
 * params. The handlers themselves call Supabase / Stripe which validate
 * tokens server-side, so direct exploitation is hard — but the principle
 * of least authority says: don't even dispatch to the handler if the
 * URL shape isn't on the allowlist.
 *
 * Usage:
 *   const policy = classifyDeepLink(rawUrl);
 *   if (!policy) return; // drop silently
 *   switch (policy.kind) { ... }
 *
 * Added 2026-05-20 in the Phase B mobile-side hardening pass.
 */

import { Platform } from 'react-native';

export type DeepLinkKind =
  | 'recovery' // password reset (Supabase verifyOtp / setSession / exchangeCodeForSession)
  | 'auth_callback' // email-link / OAuth callback
  | 'owner_referral' // owner-signup referral capture
  | 'stripe_redirect' // generic Stripe return after PaymentSheet
  | 'stripe_connect' // Stripe Connect onboarding return / refresh
  | 'router'; // expo-router navigation into an in-app screen

export interface DeepLinkClassification {
  kind: DeepLinkKind;
  /** Normalized lowercase path segment (no leading slash, no query/fragment). */
  path: string;
  /** Original URL, for downstream handlers that need to re-parse. */
  url: string;
}

/**
 * Schemes we trust to come from our own app. Universal-link HTTP URLs
 * are NOT trusted by this allowlist — they should be wrapped + funneled
 * through a redirect bounce server-side before reaching here.
 */
const TRUSTED_SCHEMES = new Set(['cenaiva']);

/**
 * Allowed (kind, path-prefix) tuples. The first matching tuple wins.
 * Paths are checked case-insensitively. Anything not on the list is
 * dropped silently — log + return null in the caller.
 */
const ALLOWLIST: Array<{ kind: DeepLinkKind; pathMatcher: RegExp }> = [
  // Password recovery deep links from the Supabase email template.
  // Path is typically "reset-password" with token_hash + type=recovery
  // in the query / hash fragment.
  { kind: 'recovery', pathMatcher: /^(?:\/+)?reset-password(?:\/.*)?$/i },

  // Auth callback (email confirmation, OAuth providers, magic links).
  { kind: 'auth_callback', pathMatcher: /^(?:\/+)?auth-callback(?:\/.*)?$/i },

  // Owner-signup referral capture. The path is `owner-signup` per
  // `lib/owner/referralPolicy.ts:16`. Can also appear as a hostname
  // segment vs path depending on iOS/Android URL parser behavior.
  { kind: 'owner_referral', pathMatcher: /^(?:\/+)?owner-signup(?:\/.*)?$/i },

  // Stripe return after PaymentSheet — narrow path, no params accepted.
  { kind: 'stripe_redirect', pathMatcher: /^(?:\/+)?stripe-redirect(?:\/.*)?$/i },

  // Stripe Connect onboarding bounce. Path is `stripe/connect/return`
  // or `stripe/connect/refresh` with an optional restaurant_id query
  // param. Anything else under `stripe/...` is rejected.
  { kind: 'stripe_connect', pathMatcher: /^(?:\/+)?stripe\/connect\/(?:return|refresh)(?:\/.*)?$/i },

  // Expo-router navigation into in-app screens. Whitelist the route
  // groups we want to expose to deep linking. New top-level group?
  // Add it here explicitly — don't open `/[anything]` to deep links.
  {
    kind: 'router',
    pathMatcher:
      /^(?:\/+)?(?:\(customer\)|\(staff\)|\(auth\)|booking|customer|staff|auth)(?:\/.*)?$/i,
  },
];

/**
 * Extract the path portion of a URL, normalized.
 * Handles both `scheme://host/path` and `scheme:///path` forms
 * (expo-router deep links often use the empty-host form).
 */
function extractPath(url: string): string {
  try {
    // Find the scheme://… delimiter.
    const schemeEnd = url.indexOf('://');
    if (schemeEnd < 0) return '';
    const rest = url.slice(schemeEnd + 3);
    // Drop fragment + query first so the path is clean.
    const beforeFragment = rest.split('#')[0] ?? '';
    const beforeQuery = beforeFragment.split('?')[0] ?? '';
    // expo-router treats `cenaiva://host/path` and `cenaiva:///path`
    // differently. For our allowlist the "host" segment is part of the
    // path (e.g. `cenaiva://reset-password` → path=`reset-password`).
    return beforeQuery.toLowerCase();
  } catch {
    return '';
  }
}

/**
 * Returns null if the URL is rejected. Otherwise returns the matched
 * classification so the caller can dispatch.
 *
 * Pure function — no side effects (no logging, no storage). Caller is
 * responsible for telemetry on rejects.
 */
export function classifyDeepLink(url: string | null | undefined): DeepLinkClassification | null {
  if (!url || typeof url !== 'string') return null;
  // Reject control characters early — they shouldn't appear in real
  // deep links and they trip up URL parsers in subtle ways.
  if (/[\x00-\x1F\x7F]/.test(url)) return null;

  // Scheme check.
  const colonIdx = url.indexOf(':');
  if (colonIdx <= 0) return null;
  const scheme = url.slice(0, colonIdx).toLowerCase();
  if (!TRUSTED_SCHEMES.has(scheme)) return null;

  // Hard cap on URL length so a 100 KB attacker payload can't slow the
  // regex engine to a crawl. Real deep links are < 2 KB.
  if (url.length > 4096) return null;

  const path = extractPath(url);

  for (const entry of ALLOWLIST) {
    if (entry.pathMatcher.test(path)) {
      return { kind: entry.kind, path, url };
    }
  }
  return null;
}

/**
 * Lightweight predicate when you only care whether the URL is allowed
 * (e.g. logging filters). Prefer `classifyDeepLink` when you need to
 * dispatch on the kind.
 */
export function isAllowedDeepLink(url: string | null | undefined): boolean {
  return classifyDeepLink(url) !== null;
}

/**
 * Telemetry hook — call when a deep link is REJECTED so ops can see
 * whether real users are hitting bad URLs (vs an attack pattern).
 * No-op on web; logs to console in dev so contributors notice when
 * they ship a new deep-link path without adding it to the allowlist.
 */
export function logDeepLinkReject(url: string | null | undefined, reason = 'not_in_allowlist'): void {
  if (__DEV__) {
    // Truncate so a hostile URL can't blow up the dev log.
    const safe = (url ?? '').slice(0, 200);
    // eslint-disable-next-line no-console
    console.warn(`[deepLinkPolicy] rejected ${reason}: ${safe} (platform=${Platform.OS})`);
  }
}
