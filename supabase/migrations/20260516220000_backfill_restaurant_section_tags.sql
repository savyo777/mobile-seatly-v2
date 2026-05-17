-- Backfill restaurant `settings_json.featured_in` tags from existing
-- columns so the Discover personalization layer's per-section qualifies
-- predicates have data to match against. Safe to run multiple times —
-- idempotent (uses set-then-deduplicate via jsonb).
--
-- The mobile-side scoring also falls back to keyword-matching ambiance +
-- tags + cuisine_type when featured_in is empty, so this migration only
-- sharpens results. Run when you want section membership to be explicit
-- rather than derived.
--
-- Apply via the Supabase SQL editor (the project user runs this; the
-- mobile build does not invoke it). Tested patterns:
--   - date-night-picks  ← ambiance / tags matching date / romantic / intimate / candle / chef tasting
--   - outdoor-seating   ← tags matching patio / rooftop / terrace / outdoor / garden / alfresco
--   - top-rated         ← avg_rating >= 4.5 AND total_reviews >= 50
--   - popular-near-you  ← total_reviews >= 200 (proxy until restaurant_views table lands)
--   - recommended       ← every active restaurant gets this baseline tag

-- Helper: append a tag to settings_json.featured_in if not already present.
-- Implemented inline below; no schema changes.

-- 1. Baseline: every active restaurant gets 'recommended' so the fallback
--    section in the mobile client always has something to show.
update public.restaurants r
set settings_json = coalesce(r.settings_json, '{}'::jsonb)
  || jsonb_build_object(
       'featured_in',
       case
         when coalesce(r.settings_json->'featured_in', '[]'::jsonb) @> '["recommended"]'::jsonb
           then coalesce(r.settings_json->'featured_in', '[]'::jsonb)
         else coalesce(r.settings_json->'featured_in', '[]'::jsonb) || '["recommended"]'::jsonb
       end
     )
where coalesce(r.is_active, true) = true;

-- 2. Date night: ambiance or tags hint at romantic / intimate / candle /
--    chef tasting / wine pairing.
update public.restaurants r
set settings_json = r.settings_json
  || jsonb_build_object(
       'featured_in',
       coalesce(r.settings_json->'featured_in', '[]'::jsonb) || '["date-night-picks"]'::jsonb
     )
where coalesce(r.is_active, true) = true
  and not coalesce(r.settings_json->'featured_in', '[]'::jsonb) @> '["date-night-picks"]'::jsonb
  and (
    coalesce(r.settings_json->>'ambiance', '') ~* '(date|romantic|intimate|candle)'
    or exists (
      select 1
      from jsonb_array_elements_text(coalesce(r.settings_json->'tags', '[]'::jsonb)) as t(value)
      where t.value ~* '(date|romantic|intimate|candle|chef\s*counter|tasting|wine\s*pair)'
    )
  );

-- 3. Outdoor seating: tags hint at patio / rooftop / terrace / outdoor.
update public.restaurants r
set settings_json = r.settings_json
  || jsonb_build_object(
       'featured_in',
       coalesce(r.settings_json->'featured_in', '[]'::jsonb) || '["outdoor-seating"]'::jsonb
     )
where coalesce(r.is_active, true) = true
  and not coalesce(r.settings_json->'featured_in', '[]'::jsonb) @> '["outdoor-seating"]'::jsonb
  and (
    coalesce(r.settings_json->>'ambiance', '') ~* '(patio|rooftop|terrace|outdoor|garden|alfresco|sidewalk)'
    or exists (
      select 1
      from jsonb_array_elements_text(coalesce(r.settings_json->'tags', '[]'::jsonb)) as t(value)
      where t.value ~* '(patio|rooftop|terrace|outdoor|garden|alfresco|sidewalk)'
    )
  );

-- 4. Top rated: well-reviewed restaurants.
update public.restaurants r
set settings_json = r.settings_json
  || jsonb_build_object(
       'featured_in',
       coalesce(r.settings_json->'featured_in', '[]'::jsonb) || '["top-rated"]'::jsonb
     )
where coalesce(r.is_active, true) = true
  and not coalesce(r.settings_json->'featured_in', '[]'::jsonb) @> '["top-rated"]'::jsonb
  and coalesce(r.avg_rating, 0) >= 4.5
  and coalesce(r.total_reviews, 0) >= 50;

-- 5. Popular near you: high review volume (proxy until per-user view
--    tracking lands).
update public.restaurants r
set settings_json = r.settings_json
  || jsonb_build_object(
       'featured_in',
       coalesce(r.settings_json->'featured_in', '[]'::jsonb) || '["popular-near-you"]'::jsonb
     )
where coalesce(r.is_active, true) = true
  and not coalesce(r.settings_json->'featured_in', '[]'::jsonb) @> '["popular-near-you"]'::jsonb
  and coalesce(r.total_reviews, 0) >= 200;

-- Sanity check (read-only — leave in the migration so the operator can
-- visually confirm tag distribution after applying):
--
--   select
--     count(*) filter (where settings_json->'featured_in' @> '["date-night-picks"]'::jsonb) as date_night,
--     count(*) filter (where settings_json->'featured_in' @> '["outdoor-seating"]'::jsonb)  as outdoor,
--     count(*) filter (where settings_json->'featured_in' @> '["top-rated"]'::jsonb)        as top_rated,
--     count(*) filter (where settings_json->'featured_in' @> '["popular-near-you"]'::jsonb) as popular,
--     count(*) filter (where settings_json->'featured_in' @> '["recommended"]'::jsonb)      as recommended,
--     count(*)                                                                              as total_active
--   from public.restaurants
--   where coalesce(is_active, true) = true;
