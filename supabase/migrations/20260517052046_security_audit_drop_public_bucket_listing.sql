-- Security audit (2026-05-17): drop the storage.objects SELECT
-- policies that allowed anyone to list/enumerate all objects in the
-- visit-photos and event-media buckets via PostgREST or the JS
-- storage.from('<bucket>').list() helper.
--
-- Public URL reads (storage/v1/object/public/<bucket>/<path>) continue
-- to work because both buckets have public=true at the bucket level —
-- the public URL endpoint serves files via service-role internally and
-- doesn't evaluate storage.objects RLS. The only thing this policy
-- enabled was enumeration, which is the attack vector the Supabase
-- security advisor flagged (lint 0025 public_bucket_allows_listing).
--
-- The app reads image metadata from public.visit_photos / events rows
-- and renders the image via the public URL — not via list(). Confirmed
-- via grep: no storage.from(...).list() calls in app/ or lib/.

drop policy if exists "visit_photos_storage_public_read" on storage.objects;
drop policy if exists "Public read event media" on storage.objects;
