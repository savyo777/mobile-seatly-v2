-- Security audit Phase 1.4 — server-side login lockout.
--
-- The previous implementation tracked failed login attempts in
-- AsyncStorage on the device. An attacker could clear app data,
-- reinstall, or simply use a different device to bypass the limit
-- entirely. This migration moves the source of truth to the server
-- while keeping the existing client-side UX (lockout banner + reset
-- email) intact.
--
-- The mobile client calls record_auth_attempt(email, success) after
-- every login outcome. The RPC records the attempt + returns the
-- caller's current lockout state. The client respects the returned
-- locked_until timestamp; AsyncStorage stays only as an
-- offline-friendly cache.
--
-- Defense in depth: this works alongside Supabase Auth's built-in
-- rate limits (configured in the Auth dashboard). Even a client that
-- bypasses record_auth_attempt entirely (and hits signInWithPassword
-- directly) is still throttled at the auth provider level.
--
-- Apply via the Supabase SQL editor.

-- 1. The attempt log.
create table if not exists public.auth_attempts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  success boolean not null,
  attempted_at timestamptz not null default now()
);

create index if not exists auth_attempts_email_attempted_idx
  on public.auth_attempts (email, attempted_at desc);

-- 2. RLS. Anon + authenticated cannot SELECT directly — they call the
-- RPC, which is SECURITY DEFINER and bypasses RLS. No direct write
-- access either.
alter table public.auth_attempts enable row level security;
-- (No SELECT/INSERT/UPDATE/DELETE policies for anon/authenticated.
-- Only service_role + the SECURITY DEFINER function below touch rows.)

-- 3. The record RPC. Anon-callable so unauthenticated login attempts
-- can be tracked. SECURITY DEFINER so anon callers don't need INSERT
-- on the table directly.
--
-- Returns one row with the post-attempt lockout state:
--   locked_until        — null if not locked, else timestamptz
--   attempts_remaining  — failures available before lockout triggers
create or replace function public.record_auth_attempt(
  p_email text,
  p_success boolean
) returns table (
  locked_until timestamptz,
  attempts_remaining int
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_normalized_email text := lower(trim(coalesce(p_email, '')));
  v_window interval := interval '15 minutes';
  v_max_failures int := 5;
  v_failure_count int;
  v_oldest_attempt_in_window timestamptz;
begin
  if v_normalized_email = '' then
    locked_until := null;
    attempts_remaining := v_max_failures;
    return next;
    return;
  end if;

  -- Record this attempt. Truncate the email to 320 chars (RFC 3696 cap)
  -- so a malicious caller can't bloat the table with megabyte strings.
  insert into auth_attempts (email, success)
  values (left(v_normalized_email, 320), p_success);

  -- A successful login doesn't change lockout state; just acknowledge.
  if p_success then
    locked_until := null;
    attempts_remaining := v_max_failures;
    return next;
    return;
  end if;

  -- Count failures within the window.
  select count(*), min(attempted_at)
    into v_failure_count, v_oldest_attempt_in_window
  from auth_attempts
  where email = v_normalized_email
    and success = false
    and attempted_at > now() - v_window;

  if v_failure_count >= v_max_failures then
    locked_until := coalesce(v_oldest_attempt_in_window, now()) + v_window;
  else
    locked_until := null;
  end if;

  attempts_remaining := greatest(0, v_max_failures - v_failure_count);
  return next;
end;
$$;

revoke all on function public.record_auth_attempt(text, boolean) from public;
grant execute on function public.record_auth_attempt(text, boolean) to anon, authenticated;

comment on table public.auth_attempts is
  'Server-side login attempt log. Insert via record_auth_attempt RPC; RLS-blocked from direct client access.';
comment on function public.record_auth_attempt(text, boolean) is
  'Records a login attempt by email and returns the caller''s current lockout state. Idempotent — call once per attempt.';

-- 4. Auto-purge attempts older than 90 days so the table stays bounded.
-- Daily cron via pg_cron (no-op if pg_cron unavailable).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge_auth_attempts_daily',
      '0 4 * * *',
      $$ delete from public.auth_attempts where attempted_at < now() - interval '90 days' $$
    );
  end if;
exception when others then
  -- pg_cron not available or already scheduled — non-fatal.
  null;
end$$;
