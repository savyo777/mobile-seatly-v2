-- Drop the NOT NULL constraint on restaurants.hst_number. The owner
-- registration form no longer asks for an HST number — the field was
-- Canada-specific and blocked non-CA market expansion. Existing rows keep
-- their stored values; new rows can omit it. The column itself is kept
-- (not dropped) so any historical reads from the web app or analytics
-- tools that select `hst_number` continue to work.
--
-- Precheck (informational, not destructive — this migration is safe to
-- run on any data):
--   SELECT COUNT(*) AS total,
--          COUNT(*) FILTER (WHERE hst_number IS NULL) AS null_count
--   FROM public.restaurants;

ALTER TABLE public.restaurants
  ALTER COLUMN hst_number DROP NOT NULL;
