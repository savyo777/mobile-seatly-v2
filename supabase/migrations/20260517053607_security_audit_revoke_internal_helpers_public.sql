-- Phase 3 audit (2026-05-17): revoke PUBLIC EXECUTE on internal
-- helpers that exist for trigger / CRM / availability computation
-- but were unnecessarily exposed via PostgREST RPC by Postgres's
-- default GRANT TO PUBLIC.

revoke execute on function public._availability_find_special_day(jsonb, text) from public;
revoke execute on function public._availability_parse_time_to_minutes(text) from public;
revoke execute on function public._availability_read_hours_pair(jsonb) from public;

revoke execute on function public.crm_normalized_email(text) from public;
revoke execute on function public.crm_normalized_phone(text) from public;
revoke execute on function public.crm_segment_for_guest(boolean, integer) from public;

revoke execute on function public.validate_deposit_tiers(jsonb) from public;

revoke execute on function public.match_availability_alerts_for_event(uuid) from public;
revoke execute on function public.match_availability_alerts_for_restaurant(uuid, timestamp with time zone, integer) from public;
revoke execute on function public.refresh_restaurant_popularity() from public;
revoke execute on function public.write_staff_audit_event(uuid, text, text, uuid, jsonb, jsonb, uuid) from public;
