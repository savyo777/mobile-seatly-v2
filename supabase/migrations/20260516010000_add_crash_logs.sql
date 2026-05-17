-- In-house crash logger. The mobile app posts JS / RN runtime errors to
-- this table via the insert_crash_log RPC. There's no Sentry, no third-
-- party SDK — just stack + route + user id + platform + app version so
-- you can read "what's breaking" via SQL.
--
-- Pre-check (run first; if this returns a row the table already exists
-- and you can skip the CREATE):
--
--   select 1 from information_schema.tables
--   where table_schema='public' and table_name='crash_logs';

-- 1. The table.
create table if not exists public.crash_logs (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  user_id uuid references public.user_profiles(id) on delete set null,
  platform text,                    -- 'ios' | 'android' | 'web'
  app_version text,                 -- expoConfig.version
  build_number text,                -- expoConfig.ios.buildNumber or android.versionCode
  route text,                       -- usePathname() at crash time
  message text,                     -- error.message (truncated to ~2KB in code)
  stack text,                       -- error.stack (truncated to ~16KB)
  context jsonb,                    -- caller-provided extras (any shape)
  created_at timestamptz not null default now()
);

-- 2. Index for the most common queries — "top crashes in the last 24h
-- grouped by platform / version / route".
create index if not exists crash_logs_occurred_idx
  on public.crash_logs (occurred_at desc);
create index if not exists crash_logs_grouping_idx
  on public.crash_logs (platform, app_version, route, occurred_at desc);

-- 3. RLS — service-role can SELECT (you query via the Supabase dashboard,
-- which uses service-role). Nobody else can read crashes. Inserts go via
-- the SECURITY DEFINER RPC below so anon / authenticated never get direct
-- write rights on the row.
alter table public.crash_logs enable row level security;

-- (No SELECT / INSERT / UPDATE / DELETE policies for anon or authenticated.
-- This is intentional — the RPC is the only write path; reads are dashboard-
-- only via service-role which bypasses RLS.)

-- 4. The insert RPC. Anon-callable (signed-in or signed-out users can both
-- crash). SECURITY DEFINER so callers don't need INSERT rights on the row.
-- Truncates message + stack inputs to bounded sizes so a bad caller can't
-- bloat the table.
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
set search_path = public
as $$
declare
  v_user_id uuid;
begin
  -- Map auth.uid() → user_profiles.id when the caller is signed in.
  -- user_profiles.id is the FK target; auth_user_id holds auth.uid().
  if auth.uid() is not null then
    select id into v_user_id
    from public.user_profiles
    where auth_user_id = auth.uid()
    limit 1;
  end if;

  insert into public.crash_logs (
    user_id,
    platform,
    app_version,
    build_number,
    route,
    message,
    stack,
    context
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
$$;

revoke all on function public.insert_crash_log(text, text, text, text, text, text, jsonb) from public;
grant execute on function public.insert_crash_log(text, text, text, text, text, text, jsonb)
  to anon, authenticated;

comment on table public.crash_logs is
  'Mobile-app crash + unhandled-rejection captures. Insert via insert_crash_log RPC; read via Supabase dashboard (service-role).';
comment on function public.insert_crash_log(text, text, text, text, text, text, jsonb) is
  'Captures a single crash event from the mobile app. SECURITY DEFINER so anon / authenticated callers do not need INSERT rights on crash_logs. Truncates string fields to bounded sizes.';
