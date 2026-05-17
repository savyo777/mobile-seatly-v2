-- Security audit (2026-05-17): revoke anon + authenticated EXECUTE on
-- admin / test / trigger-only RPCs that were inadvertently exposed
-- through PostgREST. None of these should be callable from a client.
--
-- Superseded in practice by 20260517053425_security_audit_revoke_admin_rpc_public.sql
-- (Postgres default-grants to PUBLIC, which transitively covers anon
-- and authenticated — explicit role revokes alone weren't enough).
-- Keeping this migration in the chain for audit-trail clarity.

revoke execute on function public.cleanup_stale_restaurant_drafts() from anon, authenticated;
revoke execute on function public.handle_new_auth_user() from anon, authenticated;
revoke execute on function public.harness_cancel_by_code(text) from anon, authenticated;
revoke execute on function public.harness_cancel_by_ids(uuid[]) from anon, authenticated;
revoke execute on function public.harness_cleanup_my_reservations() from anon, authenticated;
revoke execute on function public.rls_auto_enable() from anon, authenticated;
revoke execute on function public.seatly_call_cron_function(text) from anon, authenticated;
revoke execute on function public.sync_user_profile_from_auth() from anon, authenticated;
