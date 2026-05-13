-- The two existing expenses RLS policies only check user_restaurant_roles,
-- but fetchOwnerRestaurants() also finds restaurants via the legacy
-- user_profiles.restaurant_id + role='owner' path. Owners registered through
-- that path have no user_restaurant_roles row and are blocked on INSERT.
-- This policy covers that ownership path so both work.

CREATE POLICY "expenses_owner_via_profile"
ON public.expenses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.restaurant_id = expenses.restaurant_id
      AND lower(trim(up.role)) = 'owner'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.auth_user_id = auth.uid()
      AND up.restaurant_id = expenses.restaurant_id
      AND lower(trim(up.role)) = 'owner'
  )
);
