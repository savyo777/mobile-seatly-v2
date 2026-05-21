// Holds path is the production booking flow per MOBILE_STRIPE_GUIDE.md §4:
// mobile mints a hold at step 4, mints a PaymentIntent on the platform with
// transfer_data.destination = restaurant Connect account, presents Stripe
// PaymentSheet, then converts the hold via confirm-hold-paid once the
// charge succeeds. This is the only path that mints a real Stripe PI and
// moves real money from diner to restaurant.
//
// Defaults to ENABLED. The legacy non-holds path bypassed Stripe entirely
// (the chain through step7-confirmation's prepareDeposit + confirm-deposit-
// stub) and created confirmed reservations without charging anyone — a P0
// bug that shipped to production briefly when this flag defaulted to false.
// Leave it on. Setting `EXPO_PUBLIC_CENAIVA_HOLDS_ENABLED=false` explicitly
// is allowed for local debugging but should NEVER ship to any env that
// hits a real Stripe key.

export function isHoldsEnabled(): boolean {
  const raw = (process.env.EXPO_PUBLIC_CENAIVA_HOLDS_ENABLED ?? '').trim().toLowerCase();
  // Default to true; only the explicit string 'false' disables.
  return raw !== 'false';
}
