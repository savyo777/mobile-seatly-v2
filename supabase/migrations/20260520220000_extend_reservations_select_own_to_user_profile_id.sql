-- Bug #7 fix: extend reservations_select_own RLS to match
-- user_profile_id (holds-path bookings) in addition to guest_id
-- (legacy guest-checkout bookings).
--
-- The holds-path edge fn confirm-hold-paid (the production diner
-- booking flow per MOBILE_STRIPE_GUIDE.md §4-5) writes reservations
-- with user_profile_id populated and guest_id=null. The pre-existing
-- reservations_select_own policy only matched via guest_id, so diners
-- could not SELECT their own bookings — the customer Bookings tab
-- showed "No upcoming bookings" and the booking-detail screen showed
-- "Booking not found" even when the row existed in DB with their
-- user_profile_id linked. Cancellation and modification CTAs were
-- unreachable as a result.
--
-- Surfaced during the Stripe diner-flow matrix on 2026-05-20.
-- Applied live via mcp__supabase__apply_migration; this SQL file
-- vendors the same change so a fresh-bootstrap project (or DR
-- rebuild) reproduces the policy.

DROP POLICY IF EXISTS reservations_select_own ON public.reservations;

CREATE POLICY reservations_select_own ON public.reservations
  FOR SELECT
  USING (
    -- Holds-path (current): reservation.user_profile_id matches auth user
    user_profile_id IN (
      SELECT id FROM public.user_profiles WHERE auth_user_id = (SELECT auth.uid())
    )
    OR
    -- Legacy guest-checkout: reservation.guest_id → guests.user_profile_id → auth.uid()
    guest_id IN (
      SELECT g.id FROM public.guests g
      JOIN public.user_profiles up ON up.id = g.user_profile_id
      WHERE up.auth_user_id = (SELECT auth.uid())
    )
  );

COMMENT ON POLICY reservations_select_own ON public.reservations IS
  'Diner can SELECT their own reservations whether attached via user_profile_id (holds path) or guest_id (legacy guest-checkout).';
