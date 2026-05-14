-- Allow customers to delete their own restaurant_reviews and visit_photos rows.
--
-- The original migration (20260507000000) defined SELECT / INSERT / UPDATE
-- policies for the owning user but omitted DELETE, so the "My Reviews" screen
-- could not let users remove their own entries. This migration adds the
-- missing DELETE policies, scoped to the row's user_id matching auth.uid().
--
-- Precheck (safe — read-only):
--   SELECT polname FROM pg_policy
--     JOIN pg_class ON pg_policy.polrelid = pg_class.oid
--     WHERE pg_class.relname IN ('restaurant_reviews', 'visit_photos')
--       AND pg_policy.polcmd = 'd';
--
-- Expected before apply: zero rows. Expected after apply: two rows, one per table.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'restaurant_reviews'
      AND p.polname = 'Users can delete own restaurant reviews'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can delete own restaurant reviews"
        ON public.restaurant_reviews
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    $sql$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON p.polrelid = c.oid
    WHERE c.relname = 'visit_photos'
      AND p.polname = 'Users can delete own visit photos'
  ) THEN
    EXECUTE $sql$
      CREATE POLICY "Users can delete own visit photos"
        ON public.visit_photos
        FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    $sql$;
  END IF;
END
$$;
