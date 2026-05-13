-- Create post_turn_visit_requests and visit_photos tables.
-- visit_photos is created with booking_id nullable from the start so snaps
-- from the past-restaurants carousel (no booking) can be stored.
-- Includes extra snap metadata columns (story_filter_id, rating, tags, etc.).

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

create table if not exists public.visit_photos (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid references public.reservations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  image_url text not null,
  caption text,
  story_filter_id text,
  story_filter_captured_at bigint,
  rating smallint,
  tags text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists post_turn_visit_requests_user_status_idx
  on public.post_turn_visit_requests (user_id, status, requested_at desc);
create index if not exists post_turn_visit_requests_booking_idx
  on public.post_turn_visit_requests (booking_id);
create index if not exists visit_photos_restaurant_idx
  on public.visit_photos (restaurant_id, created_at desc);
create index if not exists visit_photos_user_idx
  on public.visit_photos (user_id, created_at desc);

alter table public.post_turn_visit_requests enable row level security;
alter table public.visit_photos enable row level security;

drop policy if exists "Users can read own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can read own post-turn requests"
  on public.post_turn_visit_requests for select
  using (auth.uid() = user_id);

drop policy if exists "Users can create own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can create own post-turn requests"
  on public.post_turn_visit_requests for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can update own post-turn requests"
  on public.post_turn_visit_requests for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Anyone can read visit photos" on public.visit_photos;
create policy "Anyone can read visit photos"
  on public.visit_photos for select
  using (true);

drop policy if exists "Users can create own visit photos" on public.visit_photos;
create policy "Users can create own visit photos"
  on public.visit_photos for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update own visit photos" on public.visit_photos;
create policy "Users can update own visit photos"
  on public.visit_photos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public bucket for guest snap images.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'visit-photos',
  'visit-photos',
  true,
  10485760,
  array['image/jpeg','image/jpg','image/png','image/webp','image/heic']
)
on conflict (id) do nothing;

drop policy if exists "visit_photos_storage_public_read" on storage.objects;
create policy "visit_photos_storage_public_read"
  on storage.objects for select
  using (bucket_id = 'visit-photos');

drop policy if exists "visit_photos_storage_auth_insert" on storage.objects;
create policy "visit_photos_storage_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'visit-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "visit_photos_storage_auth_delete" on storage.objects;
create policy "visit_photos_storage_auth_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'visit-photos'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
