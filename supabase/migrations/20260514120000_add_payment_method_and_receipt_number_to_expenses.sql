-- Adds two extraction fields surfaced by the receipt scanner: how the
-- receipt was paid (e.g. "visa ****4242", "cash") and the receipt's own
-- printed order/transaction number. Both nullable — real receipts often
-- lack either.
--
-- Precheck (run before applying):
--   SELECT count(*) FROM public.expenses;
-- Expected: 0 or more rows. If the query errors with "relation
-- public.expenses does not exist", do NOT run this migration.

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS payment_method text NULL,
  ADD COLUMN IF NOT EXISTS receipt_number text NULL;
