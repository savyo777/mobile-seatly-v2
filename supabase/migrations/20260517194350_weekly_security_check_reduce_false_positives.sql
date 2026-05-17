-- Phase 4 hardening (2026-05-17): tighten the lite security advisor.
-- Two checks were too loose in the v1 implementation:
--   1. rls_policy_always_true fired on policies scoped to service_role
--      only — using=true is correct there.
--   2. storage_bucket_listing_enabled fired on any SELECT policy that
--      referenced bucket_id, even when the rest had a real auth check.

create or replace function public.run_security_check()
returns table (
  check_id text,
  severity text,
  table_or_function text,
  detail jsonb
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
begin
  return query
  select
    'rls_disabled'::text,
    'high'::text,
    c.relname::text,
    jsonb_build_object('schema', 'public', 'kind', 'table')
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and not c.relrowsecurity
    and c.relname not like 'spatial_ref_sys%'
    and c.relname not like 'pg_%';

  return query
  select
    'definer_search_path_unset'::text,
    'medium'::text,
    p.proname::text,
    jsonb_build_object('args', pg_get_function_identity_arguments(p.oid))
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef = true
    and (p.proconfig is null
         or not exists (
           select 1 from unnest(p.proconfig) cfg
           where cfg like 'search_path=%'
         ));

  return query
  select
    'public_execute_on_internal_function'::text,
    'high'::text,
    p.proname::text,
    jsonb_build_object(
      'args', pg_get_function_identity_arguments(p.oid),
      'pattern', case
        when p.proname like 'harness\_%' then 'test harness'
        when p.proname like 'temp\_%' then 'one-shot migration'
        when p.proname in ('rls_auto_enable','seatly_call_cron_function','cleanup_stale_restaurant_drafts','handle_new_auth_user','sync_user_profile_from_auth') then 'internal admin'
        when p.proname like 'fn\_%' then 'trigger function'
        when p.proname like '\_%' then 'internal helper'
        else 'unknown'
      end
    )
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and (
      p.proname like 'harness\_%'
      or p.proname like 'temp\_%'
      or p.proname like 'fn\_%'
      or p.proname like '\_%'
      or p.proname in ('rls_auto_enable','seatly_call_cron_function','cleanup_stale_restaurant_drafts','handle_new_auth_user','sync_user_profile_from_auth')
    )
    and exists (
      select 1 from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
      where acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    );

  return query
  select
    'rls_policy_always_true'::text,
    'high'::text,
    (pol.polrelid::regclass::text || '.' || pol.polname)::text,
    jsonb_build_object(
      'cmd', pol.polcmd::text,
      'using', pg_get_expr(pol.polqual, pol.polrelid),
      'with_check', pg_get_expr(pol.polwithcheck, pol.polrelid),
      'roles', array(
        select r.rolname::text
        from pg_roles r
        where r.oid = any(pol.polroles)
      )
    )
  from pg_policy pol
  where (
    pg_get_expr(pol.polqual, pol.polrelid) = 'true'
    or pg_get_expr(pol.polwithcheck, pol.polrelid) = 'true'
  )
  and pol.polcmd in ('a', 'w', 'd', '*')
  and exists (
    select 1 from unnest(pol.polroles) role_oid
    join pg_roles r on r.oid = role_oid
    where r.rolname in ('anon', 'authenticated', 'public')
  );

  return query
  select
    'storage_bucket_listing_enabled'::text,
    'medium'::text,
    (polrelid::regclass::text || '.' || polname)::text,
    jsonb_build_object(
      'using', pg_get_expr(polqual, polrelid)
    )
  from pg_policy
  where polrelid = 'storage.objects'::regclass
    and polcmd = 'r'
    and pg_get_expr(polqual, polrelid) ~ '^\(?bucket_id = ''[^'']+''(::text)?\)?$';
end;
$fn$;

revoke execute on function public.run_security_check() from public;
