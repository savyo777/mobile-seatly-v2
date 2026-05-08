alter table public.restaurants
  add column if not exists stripe_payment_method_id text,
  add column if not exists billing_card_brand text,
  add column if not exists billing_card_last4 text,
  add column if not exists billing_card_exp_month integer,
  add column if not exists billing_card_exp_year integer;
