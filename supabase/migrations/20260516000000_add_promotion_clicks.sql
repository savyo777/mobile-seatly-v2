-- Add a real `clicks` counter on `promotions` so the owner Promos tab can
-- stop fabricating that number from `max_uses`. Companion to the mobile
-- commit that wires Pressable promo cards to call the increment RPC.
--
-- Pre-check (run first in the Supabase SQL editor — if this returns a row,
-- the column already exists and you can skip step 1):
--
--   select column_name from information_schema.columns
--   where table_schema='public' and table_name='promotions'
--     and column_name='clicks';

-- 1. New column. NOT NULL with default so existing rows backfill to 0 in
--    one shot.
alter table public.promotions
  add column if not exists clicks integer not null default 0;

-- 2. RPC that any role can call to increment the counter. SECURITY DEFINER
--    so the underlying UPDATE doesn't require row-level UPDATE rights on
--    `promotions` — the function does the only update permitted.
create or replace function public.increment_promotion_clicks(p_promotion_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.promotions
  set clicks = clicks + 1
  where id = p_promotion_id;
end;
$$;

-- 3. Lock down execute to the roles that should reach this — anon (for
--    when the diner-side promo card ships) and authenticated (the owner
--    tapping their own card today).
revoke all on function public.increment_promotion_clicks(uuid) from public;
grant execute on function public.increment_promotion_clicks(uuid) to anon, authenticated;

comment on column public.promotions.clicks is
  'Aggregate count of times a promo card has been tapped. Incremented via increment_promotion_clicks(uuid). Diner taps will populate this once the customer-side promo card ships.';
comment on function public.increment_promotion_clicks(uuid) is
  'Increments promotions.clicks by 1 for the given promotion id. Anon-callable; runs as SECURITY DEFINER so callers do not need direct UPDATE rights on the row.';
