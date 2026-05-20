-- Shift cenaiva_notify_trial_ending from 9 UTC to 14 UTC so it lands
-- at 9-10am America/Toronto instead of 4-5am — owners getting the
-- "your trial ends in 7 days" email before they're awake means they
-- often miss it (gets buried under overnight inbox noise).
--
-- Per MOBILE_STRIPE_GUIDE_ADDENDUM.md §A4 timezone gotcha. pg_cron
-- schedules are always UTC; no DST shifting, so 14 UTC is 9am Toronto
-- in EST and 10am in EDT. Both are fine for "delivered with the
-- morning coffee."

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cenaiva_notify_trial_ending'
  ) THEN
    PERFORM cron.unschedule('cenaiva_notify_trial_ending');
  END IF;
END $$;

SELECT cron.schedule(
  'cenaiva_notify_trial_ending',
  '0 14 * * *',
  $cmd$SELECT cenaiva_call_cron_function('notify-trial-ending')$cmd$
);
