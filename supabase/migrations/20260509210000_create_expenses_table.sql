-- Receipt scanner v1: gives restaurant owners a real expense ledger
-- backed by AI-extracted receipt data. The owner snaps a photo, the
-- scan-receipt edge function returns a draft, the owner reviews & saves
-- a row here. Header-level fields only in v1 (no line items).
--
-- Additive migration: new table only. RLS scoped to the owner of the
-- referenced restaurant. AFTER DELETE trigger removes the receipt image
-- from the `receipts` storage bucket so we don't leak orphans.

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_by_user_id uuid not null references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),

  vendor text not null,
  expense_date date not null,
  subtotal_cents integer,
  tax_cents integer,
  tip_cents integer,
  total_cents integer not null,
  currency text not null default 'USD',

  category text not null,
  payment_method text,
  payment_method_last4 text,

  image_path text,
  notes text,

  ai_extracted boolean not null default false,
  ai_raw jsonb,

  constraint expenses_total_nonneg check (total_cents >= 0),
  constraint expenses_subtotal_nonneg check (subtotal_cents is null or subtotal_cents >= 0),
  constraint expenses_tax_nonneg check (tax_cents is null or tax_cents >= 0),
  constraint expenses_tip_nonneg check (tip_cents is null or tip_cents >= 0),
  constraint expenses_last4_format check (payment_method_last4 is null or payment_method_last4 ~ '^[0-9]{4}$')
);

create index if not exists expenses_restaurant_date_idx
  on public.expenses (restaurant_id, expense_date desc);

create index if not exists expenses_restaurant_category_idx
  on public.expenses (restaurant_id, category);

alter table public.expenses enable row level security;

drop policy if exists "owner reads own restaurant expenses" on public.expenses;
create policy "owner reads own restaurant expenses" on public.expenses
  for select using (
    restaurant_id in (
      select id from public.restaurants where owner_user_id = auth.uid()
    )
  );

drop policy if exists "owner inserts own restaurant expenses" on public.expenses;
create policy "owner inserts own restaurant expenses" on public.expenses
  for insert with check (
    restaurant_id in (
      select id from public.restaurants where owner_user_id = auth.uid()
    )
    and created_by_user_id = auth.uid()
  );

drop policy if exists "owner updates own restaurant expenses" on public.expenses;
create policy "owner updates own restaurant expenses" on public.expenses
  for update using (
    restaurant_id in (
      select id from public.restaurants where owner_user_id = auth.uid()
    )
  );

drop policy if exists "owner deletes own restaurant expenses" on public.expenses;
create policy "owner deletes own restaurant expenses" on public.expenses
  for delete using (
    restaurant_id in (
      select id from public.restaurants where owner_user_id = auth.uid()
    )
  );

-- Cleanup trigger: when an expense row is deleted, remove its receipt
-- image from the `receipts` bucket so storage doesn't accumulate orphans.
create or replace function public.cleanup_expense_receipt_image()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.image_path is not null then
    delete from storage.objects
    where bucket_id = 'receipts'
      and name = old.image_path;
  end if;
  return old;
end;
$$;

drop trigger if exists expenses_after_delete_cleanup_image on public.expenses;
create trigger expenses_after_delete_cleanup_image
  after delete on public.expenses
  for each row execute function public.cleanup_expense_receipt_image();
