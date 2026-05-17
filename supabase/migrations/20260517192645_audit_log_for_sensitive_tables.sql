-- Audit log for sensitive tables. Phase 4 hardening (2026-05-17).
--
-- Captures every INSERT / UPDATE / DELETE on the tables that drive
-- revenue, identity, or money flow. Stored in a write-only audit_log
-- table that anon and authenticated can never read. Service-role only
-- reads, via the Supabase dashboard or admin scripts.
--
-- Value: forensics. If something goes wrong (compromised account,
-- mysterious data change, financial discrepancy), the audit log
-- shows exactly who changed what and when.
--
-- Cost: every write to a tracked table writes a second row to
-- audit_log. For the volume this app handles, well under 1% storage
-- overhead. 1-year auto-purge keeps the table bounded.

-- 1. The table.
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  occurred_at timestamptz not null default now(),
  acting_user_id uuid,
  acting_role text,
  table_name text not null,
  operation text not null check (operation in ('INSERT', 'UPDATE', 'DELETE')),
  row_id uuid,
  changed_columns jsonb,
  full_old jsonb,
  full_new jsonb
);

create index if not exists audit_log_table_occurred_idx
  on public.audit_log (table_name, occurred_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (acting_user_id, occurred_at desc);
create index if not exists audit_log_row_idx
  on public.audit_log (row_id, occurred_at desc);

-- 2. RLS — explicit deny-all. Service-role bypasses; no other reader.
alter table public.audit_log enable row level security;
drop policy if exists "audit_log_service_role_only_select" on public.audit_log;
create policy "audit_log_service_role_only_select"
  on public.audit_log for select using (false);
drop policy if exists "audit_log_service_role_only_insert" on public.audit_log;
create policy "audit_log_service_role_only_insert"
  on public.audit_log for insert with check (false);
drop policy if exists "audit_log_service_role_only_update" on public.audit_log;
create policy "audit_log_service_role_only_update"
  on public.audit_log for update using (false) with check (false);
drop policy if exists "audit_log_service_role_only_delete" on public.audit_log;
create policy "audit_log_service_role_only_delete"
  on public.audit_log for delete using (false);

-- 3. The trigger function. SECURITY DEFINER so it writes to audit_log
-- regardless of the calling user's RLS perspective.
create or replace function public.audit_log_trigger_fn()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $fn$
declare
  v_acting_user_id uuid;
  v_acting_role text;
  v_row_id uuid;
  v_old_jsonb jsonb;
  v_new_jsonb jsonb;
  v_changed_cols jsonb := null;
begin
  begin
    v_acting_user_id := auth.uid();
  exception when others then
    v_acting_user_id := null;
  end;
  v_acting_role := current_setting('request.jwt.claim.role', true);
  if v_acting_role is null or v_acting_role = '' then
    v_acting_role := current_user;
  end if;

  if (TG_OP = 'DELETE') then
    v_old_jsonb := to_jsonb(OLD);
    v_row_id := nullif(v_old_jsonb->>'id', '')::uuid;
  elsif (TG_OP = 'UPDATE') then
    v_old_jsonb := to_jsonb(OLD);
    v_new_jsonb := to_jsonb(NEW);
    v_row_id := nullif(v_new_jsonb->>'id', '')::uuid;
    select jsonb_object_agg(
             key,
             jsonb_build_object('old', v_old_jsonb->key, 'new', v_new_jsonb->key)
           )
      into v_changed_cols
    from jsonb_each(v_new_jsonb) e(key, val)
    where v_old_jsonb->key is distinct from v_new_jsonb->key;
    if v_changed_cols is null or v_changed_cols = '{}'::jsonb then
      return NEW;
    end if;
  elsif (TG_OP = 'INSERT') then
    v_new_jsonb := to_jsonb(NEW);
    v_row_id := nullif(v_new_jsonb->>'id', '')::uuid;
  end if;

  insert into public.audit_log (
    acting_user_id, acting_role, table_name, operation, row_id,
    changed_columns, full_old, full_new
  ) values (
    v_acting_user_id, v_acting_role, TG_TABLE_NAME::text, TG_OP,
    v_row_id, v_changed_cols, v_old_jsonb, v_new_jsonb
  );

  if (TG_OP = 'DELETE') then return OLD; else return NEW; end if;
end;
$fn$;

revoke execute on function public.audit_log_trigger_fn() from public;

-- 4. Attach triggers to every sensitive table that exists.
do $do$
declare
  t text;
  table_list text[] := array[
    'restaurants',
    'user_profiles',
    'reservations',
    'orders',
    'payments',
    'saved_cards',
    'reservation_holds'
  ];
begin
  foreach t in array table_list loop
    if exists (
      select 1 from information_schema.tables
      where table_schema = 'public' and table_name = t
    ) then
      execute format('drop trigger if exists audit_log_trigger on public.%I', t);
      execute format(
        'create trigger audit_log_trigger after insert or update or delete on public.%I for each row execute function public.audit_log_trigger_fn()',
        t
      );
    end if;
  end loop;
end
$do$;

-- 5. Auto-purge audit_log rows older than 1 year.
do $do$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule(
      'purge_audit_log_yearly',
      '0 6 * * *',
      $cron$ delete from public.audit_log where occurred_at < now() - interval '1 year' $cron$
    );
  end if;
exception when others then
  null;
end
$do$;

comment on table public.audit_log is
  'Append-only audit trail for sensitive tables. Insert via trigger; service-role only read.';
