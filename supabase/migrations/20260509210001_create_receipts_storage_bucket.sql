-- RETIRED: the `receipts` bucket and its RLS policies were already created
-- on the project before this migration was written. See the storage
-- dashboard for the live policies. Receipt-scanner uploads use this
-- bucket via lib/storage/buckets.ts. Keeping this file as a no-op so the
-- migration ledger stays linear.
select 1 where false;
