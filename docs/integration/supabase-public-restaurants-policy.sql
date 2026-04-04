-- Suggested migration for customer Discover (mobile + web public browsing).
-- Apply in the Seatly Supabase project after review — anon must be allowed to list active venues.
-- RLS today only allows owners/admins to SELECT restaurants (see 20250317000005_rls_phase1.sql).

-- If the policy already exists, drop it first or skip this file.
CREATE POLICY restaurants_select_active_public
  ON public.restaurants
  FOR SELECT
  TO anon, authenticated
  USING (is_active = true);
