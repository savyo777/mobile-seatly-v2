-- Add nullable contact columns to `waitlist` so the staff "Notify ready"
-- action can SMS or email the guest. Existing rows are untouched.
--
-- Precheck (optional, run before applying):
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'waitlist' AND column_name IN ('guest_phone','guest_email');
-- Expected: zero rows before apply, two rows after.

ALTER TABLE public.waitlist
  ADD COLUMN IF NOT EXISTS guest_phone text,
  ADD COLUMN IF NOT EXISTS guest_email text;

COMMENT ON COLUMN public.waitlist.guest_phone IS 'E.164 phone (or raw if not yet normalized) used for table-ready SMS.';
COMMENT ON COLUMN public.waitlist.guest_email IS 'Email used as fallback when SMS not available.';
