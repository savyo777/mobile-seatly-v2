-- Phase 4 hardening (2026-05-17): weekly automated security scan.
--
-- Supabase's hosted advisor isn't directly callable via SQL, so this
-- migration builds a "lite advisor" that checks the same patterns we
-- already remediated. Runs weekly via pg_cron. Findings land in a
-- security_findings table.

create table if not exists public.security_findings (
  id uuid primary key default gen_random_uuid(),
  check_id text not null,
  severity text not null check (severity in ('critical','high','medium','low','info')),
  table_or_function text,
  detail jsonb,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  status text not null default 'open' check (status in ('open','acknowledged','resolved','accepted_risk')),
  acknowledged_by uuid,
  acknowledged_at timestamptz,
  notes text,
  unique (check_id, table_or_function)
);

create index if not exists security_findings_status_severity_idx
  on public.security_findings (status, severity, last_seen_at desc);

alter table public.security_findings enable row level security;
drop policy if exists "security_findings_deny_select" on public.security_findings;
create policy "security_findings_deny_select"
  on public.security_findings for select using (false);
drop policy if exists "security_findings_deny_insert" on public.security_findings;
create policy "security_findings_deny_insert"
  on public.security_findings for insert with check (false);
drop policy if exists "security_findings_deny_update" on public.security_findings;
create policy "security_findings_deny_update"
  on public.security_findings for update using (false) with check (false);
drop policy if exists "security_findings_deny_delete" on public.security_findings;
create policy "security_findings_deny_delete"
  on public.security_findings for delete using (false);

-- Initial implementation; superseded by
-- 20260517194350_weekly_security_check_reduce_false_positives.sql
-- which tightens checks 4 and 5. Kept for the migration trail.
-- The active version of run_security_check() is in the later migration.

-- See 20260517194350 for run_security_check() current body.

create or replace function public.record_security_findings()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_count_new int := 0;
  v_count_seen int := 0;
  v_count_resolved int := 0;
  v_run_at timestamptz := now();
begin
  with current_findings as (
    select * from public.run_security_check()
  ),
  upserted as (
    insert into public.security_findings (
      check_id, severity, table_or_function, detail, first_seen_at, last_seen_at
    )
    select check_id, severity, table_or_function, detail, v_run_at, v_run_at
    from current_findings
    on conflict (check_id, table_or_function) do update
    set last_seen_at = v_run_at,
        severity = excluded.severity,
        detail = excluded.detail,
        status = case
          when public.security_findings.status in ('resolved','acknowledged')
            and public.security_findings.last_seen_at < v_run_at - interval '1 day'
          then 'open'
          else public.security_findings.status
        end
    returning xmax = 0 as inserted
  )
  select count(*) filter (where inserted), count(*) into v_count_new, v_count_seen
  from upserted;

  update public.security_findings
  set status = 'resolved'
  where status = 'open'
    and last_seen_at < v_run_at - interval '7 days';
  get diagnostics v_count_resolved = row_count;

  insert into public.crash_logs (platform, app_version, route, message, context)
  values (
    'cron',
    null,
    'security-check',
    'Weekly security findings scan',
    jsonb_build_object(
      'new_findings', v_count_new,
      'total_seen', v_count_seen,
      'resolved_stale', v_count_resolved,
      'run_at', v_run_at
    )
  );

  return v_count_new;
end;
$fn$;

revoke execute on function public.record_security_findings() from public;

do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'weekly_security_check',
      '0 9 * * 1',
      $cron$ select public.record_security_findings() $cron$
    );
  end if;
exception when others then
  null;
end
$do$;
