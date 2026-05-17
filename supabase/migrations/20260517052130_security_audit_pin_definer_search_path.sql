-- Security audit (2026-05-17): pin search_path on the 13 functions
-- flagged by Supabase's security advisor (lint 0011 mutable search_path).
--
-- Why: when a SECURITY DEFINER function runs with a mutable search_path,
-- a caller can create their own schema with shadow tables / functions
-- earlier in the path and trick the definer into using them (privilege
-- escalation). Even for SECURITY INVOKER functions, pinning the path is
-- good hygiene — prevents accidental cross-schema lookups.
--
-- search_path = 'pg_catalog, public' is the standard "trusted only"
-- recommendation. pg_catalog first so built-ins resolve, then public
-- so the function's own dependencies resolve.

do $do$
declare
  fn_name text;
  fn_names text[] := array[
    'update_receipts_updated_at',
    'enforce_publish_gate',
    'crm_normalized_email',
    'validate_deposit_tiers',
    'cleanup_stale_restaurant_drafts',
    'reservation_deposit_payments_set_updated_at',
    'crm_segment_for_guest',
    '_availability_find_special_day',
    'crm_normalized_phone',
    'auto_attach_event_id_on_reservation',
    'reservations_set_slot_range',
    '_availability_parse_time_to_minutes',
    '_availability_read_hours_pair'
  ];
  oid_record record;
begin
  foreach fn_name in array fn_names loop
    for oid_record in
      select p.oid, pg_get_function_identity_arguments(p.oid) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = fn_name
    loop
      execute format(
        'alter function public.%I(%s) set search_path = pg_catalog, public',
        fn_name,
        oid_record.args
      );
    end loop;
  end loop;
end
$do$;
