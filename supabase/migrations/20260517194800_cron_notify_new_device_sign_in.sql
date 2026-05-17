-- Phase 4 hardening (2026-05-17): schedule the
-- notify-new-device-sign-in edge function to drain the alert queue
-- every 5 minutes. Uses the same cron-secret pattern as
-- send-reservation-reminders.

do $do$
begin
  if exists (
    select 1 from cron.job where jobname = 'notify-new-device-sign-in-5min'
  ) then
    perform cron.unschedule('notify-new-device-sign-in-5min');
  end if;
end $do$;

select
  cron.schedule(
    'notify-new-device-sign-in-5min',
    '*/5 * * * *',
    $cron$
    select
      net.http_post(
        url := 'https://exbjodmnpdiayfzrdyux.supabase.co/functions/v1/notify-new-device-sign-in',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret',
          (
            select decrypted_secret
            from vault.decrypted_secrets
            where name = 'reservation_reminder_cron_secret'
          )
        ),
        body := '{}'::jsonb
      );
    $cron$
  );
