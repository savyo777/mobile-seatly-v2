-- Add write policies for the 4 storage buckets that had public read but
-- no INSERT/UPDATE/DELETE rules. Without these, every owner upload to
-- restaurant-logos / cover-photos / menu-photos and every user upload to
-- user-avatars throws "new row violates row-level security policy" —
-- same shape as the visit-photos snap-upload bug surfaced in Pass 4
-- (commit db38f83 fixed the client-side auth-id derivation; this
-- migration fixes the missing server-side policies that were also
-- contributing).
--
-- Path conventions (see lib/storage/buckets.ts):
--   restaurant-logos : {restaurant_id}/logo-{ts}.jpg     (owner/manager scoped)
--   cover-photos     : {restaurant_id}/cover-{ts}.jpg    (owner/manager scoped)
--   menu-photos      : {restaurant_id}/{menu_item_id}... (owner/manager scoped)
--   user-avatars     : {user_id}/avatar.{ext}            (auth.uid() scoped)
--
-- Apply via the Supabase MCP `apply_migration` tool, or `supabase db push`
-- via the CLI. Mirrors the existing receipts/event-media policy shape.

-- ===== restaurant-logos =====

drop policy if exists "Owners upload restaurant logos" on storage.objects;
create policy "Owners upload restaurant logos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'restaurant-logos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

drop policy if exists "Owners update restaurant logos" on storage.objects;
create policy "Owners update restaurant logos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'restaurant-logos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  )
  with check (
    bucket_id = 'restaurant-logos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

drop policy if exists "Owners delete restaurant logos" on storage.objects;
create policy "Owners delete restaurant logos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'restaurant-logos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

-- ===== cover-photos =====

drop policy if exists "Owners upload cover photos" on storage.objects;
create policy "Owners upload cover photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'cover-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

drop policy if exists "Owners update cover photos" on storage.objects;
create policy "Owners update cover photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'cover-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  )
  with check (
    bucket_id = 'cover-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

drop policy if exists "Owners delete cover photos" on storage.objects;
create policy "Owners delete cover photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'cover-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

-- ===== menu-photos =====

drop policy if exists "Owners upload menu photos" on storage.objects;
create policy "Owners upload menu photos"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

drop policy if exists "Owners update menu photos" on storage.objects;
create policy "Owners update menu photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  )
  with check (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

drop policy if exists "Owners delete menu photos" on storage.objects;
create policy "Owners delete menu photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'menu-photos'
    and (storage.foldername(name))[1] in (
      select urr.restaurant_id::text
      from user_restaurant_roles urr
      join user_profiles up on up.id = urr.user_id
      where up.auth_user_id = auth.uid()
        and urr.role in ('owner','manager')
    )
  );

-- ===== user-avatars =====
-- Per-user scope: first folder must equal auth.uid().

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users update their own avatar" on storage.objects;
create policy "Users update their own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  )
  with check (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
