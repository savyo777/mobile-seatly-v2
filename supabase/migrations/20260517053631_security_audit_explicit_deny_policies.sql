-- Phase 3 audit (2026-05-17): 9 tables had RLS enabled but no
-- policies — effectively deny-all to anon + authenticated, but the
-- advisor (lint 0008) flagged this because there's no explicit
-- statement of intent. Adding explicit "no access" policies documents
-- the design: writes go through SECURITY DEFINER service functions,
-- reads happen via service-role only (Supabase dashboard, edge
-- functions).

do $do$
declare
  t text;
  table_list text[] := array[
    'account_merge_audit',
    'auth_attempts',
    'availability_cache',
    'cenaiva_quality_audits',
    'crash_logs',
    'loyalty_waitlist',
    'paid_usage_buckets',
    'rate_limit_buckets',
    'rate_limit_control'
  ];
begin
  foreach t in array table_list loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('drop policy if exists "service_role_only_select" on public.%I', t);
      execute format(
        'create policy "service_role_only_select" on public.%I for select using (false)',
        t
      );
      execute format('drop policy if exists "service_role_only_insert" on public.%I', t);
      execute format(
        'create policy "service_role_only_insert" on public.%I for insert with check (false)',
        t
      );
      execute format('drop policy if exists "service_role_only_update" on public.%I', t);
      execute format(
        'create policy "service_role_only_update" on public.%I for update using (false) with check (false)',
        t
      );
      execute format('drop policy if exists "service_role_only_delete" on public.%I', t);
      execute format(
        'create policy "service_role_only_delete" on public.%I for delete using (false)',
        t
      );
    end if;
  end loop;
end
$do$;
