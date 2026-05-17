-- Phase 4 hardening (2026-05-17): track sign-in events and queue
-- "new device" email alerts.
--
-- The mobile app calls record_sign_in() after every successful sign-in.
-- The RPC inserts an auth_sign_in_events row and detects whether the
-- device_fingerprint has been seen before for this user. When it's
-- new, an alert is queued; the notify-new-device-sign-in edge
-- function drains the queue and sends the email via sendSmsOrEmail.

create table if not exists public.auth_sign_in_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  device_fingerprint text not null,
  platform text,
  app_version text,
  user_agent text,
  ip_inet inet,
  occurred_at timestamptz not null default now(),
  is_new_device boolean not null default false,
  alert_dispatched_at timestamptz
);

create index if not exists auth_sign_in_events_user_occurred_idx
  on public.auth_sign_in_events (user_id, occurred_at desc);
create index if not exists auth_sign_in_events_user_fingerprint_idx
  on public.auth_sign_in_events (user_id, device_fingerprint);

alter table public.auth_sign_in_events enable row level security;

drop policy if exists "auth_sign_in_events_user_can_read_own" on public.auth_sign_in_events;
create policy "auth_sign_in_events_user_can_read_own"
  on public.auth_sign_in_events for select
  to authenticated
  using (
    auth.uid() = (
      select up.auth_user_id from public.user_profiles up where up.id = auth_sign_in_events.user_id limit 1
    )
  );

drop policy if exists "auth_sign_in_events_deny_insert" on public.auth_sign_in_events;
create policy "auth_sign_in_events_deny_insert"
  on public.auth_sign_in_events for insert with check (false);
drop policy if exists "auth_sign_in_events_deny_update" on public.auth_sign_in_events;
create policy "auth_sign_in_events_deny_update"
  on public.auth_sign_in_events for update using (false) with check (false);
drop policy if exists "auth_sign_in_events_deny_delete" on public.auth_sign_in_events;
create policy "auth_sign_in_events_deny_delete"
  on public.auth_sign_in_events for delete using (false);

create table if not exists public.security_alert_queue (
  id uuid primary key default gen_random_uuid(),
  sign_in_event_id uuid not null references public.auth_sign_in_events(id) on delete cascade,
  alert_type text not null check (alert_type in ('new_device_sign_in')),
  status text not null default 'pending' check (status in ('pending','sent','failed','skipped')),
  attempts int not null default 0,
  last_attempt_at timestamptz,
  queued_at timestamptz not null default now(),
  sent_at timestamptz,
  error text
);

create index if not exists security_alert_queue_status_queued_idx
  on public.security_alert_queue (status, queued_at)
  where status = 'pending';

alter table public.security_alert_queue enable row level security;
drop policy if exists "security_alert_queue_deny_select" on public.security_alert_queue;
create policy "security_alert_queue_deny_select"
  on public.security_alert_queue for select using (false);
drop policy if exists "security_alert_queue_deny_insert" on public.security_alert_queue;
create policy "security_alert_queue_deny_insert"
  on public.security_alert_queue for insert with check (false);
drop policy if exists "security_alert_queue_deny_update" on public.security_alert_queue;
create policy "security_alert_queue_deny_update"
  on public.security_alert_queue for update using (false) with check (false);
drop policy if exists "security_alert_queue_deny_delete" on public.security_alert_queue;
create policy "security_alert_queue_deny_delete"
  on public.security_alert_queue for delete using (false);

create or replace function public.record_sign_in(
  p_device_fingerprint text,
  p_platform text default null,
  p_app_version text default null,
  p_user_agent text default null
) returns table (
  event_id uuid,
  is_new_device boolean
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_auth_user_id uuid;
  v_profile_id uuid;
  v_is_new_device boolean;
  v_event_id uuid;
begin
  v_auth_user_id := auth.uid();
  if v_auth_user_id is null then return; end if;

  if p_device_fingerprint is null or length(trim(p_device_fingerprint)) = 0 then
    return;
  end if;

  select id into v_profile_id
  from public.user_profiles
  where auth_user_id = v_auth_user_id
  limit 1;
  if v_profile_id is null then return; end if;

  v_is_new_device := not exists (
    select 1 from public.auth_sign_in_events
    where user_id = v_profile_id
      and device_fingerprint = p_device_fingerprint
  );

  insert into public.auth_sign_in_events (
    user_id, device_fingerprint, platform, app_version, user_agent,
    is_new_device, occurred_at
  ) values (
    v_profile_id,
    left(p_device_fingerprint, 200),
    nullif(left(coalesce(p_platform, ''), 32), ''),
    nullif(left(coalesce(p_app_version, ''), 32), ''),
    nullif(left(coalesce(p_user_agent, ''), 500), ''),
    v_is_new_device,
    now()
  )
  returning id into v_event_id;

  if v_is_new_device and exists (
    select 1 from public.auth_sign_in_events
    where user_id = v_profile_id and id != v_event_id
  ) then
    insert into public.security_alert_queue (sign_in_event_id, alert_type)
    values (v_event_id, 'new_device_sign_in');
  end if;

  return query select v_event_id, v_is_new_device;
end;
$fn$;

revoke execute on function public.record_sign_in(text, text, text, text) from public;
grant execute on function public.record_sign_in(text, text, text, text) to authenticated;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge_auth_sign_in_events_yearly',
      '0 8 * * *',
      $cron$ delete from public.auth_sign_in_events where occurred_at < now() - interval '1 year' $cron$
    );
    perform cron.schedule(
      'purge_security_alert_queue_old',
      '0 8 * * *',
      $cron$ delete from public.security_alert_queue where queued_at < now() - interval '90 days' and status in ('sent','failed','skipped') $cron$
    );
  end if;
exception when others then
  null;
end
$do$;
