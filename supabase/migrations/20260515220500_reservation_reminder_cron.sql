-- Schedule the 24h reservation reminder job. Runs every 15 minutes;
-- the edge function dedupes via communication_log so multiple invocations
-- within the window don't double-send.
--
-- Prerequisites (run BEFORE applying this migration):
--   1. Set the cron secret in Vault:
--        select vault.create_secret(
--          '<paste a strong random hex string>',
--          'reservation_reminder_cron_secret'
--        );
--      You must use the SAME value as RESERVATION_REMINDER_CRON_SECRET
--      configured in the edge function env (see .env.example).
--   2. Verify pg_cron + pg_net are available on this project (standard
--      on Supabase Pro plans).
--
-- To roll back:
--   select cron.unschedule('send-reservation-reminders-15min');
--   select vault.delete_secret('reservation_reminder_cron_secret');

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

do $$
begin
  if exists (
    select 1 from cron.job where jobname = 'send-reservation-reminders-15min'
  ) then
    perform cron.unschedule('send-reservation-reminders-15min');
  end if;
end $$;

select
  cron.schedule(
    'send-reservation-reminders-15min',
    '*/15 * * * *',
    $cron$
    select
      net.http_post(
        url := 'https://exbjodmnpdiayfzrdyux.supabase.co/functions/v1/send-reservation-reminders',
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
