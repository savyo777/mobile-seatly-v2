-- Security audit (2026-05-17): the demo_requests_anon_insert policy
-- had WITH CHECK = true so any anon caller could insert arbitrary
-- rows. Spam vector / abuse vector. Flagged by Supabase lint 0024
-- (rls_policy_always_true).
--
-- Tightens the policy with cheap last-mile validation: non-empty name,
-- valid-looking email shape, length caps on every field. The
-- submit-demo-request edge function does deeper validation (rate
-- limits, captcha, etc.) — this is the RLS-level safety net for direct
-- PostgREST inserts.

drop policy if exists demo_requests_anon_insert on public.demo_requests;

create policy demo_requests_anon_insert
  on public.demo_requests
  for insert
  to anon
  with check (
    length(trim(name)) between 1 and 200
    and name !~ E'[\\r\\n]'
    and length(email) between 5 and 320
    and email ~* '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$'
    and (phone is null or length(phone) between 5 and 32)
    and (restaurant_name is null or length(restaurant_name) between 1 and 200)
    and (message is null or length(message) between 1 and 2000)
    and (contacted_at is null)
  );
