/**
 * Staff-side feature flags for partially-built screens. Each function
 * returns `false` to hide the corresponding button entirely; flip to
 * `true` (or wire to an env var) when the underlying feature ships.
 *
 * Pattern mirrors lib/config/loyaltyFeature.ts so the codebase has one
 * consistent "feature is dark" toggle style.
 *
 * Added 2026-05-17 during the app-wide button audit — these buttons
 * previously fired Alert.alert("Coming soon") or had no-op handlers,
 * which is worse UX than not showing the button at all.
 */

/** Tap-to-create on the staff Promotions tab. */
export function isPromoCreationEnabled(): boolean {
  return false;
}

/** "+ Walk-in" button on the staff Schedule screen. */
export function isWalkinAddEnabled(): boolean {
  return false;
}

/** "Seat" and "Edit time" actions on staff waitlist rows. */
export function isWaitlistActionsEnabled(): boolean {
  return false;
}
