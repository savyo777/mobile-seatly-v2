-- Receipt scanner v1: private storage bucket for receipt images.
-- Path convention: `{restaurant_id}/{expense_id}.jpg`
-- RLS scoped via the first path segment (restaurant_id) so an owner
-- can only read / write / delete images under restaurants they own.
--
-- Image deletion on row delete is handled by the `expenses` trigger
-- (see 20260509210000_create_expenses_table.sql).

insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false)
on conflict (id) do nothing;

drop policy if exists "owner reads own receipt images" on storage.objects;
create policy "owner reads own receipt images" on storage.objects
  for select using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] in (
      select id::text from public.restaurants where owner_user_id = auth.uid()
    )
  );

drop policy if exists "owner uploads receipt images" on storage.objects;
create policy "owner uploads receipt images" on storage.objects
  for insert with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] in (
      select id::text from public.restaurants where owner_user_id = auth.uid()
    )
  );

drop policy if exists "owner updates own receipt images" on storage.objects;
create policy "owner updates own receipt images" on storage.objects
  for update using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] in (
      select id::text from public.restaurants where owner_user_id = auth.uid()
    )
  );

drop policy if exists "owner deletes own receipt images" on storage.objects;
create policy "owner deletes own receipt images" on storage.objects
  for delete using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] in (
      select id::text from public.restaurants where owner_user_id = auth.uid()
    )
  );
