-- Phase 4 hardening (2026-05-17): idempotency guard for Stripe webhooks.
--
-- Stripe retries failed webhook deliveries with the same event_id. If
-- the handler processes the same event twice, we get double-refunds,
-- double-credits, duplicate communication_log rows, etc. The fix is
-- to record every event_id we've seen and refuse to re-process.
--
-- Integration: see docs/STRIPE_WEBHOOK_IDEMPOTENCY.md for the snippet
-- the web team's stripe-webhook function should call.

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  received_at timestamptz not null default now(),
  request_id text,
  source text
);

create index if not exists stripe_webhook_events_type_received_idx
  on public.stripe_webhook_events (event_type, received_at desc);

alter table public.stripe_webhook_events enable row level security;
drop policy if exists "stripe_webhook_events_deny_select" on public.stripe_webhook_events;
create policy "stripe_webhook_events_deny_select"
  on public.stripe_webhook_events for select using (false);
drop policy if exists "stripe_webhook_events_deny_insert" on public.stripe_webhook_events;
create policy "stripe_webhook_events_deny_insert"
  on public.stripe_webhook_events for insert with check (false);
drop policy if exists "stripe_webhook_events_deny_update" on public.stripe_webhook_events;
create policy "stripe_webhook_events_deny_update"
  on public.stripe_webhook_events for update using (false) with check (false);
drop policy if exists "stripe_webhook_events_deny_delete" on public.stripe_webhook_events;
create policy "stripe_webhook_events_deny_delete"
  on public.stripe_webhook_events for delete using (false);

create or replace function public.process_stripe_event_once(
  p_event_id text,
  p_event_type text,
  p_request_id text default null,
  p_source text default null
)
returns boolean
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_inserted boolean := false;
begin
  if p_event_id is null or p_event_id = '' then
    return false;
  end if;
  insert into public.stripe_webhook_events (event_id, event_type, request_id, source)
  values (p_event_id, coalesce(p_event_type, 'unknown'), p_request_id, p_source)
  on conflict (event_id) do nothing
  returning true into v_inserted;
  return coalesce(v_inserted, false);
end;
$fn$;

revoke execute on function public.process_stripe_event_once(text, text, text, text) from public;
grant execute on function public.process_stripe_event_once(text, text, text, text) to service_role;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge_stripe_webhook_events_monthly',
      '0 7 * * *',
      $cron$ delete from public.stripe_webhook_events where received_at < now() - interval '60 days' $cron$
    );
  end if;
exception when others then
  null;
end
$do$;

comment on table public.stripe_webhook_events is
  'Idempotency log for Stripe webhook deliveries.';
comment on function public.process_stripe_event_once(text, text, text, text) is
  'Returns true on first-time-seen event_id, false on duplicate.';
