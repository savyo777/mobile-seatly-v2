/**
 * Feature flag: booking-deposit Stripe flow.
 *
 * The booking flow calls two Supabase edge functions (`prepare-deposit`
 * and `confirm-deposit-stub`) to authorize and capture deposit payments
 * for restaurants that require one. Neither function is deployed yet —
 * the Stripe integration (PaymentIntents API + webhook) needs to land
 * server-side first. Until then, this flag is `false` and the client-side
 * deposit helpers short-circuit to a no-op (return `{ payments: [] }`),
 * so the booking flow completes without a payment instead of crashing
 * against a 404 from the missing function.
 *
 * Flip via `EXPO_PUBLIC_BOOKING_DEPOSITS_ENABLED=true` in the EAS / .env
 * once the edge functions are live AND the Stripe webhook is registered.
 * Until then, restaurants that have `depositTiers` configured will still
 * show the "deposit required" copy upstream (in step-prepay-offer), but
 * tapping Continue won't attempt to charge.
 */

export function bookingDepositsEnabled(): boolean {
  return (process.env.EXPO_PUBLIC_BOOKING_DEPOSITS_ENABLED ?? '').trim().toLowerCase() === 'true';
}
