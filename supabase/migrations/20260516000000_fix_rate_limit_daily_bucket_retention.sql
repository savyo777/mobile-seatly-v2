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
  v_window_start timestamptz;
  v_window_key text;
  v_count integer;
BEGIN
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
