-- Rebrand legacy Seatly identifiers to Cenaiva.
-- Renames the cron-helper function and config table, reschedules every
-- pg_cron job that called the old function (some jobnames were already
-- on the cenaiva_ prefix; the remaining 9 are migrated below), then
-- updates run_security_check() so its allow-list references the new
-- function name. The old function is dropped at the end.
--
-- Precheck (run manually if doing this by hand):
--   SELECT proname FROM pg_proc WHERE proname IN
--     ('seatly_call_cron_function','cenaiva_call_cron_function');
--   SELECT jobname FROM cron.job WHERE command LIKE '%seatly_call_cron_function%';

-- 1) Rename the config table.
ALTER TABLE public.seatly_cron_config RENAME TO cenaiva_cron_config;

-- 2) Create the renamed function with identical body, but pointing at the
--    renamed table.
CREATE OR REPLACE FUNCTION public.cenaiva_call_cron_function(func_path text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cfg record;
  hdr jsonb;
BEGIN
  SELECT base_url, COALESCE(cron_secret, '') AS cron_secret
  INTO cfg FROM cenaiva_cron_config WHERE id = 1;
  hdr := jsonb_build_object(
    'Content-Type', 'application/json',
    'x-cron-secret', cfg.cron_secret
  );
  RETURN net.http_post(
    url := cfg.base_url || '/' || func_path,
    headers := hdr,
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
END;
$function$;

-- Match the lockdown applied to the old function: no execute for
-- anon, authenticated, or public.
REVOKE EXECUTE ON FUNCTION public.cenaiva_call_cron_function(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cenaiva_call_cron_function(text) FROM anon, authenticated;

-- 3) Replace every pg_cron job that called the old function. Five jobs
--    were already on the cenaiva_ prefix but still pointed at the old
--    function; the other nine also need a name change.
DO $cron$
DECLARE
  rec record;
  new_name text;
BEGIN
  FOR rec IN
    SELECT jobid, jobname, schedule, command
    FROM cron.job
    WHERE command LIKE '%seatly_call_cron_function%'
  LOOP
    new_name := CASE
      WHEN rec.jobname LIKE 'seatly\_%' ESCAPE '\'
        THEN 'cenaiva_' || substring(rec.jobname FROM 8)
      ELSE rec.jobname
    END;
    PERFORM cron.unschedule(rec.jobname);
    PERFORM cron.schedule(
      new_name,
      rec.schedule,
      replace(rec.command, 'seatly_call_cron_function', 'cenaiva_call_cron_function')
    );
  END LOOP;
END
$cron$;

-- One leftover job ('seatly_refresh_restaurant_popularity') called a
-- non-cenaiva_call_cron_function path; rename it separately.
DO $rename$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'seatly_refresh_restaurant_popularity') THEN
    PERFORM cron.unschedule('seatly_refresh_restaurant_popularity');
    PERFORM cron.schedule(
      'cenaiva_refresh_restaurant_popularity',
      '0 4 * * *',
      'SELECT public.refresh_restaurant_popularity()'
    );
  END IF;
END
$rename$;

-- 4) Drop the legacy function now that nothing references it.
DROP FUNCTION IF EXISTS public.seatly_call_cron_function(text);

-- 5) Refresh run_security_check() so its allow-list references the
--    new function name instead of the dropped one.
CREATE OR REPLACE FUNCTION public.run_security_check()
RETURNS TABLE (
  check_id text,
  severity text,
  table_or_function text,
  detail jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $fn$
BEGIN
  RETURN QUERY
  SELECT
    'rls_disabled'::text,
    'high'::text,
    c.relname::text,
    jsonb_build_object('schema', 'public', 'kind', 'table')
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public'
    AND c.relkind = 'r'
    AND NOT c.relrowsecurity
    AND c.relname NOT LIKE 'spatial_ref_sys%'
    AND c.relname NOT LIKE 'pg_%';

  RETURN QUERY
  SELECT
    'definer_search_path_unset'::text,
    'medium'::text,
    p.proname::text,
    jsonb_build_object('args', pg_get_function_identity_arguments(p.oid))
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.prosecdef = true
    AND (p.proconfig IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM unnest(p.proconfig) cfg
           WHERE cfg LIKE 'search_path=%'
         ));

  RETURN QUERY
  SELECT
    'public_execute_on_internal_function'::text,
    'high'::text,
    p.proname::text,
    jsonb_build_object(
      'args', pg_get_function_identity_arguments(p.oid),
      'pattern', CASE
        WHEN p.proname LIKE 'harness\_%' ESCAPE '\' THEN 'test harness'
        WHEN p.proname LIKE 'temp\_%' ESCAPE '\' THEN 'one-shot migration'
        WHEN p.proname IN ('rls_auto_enable','cenaiva_call_cron_function','cleanup_stale_restaurant_drafts','handle_new_auth_user','sync_user_profile_from_auth') THEN 'internal admin'
        WHEN p.proname LIKE 'fn\_%' ESCAPE '\' THEN 'trigger function'
        WHEN p.proname LIKE '\_%' ESCAPE '\' THEN 'internal helper'
        ELSE 'unknown'
      END
    )
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND (
      p.proname LIKE 'harness\_%' ESCAPE '\'
      OR p.proname LIKE 'temp\_%' ESCAPE '\'
      OR p.proname LIKE 'fn\_%' ESCAPE '\'
      OR p.proname LIKE '\_%' ESCAPE '\'
      OR p.proname IN ('rls_auto_enable','cenaiva_call_cron_function','cleanup_stale_restaurant_drafts','handle_new_auth_user','sync_user_profile_from_auth')
    )
    AND EXISTS (
      SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      WHERE acl.grantee = 0
        AND acl.privilege_type = 'EXECUTE'
    );

  RETURN QUERY
  SELECT
    'rls_policy_always_true'::text,
    'high'::text,
    (pol.polrelid::regclass::text || '.' || pol.polname)::text,
    jsonb_build_object(
      'cmd', pol.polcmd::text,
      'using', pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_get_expr(pol.polwithcheck, pol.polrelid),
      'roles', array(
        SELECT r.rolname::text
        FROM pg_roles r
        WHERE r.oid = ANY(pol.polroles)
      )
    )
  FROM pg_policy pol
  WHERE (
    pg_get_expr(pol.polqual, pol.polrelid) = 'true'
    OR pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true'
  )
  AND pol.polcmd IN ('a', 'w', 'd', '*')
  AND EXISTS (
    SELECT 1 FROM unnest(pol.polroles) role_oid
    JOIN pg_roles r ON r.oid = role_oid
    WHERE r.rolname IN ('anon', 'authenticated', 'public')
  );

  RETURN QUERY
  SELECT
    'storage_bucket_listing_enabled'::text,
    'medium'::text,
    (polrelid::regclass::text || '.' || polname)::text,
    jsonb_build_object(
      'using', pg_get_expr(polqual, polrelid)
    )
  FROM pg_policy
  WHERE polrelid = 'storage.objects'::regclass
    AND polcmd = 'r'
    AND pg_get_expr(polqual, polrelid) ~ '^\(?bucket_id = ''[^'']+''(::text)?\)?$';
END;
$fn$;

REVOKE EXECUTE ON FUNCTION public.run_security_check() FROM public;
