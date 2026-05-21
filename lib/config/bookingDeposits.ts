/**
 * Booking-deposit Stripe flow gate.
 *
 * Historically this flag short-circuited the `prepare-deposit` /
 * `confirm-deposit-paid` chain because the server-side fns hadn't shipped
 * yet. They have since (2026-04 per the addendum), and leaving the flag
 * off means the legacy booking path skips the real Stripe charge entirely
 * — reservations get marked confirmed without any deposit moving. That's a
 * P0 bug that shipped briefly when this defaulted to false.
 *
 * Defaults to ENABLED. The production booking flow runs on the holds path
 * (see isHoldsEnabled in holdsFeature.ts) which mints a real PI directly
 * via createHoldPaymentIntent + Stripe PaymentSheet, but the legacy
 * step7-confirmation prepareDeposit chain still needs this gate on so its
 * fallback charge for $0-hold edge cases hits the real `confirm-deposit-
 * paid` edge fn instead of no-op'ing.
 *
 * Override only for local debugging:
 * `EXPO_PUBLIC_BOOKING_DEPOSITS_ENABLED=false` in `.env`. Never ship that
 * to any environment with a real Stripe key.
 */

export function bookingDepositsEnabled(): boolean {
  const raw = (process.env.EXPO_PUBLIC_BOOKING_DEPOSITS_ENABLED ?? '').trim().toLowerCase();
  // Default to true; only the explicit string 'false' disables.
  return raw !== 'false';
}
