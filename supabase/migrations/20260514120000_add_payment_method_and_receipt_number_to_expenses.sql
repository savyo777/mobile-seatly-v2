-- Adds the payment method surfaced by the receipt scanner (e.g.
-- "visa ****4242", "cash"). Nullable — real receipts often lack it.
--
-- Precheck (run before applying):
--   SELECT count(*) FROM public.expenses;
-- Expected: 0 or more rows. If the query errors with "relation
-- public.expenses does not exist", do NOT run this migration.
--
-- Note: an earlier draft of this file also added a receipt_number column.
-- That field was scoped out before deployment. The DROP COLUMN below is
-- idempotent — safe whether or not you applied the previous draft.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_method text NULL;

ALTER TABLE public.expenses
  DROP COLUMN IF EXISTS receipt_number;
