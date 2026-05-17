-- Security audit Phase 1.6 — RLS gap closures.
--
-- Closes two missing policies surfaced by the 2026-05-17 security
-- audit. Both are idempotent (drop + create) and safe to re-run.
--
-- Apply via the Supabase SQL editor.

-- 1. visit_photos: add a DELETE policy scoped to the row owner.
--    Why: lib/reviews/deleteMyReview.ts deletes from visit_photos but
--    the existing policy set (SELECT/INSERT/UPDATE only) prevents it.
--    My Reviews "delete" silently fails in production today.
--
--    SELECT is deliberately NOT tightened — the existing
--    "Anyone can read visit photos" policy supports public-attribution
--    photos on restaurant detail pages (listVisitPhotosByRestaurant
--    joins user_profiles for full_name + avatar). Restricting reads
--    here would break that public feed.
--
--    Future hardening idea (out of scope for this PR): create a
--    `public_visit_photos` view that exposes only image_url, caption,
--    rating, tags, created_at, restaurant_id (no user_id, no
--    booking_id), revoke direct SELECT on the table from anon, and
--    have public callers query the view. That keeps attribution
--    explicit (separate user_profiles join) while hiding booking_id
--    metadata that could leak who-dined-with-whom.

drop policy if exists "Users can delete own visit photos" on public.visit_photos;
create policy "Users can delete own visit photos"
  on public.visit_photos for delete
  using (auth.uid() = user_id);

-- 2. post_turn_visit_requests: add a DELETE policy scoped to the
--    row owner. Today users can create + update + read their own
--    rows but never delete them, so a dismissed request lingers
--    forever in the user's history.

drop policy if exists "Users can delete own post-turn requests" on public.post_turn_visit_requests;
create policy "Users can delete own post-turn requests"
  on public.post_turn_visit_requests for delete
  using (auth.uid() = user_id);

-- Sanity check (read-only — leave for the operator to run post-apply
-- to confirm the policies landed):
--
--   select polrelid::regclass as table_name, polname, polcmd
--   from pg_policy
--   where polrelid in ('public.visit_photos'::regclass,
--                      'public.post_turn_visit_requests'::regclass)
--   order by table_name, polcmd;
