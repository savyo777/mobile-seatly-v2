-- Track owner-requested restaurant removal without hard-deleting restaurant
-- records that are still referenced by reservations, payments, analytics, and
-- Stripe webhook reconciliation.

ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS removed_at timestamptz,
  ADD COLUMN IF NOT EXISTS removed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subscription_cancel_requested_at timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_cancel_at_period_end boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_current_period_end timestamptz;

CREATE INDEX IF NOT EXISTS restaurants_removed_at_idx
  ON public.restaurants(removed_at)
  WHERE removed_at IS NOT NULL;

COMMENT ON COLUMN public.restaurants.removed_at IS
  'When the restaurant owner removed this restaurant from Cenaiva.';
COMMENT ON COLUMN public.restaurants.removed_by IS
  'Auth user who requested the restaurant removal.';
COMMENT ON COLUMN public.restaurants.subscription_cancel_requested_at IS
  'When Cenaiva requested cancellation for the owner subscription.';
COMMENT ON COLUMN public.restaurants.subscription_cancel_at_period_end IS
  'True when the Stripe subscription was scheduled to stop renewing at period end.';
COMMENT ON COLUMN public.restaurants.subscription_current_period_end IS
  'Stripe subscription current_period_end captured when removal was requested.';
