create table if not exists public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  business_name text not null,
  hst_number text not null,
  address text not null,
  owner_phone text not null,
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  trial_ends_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists restaurants_owner_user_id_idx on public.restaurants(owner_user_id);

alter table public.restaurants enable row level security;

create policy "owners_select_own_restaurants"
on public.restaurants
for select
using (auth.uid() = owner_user_id);

create policy "service_role_manage_restaurants"
on public.restaurants
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');
