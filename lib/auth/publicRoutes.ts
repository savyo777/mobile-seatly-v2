// Apple App Store guideline 5.1.1(v): registration may only be required
// for account-based features (booking a table, saving favorites, writing a
// review). Reading restaurant content — menu, photos, hours, price tier,
// map — is NOT account-based and must be available without sign-in.
//
// This module is the single source of truth for which (customer) routes
// the auth gates at app/_layout.tsx + app/(customer)/_layout.tsx will let
// unauthenticated users through. Per-action gating (the Book/Save/Review
// buttons inside the public screens) lives next to those buttons via
// requireAuthOrPromptLogin().

export function isPublicCustomerRoute(segments: readonly (string | undefined)[]): boolean {
  if (segments[0] !== '(customer)') return false;
  const seg1 = segments[1];
  if (seg1 === 'discover') {
    // Snap upload + connect-to-restaurant flow are account-based.
    return segments[2] !== 'post-review';
  }
  if (seg1 === 'map') return true;
  return false;
}
