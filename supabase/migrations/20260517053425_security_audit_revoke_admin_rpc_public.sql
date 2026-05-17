-- Phase 3 audit (2026-05-17): Postgres CREATE FUNCTION default-grants
-- EXECUTE to PUBLIC. The earlier 20260517052252 migration revoked
-- from anon + authenticated explicitly but PUBLIC still had EXECUTE,
-- so the advisor (anon_security_definer_function_executable) still
-- flagged these on the next run. Revoking FROM PUBLIC closes the gap.
--
-- Service-role + postgres retain EXECUTE so cron / triggers / admin
-- tools keep working. Mobile + web clients (anon / authenticated
-- tokens) no longer reach these.

revoke execute on function public.cleanup_stale_restaurant_drafts() from public;
revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.harness_cancel_by_code(text) from public;
revoke execute on function public.harness_cancel_by_ids(uuid[]) from public;
revoke execute on function public.harness_cleanup_my_reservations() from public;
revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.seatly_call_cron_function(text) from public;
revoke execute on function public.sync_user_profile_from_auth() from public;
