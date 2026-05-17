-- Phase 3 audit (2026-05-17): trigger-only functions don't need
-- EXECUTE grants on the function itself — triggers run with the
-- trigger-owner's privileges. CREATE FUNCTION's default GRANT TO
-- PUBLIC exposes these to PostgREST RPC anyway, which is the
-- attack surface the advisor flagged. Revoking PUBLIC closes that
-- without breaking trigger execution.

revoke execute on function public.adjust_event_tickets_sold() from public;
revoke execute on function public.auto_attach_event_id_on_reservation() from public;
revoke execute on function public.enforce_publish_gate() from public;
revoke execute on function public.fn_increment_cancellation() from public;
revoke execute on function public.fn_increment_no_show() from public;
revoke execute on function public.fn_update_guest_totals() from public;
revoke execute on function public.fn_update_loyalty_balance() from public;
revoke execute on function public.fn_update_tickets_sold() from public;
revoke execute on function public.generate_confirmation_code() from public;
revoke execute on function public.refresh_restaurant_review_stats_trigger() from public;
revoke execute on function public.reservation_deposit_payments_set_updated_at() from public;
revoke execute on function public.reservation_deposit_settle_trigger() from public;
revoke execute on function public.reservation_holds_set_slot_range() from public;
revoke execute on function public.reservation_tables_set_slot_range() from public;
revoke execute on function public.reservations_propagate_slot_range() from public;
revoke execute on function public.reservations_set_slot_range() from public;
revoke execute on function public.update_receipts_updated_at() from public;
revoke execute on function public.handle_new_auth_user() from public;
revoke execute on function public.sync_user_profile_from_auth() from public;
