-- Owner-side "Refer & Earn" data model.
--
-- An existing owner shares a per-owner code (CNV-OWNER-XXXXXX); a new
-- restaurant signs up using it; once the registration completes, the
-- referrer's billing date slips forward by OWNER_REFERRAL_BONUS_DAYS
-- (60). Mechanism is the same for trial-state owners (their trial
-- extends) and for paying owners (Stripe stops generating invoices
-- until the new trial_end).
--
-- Source of truth for policy constants:
--   lib/owner/referralPolicy.ts (mobile)
--   supabase/functions/_shared/referral-policy.ts (server)
--
-- Apply via `mcp__supabase__apply_migration` with name
-- `add_owner_referrals` (preferred — keeps schema_migrations in sync).

-- 1) Per-owner referral codes. One row per owner; lazy-created via the
--    `get_or_create_owner_referral_code` RPC.
CREATE TABLE IF NOT EXISTS public.owner_referral_codes (
  owner_user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  code text UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2) Track which referral a restaurant came in through and whether the
--    referrer credit has been disbursed. Both nullable so existing rows
--    are unaffected.
ALTER TABLE public.restaurants
  ADD COLUMN IF NOT EXISTS referred_by_code text,
  ADD COLUMN IF NOT EXISTS referral_credit_granted_at timestamptz;

CREATE INDEX IF NOT EXISTS restaurants_referred_by_code_idx
  ON public.restaurants(referred_by_code)
  WHERE referred_by_code IS NOT NULL;

-- 3) Audit log: who earned what when. Powers the "X referrals → Y
--    months earned" UI and gives ops a clean trail. The UNIQUE on
--    referred_restaurant_id is the idempotency guard — a re-run of the
--    grant helper for the same referred restaurant becomes a no-op.
CREATE TABLE IF NOT EXISTS public.referral_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referrer_restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  referred_restaurant_id uuid NOT NULL UNIQUE REFERENCES public.restaurants(id) ON DELETE CASCADE,
  days_added int NOT NULL,
  new_trial_ends_at timestamptz NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS referral_credit_grants_referrer_idx
  ON public.referral_credit_grants(referrer_owner_user_id, granted_at DESC);

-- 4) RLS — owners can read their own code and their own grants; writes
--    are service-role only (via SECURITY DEFINER RPC or edge function).
ALTER TABLE public.owner_referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_credit_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_referral_codes_self_read ON public.owner_referral_codes;
CREATE POLICY owner_referral_codes_self_read
  ON public.owner_referral_codes
  FOR SELECT
  USING (owner_user_id = auth.uid());

DROP POLICY IF EXISTS referral_credit_grants_self_read ON public.referral_credit_grants;
CREATE POLICY referral_credit_grants_self_read
  ON public.referral_credit_grants
  FOR SELECT
  USING (referrer_owner_user_id = auth.uid());

-- 5) RPC to lazy-create the per-owner code on first read. The format
--    `CNV-OWNER-<6 chars [A-Z0-9]>` is enforced both here and on the
--    client; a UNIQUE on `code` plus a retry loop handles the very rare
--    collision case.
CREATE OR REPLACE FUNCTION public.get_or_create_owner_referral_code()
RETURNS TABLE(code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_owner uuid := auth.uid();
  v_code text;
  v_attempt int := 0;
  v_raw text;
BEGIN
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'not authenticated' USING ERRCODE = '42501';
  END IF;

  SELECT orc.code INTO v_code
  FROM owner_referral_codes orc
  WHERE orc.owner_user_id = v_owner;

  IF v_code IS NOT NULL THEN
    RETURN QUERY SELECT v_code;
    RETURN;
  END IF;

  LOOP
    v_attempt := v_attempt + 1;
    -- Postgres `encode()` only supports base64/hex/escape (no base32).
    -- Use hex of 3 random bytes → 6 hex chars, uppercase → matches the
    -- client-side regex /^CNV-OWNER-[A-Z0-9]{6}$/. 16^6 = ~16M codes,
    -- comfortable headroom for any reasonable owner count.
    -- pgcrypto lives in the `extensions` schema; qualify explicitly so
    -- the locked-down search_path (public, pg_temp) doesn't hide it.
    v_raw := upper(encode(extensions.gen_random_bytes(3), 'hex'));
    v_code := 'CNV-OWNER-' || substr(v_raw, 1, 6);
    BEGIN
      INSERT INTO owner_referral_codes(owner_user_id, code)
        VALUES (v_owner, v_code);
      EXIT;
    EXCEPTION WHEN unique_violation THEN
      IF v_attempt > 8 THEN
        RAISE;
      END IF;
    END;
  END LOOP;

  RETURN QUERY SELECT v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.get_or_create_owner_referral_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_or_create_owner_referral_code() TO authenticated;
