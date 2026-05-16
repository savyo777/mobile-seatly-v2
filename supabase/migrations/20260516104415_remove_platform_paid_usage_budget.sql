DROP FUNCTION IF EXISTS public.check_paid_usage_budget(text, text, numeric, numeric, numeric);

CREATE OR REPLACE FUNCTION public.check_paid_usage_budget(
  p_user_key text,
  p_service text,
  p_estimated_cost_usd numeric,
  p_user_daily_budget_usd numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_window_start timestamptz;
  v_window_epoch text;
  v_user_key text;
  v_service text;
  v_estimated numeric(12, 6);
  v_user_cap numeric(12, 6);
  v_user_total_key text;
  v_user_service_key text;
  v_platform_total_key text;
  v_platform_service_key text;
  v_user_spent numeric(12, 6);
BEGIN
  IF p_user_key IS NULL OR btrim(p_user_key) = '' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'missing_user');
  END IF;

  IF p_service IS NULL OR btrim(p_service) = '' THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'missing_service');
  END IF;

  IF p_estimated_cost_usd IS NULL OR p_estimated_cost_usd < 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_cost');
  END IF;

  IF p_user_daily_budget_usd IS NULL OR p_user_daily_budget_usd <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'invalid_user_budget');
  END IF;

  v_user_key := left(btrim(p_user_key), 160);
  v_service := regexp_replace(left(lower(btrim(p_service)), 80), '[^a-z0-9:_-]', '-', 'g');
  v_estimated := round(p_estimated_cost_usd, 6);
  v_user_cap := round(p_user_daily_budget_usd, 6);
  v_window_start := date_trunc('day', now());
  v_window_epoch := extract(epoch FROM v_window_start)::bigint::text;

  v_user_total_key := 'paid-usage|user-total|' || v_user_key || '|' || v_window_epoch;
  v_user_service_key := 'paid-usage|user-service|' || v_user_key || '|' || v_service || '|' || v_window_epoch;
  v_platform_total_key := 'paid-usage|platform-total|' || v_window_epoch;
  v_platform_service_key := 'paid-usage|platform-service|' || v_service || '|' || v_window_epoch;

  PERFORM pg_advisory_xact_lock(hashtext(v_user_total_key));

  SELECT coalesce(estimated_cost_usd, 0)
  INTO v_user_spent
  FROM public.paid_usage_buckets
  WHERE bucket_key = v_user_total_key;
  v_user_spent := coalesce(v_user_spent, 0);

  IF v_user_spent + v_estimated > v_user_cap THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'user_budget',
      'remaining_user_usd', greatest(v_user_cap - v_user_spent, 0)
    );
  END IF;

  INSERT INTO public.paid_usage_buckets (
    bucket_key,
    scope,
    service,
    user_key,
    window_start,
    hit_count,
    estimated_cost_usd
  )
  VALUES
    (v_platform_total_key, 'platform_total', 'all', null, v_window_start, 1, v_estimated),
    (v_platform_service_key, 'platform_service', v_service, null, v_window_start, 1, v_estimated),
    (v_user_total_key, 'user_total', 'all', v_user_key, v_window_start, 1, v_estimated),
    (v_user_service_key, 'user_service', v_service, v_user_key, v_window_start, 1, v_estimated)
  ON CONFLICT (bucket_key) DO UPDATE
    SET hit_count = public.paid_usage_buckets.hit_count + EXCLUDED.hit_count,
        estimated_cost_usd = public.paid_usage_buckets.estimated_cost_usd + EXCLUDED.estimated_cost_usd,
        updated_at = now();

  IF random() < 0.01 THEN
    DELETE FROM public.paid_usage_buckets
    WHERE window_start < now() - interval '14 days';
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', null,
    'remaining_user_usd', greatest(v_user_cap - (v_user_spent + v_estimated), 0)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.check_paid_usage_budget(text, text, numeric, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_paid_usage_budget(text, text, numeric, numeric) TO service_role;
