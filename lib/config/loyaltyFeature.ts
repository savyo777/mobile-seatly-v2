/**
 * Loyalty feature flag.
 *
 * The loyalty / rewards system (points, tier badges, rewards hub, dinner-tier
 * progression, post-snap "+X points" badge, staff-side guest loyalty card,
 * onboarding rewards slide) is currently hidden across the app. Every code
 * path is preserved in source so the feature can be revived in a single
 * commit when we re-integrate it as a future update.
 *
 * To re-enable loyalty:
 *   1. Change this function to return `true` (or wire it to an
 *      `EXPO_PUBLIC_CENAIVA_LOYALTY_ENABLED` env var, mirroring the
 *      demo-mode pattern in `./demoMode.ts`).
 *   2. Smoke-test the customer profile home, wallet, notifications,
 *      onboarding slide 3, post-snap reward screen, and the two staff
 *      guests screens.
 *
 * Library code (lib/loyalty/*, lib/mock/loyalty.ts, theme tokens, i18n
 * keys, loyalty fields on user/guest profiles) is intentionally left in
 * place so flipping the flag is enough to bring loyalty back.
 */
export function isLoyaltyEnabled(): boolean {
  return false;
}
