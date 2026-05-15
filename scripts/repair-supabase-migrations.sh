#!/usr/bin/env bash
# Repair Supabase migration history so we can push the Twilio migrations.
#
# Situation: the remote `supabase_migrations.schema_migrations` table
# tracks ~140 migration versions whose .sql files are not present in
# `supabase/migrations/` (they live in an older repo). Conversely, our
# local folder has 13 older migrations that aren't tracked on remote,
# plus the two new Twilio migrations we actually want to push.
#
# What this script does:
#   1. Asks `supabase migration list --linked` to enumerate the diff.
#   2. For each REMOTE-ONLY version → `migration repair --status reverted`
#      This removes the row from the tracking table. The schema changes
#      that migration made remain in place — only the tracking forgets it.
#   3. For each LOCAL-ONLY older migration (timestamp < 20260515220000)
#      → `migration repair --status applied`
#      This inserts a tracking row WITHOUT running the .sql. Safe because
#      these files are committed in git but were never pushed; their
#      schema changes either already exist on remote (under different
#      version numbers) or are not load-bearing. If you'd rather have
#      them ACTUALLY APPLIED, abort this script and run them individually
#      with `npx supabase db push --include-all` first.
#   4. `db push` — applies ONLY the two Twilio migrations
#      (20260515220000_waitlist_add_contact_columns.sql and
#       20260515220500_reservation_reminder_cron.sql).
#   5. Deploys the three Twilio edge functions.
#
# This script is idempotent and stops on first error. You can re-run it
# safely after fixing a problem.
#
# Required: project must be `supabase link`-ed.

set -euo pipefail

cd "$(dirname "$0")/.."

# The cutoff: any local-only migration older than this gets marked applied
# without running. Our two new Twilio migrations are at and after this.
TWILIO_CUTOFF="20260515220000"

echo "=========================================="
echo "Step 1/5: Capturing migration diff"
echo "=========================================="

# Pull migration list once. Parse columnar output into "local,remote" rows.
LIST_OUTPUT=$(npx supabase migration list --linked 2>&1)

DIFF=$(echo "$LIST_OUTPUT" | awk -F'|' '
  NF >= 3 {
    local = $1
    remote = $2
    gsub(/[[:space:]]/, "", local)
    gsub(/[[:space:]]/, "", remote)
    if (local ~ /^[0-9]{14}$/ || remote ~ /^[0-9]{14}$/) {
      print local "," remote
    }
  }
')

REMOTE_ONLY=$(echo "$DIFF" | awk -F',' '$1 == "" && $2 != "" { print $2 }')
LOCAL_ONLY=$(echo "$DIFF" | awk -F',' '$1 != "" && $2 == "" { print $1 }')

# Split LOCAL_ONLY at the Twilio cutoff
LOCAL_ONLY_OLD=$(echo "$LOCAL_ONLY" | awk -v cutoff="$TWILIO_CUTOFF" '$1 < cutoff')
LOCAL_ONLY_NEW=$(echo "$LOCAL_ONLY" | awk -v cutoff="$TWILIO_CUTOFF" '$1 >= cutoff')

REMOTE_COUNT=$(echo "$REMOTE_ONLY" | grep -c . || true)
OLD_COUNT=$(echo "$LOCAL_ONLY_OLD" | grep -c . || true)
NEW_COUNT=$(echo "$LOCAL_ONLY_NEW" | grep -c . || true)

echo ""
echo "Remote-only versions (will mark REVERTED):   $REMOTE_COUNT"
echo "Older local-only versions (will mark APPLIED): $OLD_COUNT"
echo "New Twilio migrations (will be PUSHED):       $NEW_COUNT"
echo ""
echo "Local-only NEW (to be pushed):"
echo "$LOCAL_ONLY_NEW" | sed 's/^/  /'
echo ""
echo "Local-only OLD (to be marked applied without running):"
echo "$LOCAL_ONLY_OLD" | sed 's/^/  /'
echo ""
read -p "Proceed with repair? [y/N] " ok
if [[ "${ok:-}" != "y" && "${ok:-}" != "Y" ]]; then
  echo "Aborted."
  exit 1
fi

echo ""
echo "=========================================="
echo "Step 2/5: Marking remote-only versions REVERTED"
echo "=========================================="

for v in $REMOTE_ONLY; do
  echo "  reverted $v"
  npx supabase migration repair --linked --status reverted "$v"
done

echo ""
echo "=========================================="
echo "Step 3/5: Marking older local versions APPLIED"
echo "=========================================="

for v in $LOCAL_ONLY_OLD; do
  echo "  applied $v"
  npx supabase migration repair --linked --status applied "$v"
done

echo ""
echo "=========================================="
echo "Step 4/5: Pushing the Twilio migrations"
echo "=========================================="

npx supabase db push --linked

echo ""
echo "=========================================="
echo "Step 5/5: Deploying the three Twilio edge functions"
echo "=========================================="

npx supabase functions deploy create-public-booking
npx supabase functions deploy send-waitlist-ready-sms
npx supabase functions deploy send-reservation-reminders

echo ""
echo "Done. Twilio migrations + functions are now live."
echo ""
echo "Reminder: before the cron actually runs, you still need to:"
echo "  1. Create the Vault secret matching RESERVATION_REMINDER_CRON_SECRET:"
echo "     psql \"\$DB_URL\" -c \"select vault.create_secret('<hex>','reservation_reminder_cron_secret');\""
echo "  2. Set the same value as an edge function env var:"
echo "     npx supabase secrets set RESERVATION_REMINDER_CRON_SECRET=<hex>"
