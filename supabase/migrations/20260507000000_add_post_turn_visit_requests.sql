create extension if not exists pgcrypto;

create table if not exists public.post_turn_visit_requests (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.reservations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  request_type text not null check (request_type in ('review', 'photo')),
  status text not null default 'pending' check (status in ('pending', 'completed')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  dismissed_at timestamptz,
  push_sent_at timestamptz,
  in_app_read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, user_id, request_type)
);

create table if not exists public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.reservations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, user_id)
);

create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.reservations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  image_url text not null,
  caption text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_turn_visit_requests_user_status_idx
  on public.post_turn_visit_requests (user_id, status, requested_at desc);
create index if not exists post_turn_visit_requests_booking_idx
  on public.post_turn_visit_requests (booking_id);
create index if not exists restaurant_reviews_restaurant_idx
  on public.restaurant_reviews (restaurant_id, created_at desc);
create index if not exists visit_photos_booking_user_idx
  on public.visit_photos (booking_id, user_id);
create index if not exists visit_photos_restaurant_idx
  on public.visit_photos (restaurant_id, created_at desc);

alter table public.post_turn_visit_requests enable row level security;
alter table public.restaurant_reviews enable row level security;
alter table public.visit_photos enable row level security;

drop policy if exists "Users can read own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can read own post-turn requests"
  on public.post_turn_visit_requests
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can create own post-turn requests"
  on public.post_turn_visit_requests
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can update own post-turn requests"
  on public.post_turn_visit_requests
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own restaurant reviews" on public.restaurant_reviews;
create policy "Users can read own restaurant reviews"
  on public.restaurant_reviews
  for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read restaurant reviews" on public.restaurant_reviews;
create policy "Anyone can read restaurant reviews"
  on public.restaurant_reviews
  for select
  using (true);

drop policy if exists "Users can create own restaurant reviews" on public.restaurant_reviews;
create policy "Users can create own restaurant reviews"
  on public.restaurant_reviews
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own restaurant reviews" on public.restaurant_reviews;
create policy "Users can update own restaurant reviews"
  on public.restaurant_reviews
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users can read own visit photos" on public.visit_photos;
create policy "Users can read own visit photos"
  on public.visit_photos
  for select
  using (auth.uid() = user_id);

drop policy if exists "Anyone can read visit photos" on public.visit_photos;
create policy "Anyone can read visit photos"
  on public.visit_photos
  for select
  using (true);

drop policy if exists "Users can create own visit photos" on public.visit_photos;
create policy "Users can create own visit photos"
  on public.visit_photos
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own visit photos" on public.visit_photos;
create policy "Users can update own visit photos"
  on public.visit_photos
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
