-- Phase 3 (2026-05-17): bound the crash_logs table.
--
-- Two protections:
--   (1) Per-user rate limit on insert_crash_log so a buggy release
--       can't fill the table with millions of duplicate errors. Cap at
--       100 inserts/hour/user when signed in. Anon callers are
--       skipped — they're rarer and the attack surface is smaller.
--   (2) Daily cron purge of rows older than 30 days.

create or replace function public.insert_crash_log(
  p_platform text,
  p_app_version text,
  p_build_number text,
  p_route text,
  p_message text,
  p_stack text,
  p_context jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $fn$
declare
  v_user_id uuid;
  v_recent_count int;
  v_per_user_hourly_cap constant int := 100;
begin
  if auth.uid() is not null then
    select id into v_user_id
    from public.user_profiles
    where auth_user_id = auth.uid()
    limit 1;
  end if;

  if v_user_id is not null then
    select count(*) into v_recent_count
    from public.crash_logs
    where user_id = v_user_id
      and occurred_at > now() - interval '1 hour';
    if v_recent_count >= v_per_user_hourly_cap then
      return;
    end if;
  end if;

  insert into public.crash_logs (
    user_id, platform, app_version, build_number, route, message, stack, context
  )
  values (
    v_user_id,
    nullif(left(coalesce(p_platform, ''), 32), ''),
    nullif(left(coalesce(p_app_version, ''), 32), ''),
    nullif(left(coalesce(p_build_number, ''), 32), ''),
    nullif(left(coalesce(p_route, ''), 200), ''),
    nullif(left(coalesce(p_message, ''), 2000), ''),
    nullif(left(coalesce(p_stack, ''), 16000), ''),
    p_context
  );
end;
$fn$;

revoke all on function public.insert_crash_log(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.insert_crash_log(text, text, text, text, text, text, jsonb) to anon, authenticated;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge_crash_logs_daily',
      '0 5 * * *',
      $cron$ delete from public.crash_logs where occurred_at < now() - interval '30 days' $cron$
    );
  end if;
exception when others then
  null;
end
$do$;
