-- fetchOwnerRestaurants() finds restaurants via three paths; the existing
-- expenses RLS only covered user_restaurant_roles. The third path —
-- restaurants.owner_user_id = auth.uid() — had no coverage at all, so
-- owners registered through that path were blocked on every INSERT.
--
-- Fix 1: add a policy covering restaurants.owner_user_id.
-- Fix 2: backfill user_restaurant_roles for any owner whose restaurant is
--         linked only via restaurants.owner_user_id (so existing RLS policies
--         also start working for them going forward).

-- Policy: allow full access when the auth user is the restaurant's direct owner
CREATE POLICY "expenses_owner_via_restaurant_owner_user_id"
ON public.expenses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = expenses.restaurant_id
      AND r.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = expenses.restaurant_id
      AND r.owner_user_id = auth.uid()
  )
);

-- Backfill: for every restaurant that has owner_user_id set, ensure the
-- corresponding user_profiles row has a user_restaurant_roles entry with
-- role='owner'. Uses INSERT ... ON CONFLICT DO NOTHING to be idempotent.
INSERT INTO public.user_restaurant_roles (user_id, restaurant_id, role, is_primary)
SELECT
  up.id           AS user_id,
  r.id            AS restaurant_id,
  'owner'         AS role,
  true            AS is_primary
FROM public.restaurants r
JOIN public.user_profiles up ON up.auth_user_id = r.owner_user_id
WHERE r.owner_user_id IS NOT NULL
ON CONFLICT DO NOTHING;
