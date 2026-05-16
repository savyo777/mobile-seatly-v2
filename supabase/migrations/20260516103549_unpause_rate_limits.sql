INSERT INTO public.rate_limit_control (singleton, paused, reason, updated_at)
VALUES (true, false, 'Re-enabled after Hey Cenaiva midpoint rate-limit tuning', now())
ON CONFLICT (singleton) DO UPDATE
SET
  paused = EXCLUDED.paused,
  reason = EXCLUDED.reason,
  updated_at = EXCLUDED.updated_at;
