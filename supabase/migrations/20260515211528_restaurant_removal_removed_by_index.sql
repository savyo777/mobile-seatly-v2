-- Cover the restaurants.removed_by foreign key so owner account deletion and
-- auth-user cleanup do not scan restaurants.

CREATE INDEX IF NOT EXISTS restaurants_removed_by_idx
  ON public.restaurants(removed_by)
  WHERE removed_by IS NOT NULL;
