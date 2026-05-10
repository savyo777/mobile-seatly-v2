-- RETIRED: this migration was originally written assuming public.expenses
-- did not exist. It does — with a richer schema shared with the web app
-- (vendor_name / amount / total_amount / receipt_url / created_by FK to
-- user_profiles.id, plus payment_status, transaction_type, recurring_rule_id).
-- The receipt-scanner client in lib/expenses/* now writes to that
-- existing table directly. Keeping this file as a no-op so the migration
-- ledger stays linear; do NOT add new DDL here.
select 1 where false;
