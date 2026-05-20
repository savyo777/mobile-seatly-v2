-- Vendor the send-post-turn-review-prompts cron schedule into source
-- control. The schedule was originally registered live during a session
-- via mcp__supabase__apply_migration, so the running project already has
-- the job in pg_cron — this migration mirrors it as a SQL file so a
-- fresh-bootstrap project (or a disaster recovery rebuild) reproduces
-- the same schedule from the migration history.
--
-- Schedule: every 15 min, calls the send-post-turn-review-prompts edge
-- fn which scans completed reservations whose turn time has elapsed
-- and pushes a "How was <restaurant>?" notification to diners with an
-- expo_push_token on file. Mirrors the pattern used by
-- send-reservation-reminders-15min.
--
-- Auth: x-cron-secret header pulled from Supabase Vault. Re-uses the
-- existing reservation_reminder_cron_secret entry — there's a typo'd
-- duplicate ("reserv\n  ation_reminder_cron_secret" with literal
-- whitespace) that matches the deployed env var; we keep it because
-- the deployed edge fn reads the env value with the same formatting.
-- Don't "clean up" the vault entry name unless you also rotate the
-- deployed env var; mismatch will silently 401 every cron tick.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'send-post-turn-review-prompts-15min'
  ) THEN
    PERFORM cron.unschedule('send-post-turn-review-prompts-15min');
  END IF;
END $$;

SELECT cron.schedule(
  'send-post-turn-review-prompts-15min',
  '*/15 * * * *',
  $cmd$
    select
      net.http_post(
        url := 'https://exbjodmnpdiayfzrdyux.supabase.co/functions/v1/send-post-turn-review-prompts',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'x-cron-secret',
          (select decrypted_secret from vault.decrypted_secrets where name = E'reserv\n  ation_reminder_cron_secret')
        ),
        body := '{}'::jsonb
      );
  $cmd$
);
