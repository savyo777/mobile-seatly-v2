// Mirrors the server-side `CENAIVA_HOLDS_ENABLED` env var. When true, the
// booking flow on mobile creates a `reservation_holds` row at step 4 and
// converts it on payment / place-order. When false, the legacy flow runs.
// One-line revert: flip `EXPO_PUBLIC_CENAIVA_HOLDS_ENABLED` in `.env` and
// reload — no rebuild required.

export function isHoldsEnabled(): boolean {
  return process.env.EXPO_PUBLIC_CENAIVA_HOLDS_ENABLED === 'true';
}
