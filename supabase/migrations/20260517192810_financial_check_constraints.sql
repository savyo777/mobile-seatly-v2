-- Phase 4 hardening (2026-05-17): database-level CHECK constraints
-- on financial + party-size columns.
--
-- Rationale: even if RLS, the application layer, AND the
-- create-public-booking server-side amount validation all have bugs,
-- Postgres itself refuses physically impossible / absurd rows. Last
-- line of defense against negative charges, zero charges, runaway
-- bot orders, sanity-check violations.
--
-- Pre-check (zero violations confirmed against live data before applying).

-- ----- orders -----
alter table public.orders
  add constraint orders_subtotal_nonnegative
  check (subtotal is null or subtotal >= 0);
alter table public.orders
  add constraint orders_tax_amount_nonnegative
  check (tax_amount is null or tax_amount >= 0);
alter table public.orders
  add constraint orders_tip_amount_nonnegative
  check (tip_amount is null or tip_amount >= 0);
alter table public.orders
  add constraint orders_total_amount_nonnegative
  check (total_amount is null or total_amount >= 0);
alter table public.orders
  add constraint orders_discount_amount_nonnegative
  check (discount_amount is null or discount_amount >= 0);
alter table public.orders
  add constraint orders_total_amount_sanity_cap
  check (total_amount is null or total_amount <= 1500000);  -- $15k

-- ----- reservations -----
alter table public.reservations
  add constraint reservations_party_size_positive
  check (party_size > 0);
alter table public.reservations
  add constraint reservations_party_size_sanity_cap
  check (party_size <= 100);
alter table public.reservations
  add constraint reservations_deposit_nonnegative
  check (deposit_amount_cents is null or deposit_amount_cents >= 0);
alter table public.reservations
  add constraint reservations_deposit_sanity_cap
  check (deposit_amount_cents is null or deposit_amount_cents <= 500000);  -- $5k

-- ----- payments -----
alter table public.payments
  add constraint payments_amount_positive
  check (amount > 0);
alter table public.payments
  add constraint payments_amount_sanity_cap
  check (amount <= 1500000);  -- $15k single payment

-- ----- reservation_holds -----
alter table public.reservation_holds
  add constraint reservation_holds_deposit_nonnegative
  check (deposit_amount_cents >= 0);
alter table public.reservation_holds
  add constraint reservation_holds_deposit_sanity_cap
  check (deposit_amount_cents <= 500000);  -- $5k

-- ----- restaurants -----
alter table public.restaurants
  add constraint restaurants_tax_rate_valid
  check (tax_rate is null or (tax_rate >= 0 and tax_rate <= 0.5));  -- 50% sanity cap
alter table public.restaurants
  add constraint restaurants_no_show_fee_nonnegative
  check (no_show_fee is null or no_show_fee >= 0);
alter table public.restaurants
  add constraint restaurants_no_show_fee_sanity_cap
  check (no_show_fee is null or no_show_fee <= 1000);  -- $1000 sanity cap
