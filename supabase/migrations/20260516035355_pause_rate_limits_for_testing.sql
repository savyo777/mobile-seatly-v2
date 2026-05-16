CREATE TABLE IF NOT EXISTS public.rate_limit_control (
  singleton boolean PRIMARY KEY DEFAULT true,
  paused boolean NOT NULL DEFAULT false,
  reason text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT rate_limit_control_singleton CHECK (singleton)
);

ALTER TABLE public.rate_limit_control ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limit_control FROM anon, authenticated;

COMMENT ON TABLE public.rate_limit_control IS
  'Singleton database-side switch for temporarily pausing API rate-limit enforcement without deleting limit configuration or bucket history.';

INSERT INTO public.rate_limit_control (singleton, paused, reason, updated_at)
VALUES (true, true, 'Temporarily paused for in-depth testing', now())
ON CONFLICT (singleton) DO UPDATE
SET
  paused = EXCLUDED.paused,
  reason = EXCLUDED.reason,
  updated_at = now();

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_key text,
  p_limit integer,
  p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_paused boolean;
  v_window_start timestamptz;
  v_window_key text;
  v_count integer;
BEGIN
  SELECT coalesce(paused, false)
  INTO v_paused
  FROM public.rate_limit_control
  WHERE singleton = true;

  IF coalesce(v_paused, false) THEN
    RETURN TRUE;
  END IF;

  IF p_key IS NULL OR p_limit IS NULL OR p_limit < 1 OR p_window_seconds IS NULL OR p_window_seconds < 1 THEN
    RETURN TRUE;
  END IF;

  v_window_start := to_timestamp(
    floor(extract(epoch FROM now()) / p_window_seconds) * p_window_seconds
  );
  v_window_key := p_key || '|' || extract(epoch FROM v_window_start)::bigint::text;

  INSERT INTO public.rate_limit_buckets (bucket_key, hit_count, window_start)
  VALUES (v_window_key, 1, v_window_start)
  ON CONFLICT (bucket_key) DO UPDATE
    SET hit_count = public.rate_limit_buckets.hit_count + 1
  RETURNING hit_count INTO v_count;

  IF random() < 0.01 THEN
    DELETE FROM public.rate_limit_buckets
    WHERE window_start < now() - interval '2 days';
  END IF;

  RETURN v_count <= p_limit;
END;
$function$;
