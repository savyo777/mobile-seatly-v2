# Un-hardcoding Checklist

Phased plan to finish removing hardcoded values from the codebase. Each phase is sized to land as one PR / commit batch. Phases are ordered for efficiency: each builds on the previous and gets harder/riskier as you go down.

Tick items off as you land them. Most have file paths so an LLM (or you) can pick up exactly where this leaves off.

For the broader mobile app backend-readiness inventory - what is fully backend-backed, partially mock/placeholder, and fully mock/placeholder - see [`docs/MOBILE_BACKEND_READINESS_AUDIT.md`](./MOBILE_BACKEND_READINESS_AUDIT.md). That audit is the source of truth for turning the entire customer and staff mobile app into live Supabase/Stripe/Storage/Edge-Function behavior while keeping demo data behind `EXPO_PUBLIC_CENAIVA_DEMO_MODE`.

**Already done in earlier batches** (see git log on `main`): centralized client + server constants, dropped PII fallbacks, gated wallet/loyalty/billing-year/analytics/receipt mock data, replaced `mockCustomer.id` with real auth, env-overridable Deepgram/map/voice IDs, ICS brand, full `.env.example`. Don't redo.

---

## Phase E — Finish the half-fixes (smallest payoff per minute)

Cheap mechanical fixes that close gaps left by the previous batches. **Start here.** Almost no risk; each is a single-file edit verified by typecheck.

- [x] **Replace inline Stripe API version with `STRIPE_API_VERSION`** — `supabase/functions/cenaiva-orchestrate/index.ts:5400` still has `apiVersion: "2025-02-24.acacia"` literal. Import from `_shared/stripe.ts`.
- [x] **Replace inline confirmation-code generator** — `supabase/functions/cenaiva-orchestrate/index.ts:5292` (`PRE-XXXX`), `lib/cenaiva/api/createPreorderCheckout.ts:99–101` (`CEN-XXXX`), `lib/booking/publicBookingApi.ts:144` (`CNV-NNNNNN`) — all should call `makeConfirmationCode()` from `_shared/confirmation-code.ts`.
- [x] **Pick one confirmation prefix** — currently `SEAT-`, `PRE-`, `CEN-`, `CNV-` coexist. Update `_shared/confirmation-code.ts:11` to `CEN-` (or env-driven) and document a one-line parser for legacy `SEAT-` codes.
- [x] **Refactor `register-restaurant-owner/index.ts`** to use `_shared/stripe.ts` (`stripeRequest`/`stripeGet`/`STRIPE_API_VERSION`) and `_shared/cors.ts` (`buildCorsHeaders`/`corsHeaders`). Currently it bypasses both — runs on Stripe `2024-06-20` while orchestrate uses `2025-02-24.acacia`.
- [x] **Replace remaining `?? 0.13` tax fallbacks** — import `DEFAULT_TAX_RATE_FALLBACK` at:
  - `lib/cenaiva/api/createPreorderCheckout.ts:44`
  - `lib/services/ownerRestaurant.ts:90`
  - `lib/supabase/mapRestaurantRow.ts:128`
- [x] **Replace remaining `'CAD'` literals** — import `DEFAULT_CURRENCY` at:
  - `lib/services/ownerRestaurant.ts:89`
  - `lib/supabase/mapRestaurantRow.ts:129`
  - `lib/receipt/getReceiptPayload.ts:99/124`
  - `lib/utils/formatCurrency.ts:1` (also lowercase `'cad'` default)
- [x] **Replace `|| "UTC"` in `supabase/functions/create-public-booking/index.ts:279`** with `DEFAULT_TIMEZONE` from `_shared/booking-defaults.ts`.
- [x] **Migrate the 5 `lib/storage/*.ts` modules to use `key()`** from `lib/storage/keys.ts`:
  - `claimedPromotions.ts`, `customerPaymentMethods.ts`, `referralLimits.ts`, `restaurantBillingAddress.ts`, `restaurantPaymentMethod.ts`. All currently use bare `STORAGE_KEY = '<name>-v1'`.
- [x] **Decide on `lib/storage/migrate.ts`** — `lib/storage/keys.ts:2–3` references it but the file doesn't exist. Either create it (so legacy `@seatly/...` keys copy to `@cenaiva/...` on app start) or remove the misleading comment.
- [x] **Fix Nominatim User-Agent** — `supabase/functions/cenaiva-orchestrate/index.ts:1006–1009` still says `"Seatly/1.0 (seatly.app)"`. Build from `BRAND_DOMAIN`.
- [x] **`lib/booking/addToCalendar.ts:17`** — replace `DEFAULT_DURATION_MINUTES = 90` with import of `DEFAULT_TURN_MINUTES` from `bookingDefaults.ts`.
- [x] **`lib/theme/ThemeProvider.tsx:15`** — change `STORAGE_KEY = '@seatly/theme'` to `key('theme')`.

**Effort:** 1–2 hours. **Risk:** Low. **Deploy:** Edge function changes need `supabase functions deploy`.

---

## Phase F — Visible brand & data-integrity fixes (high user impact)

Things real users see today that are wrong. Each is small but high leverage.

- [x] **`lib/supabase/mapRestaurantRow.ts:118` — drop the synthesized `4.5` default rating.** Return `null` and let the UI render "no rating yet" instead of pretending every restaurant is 4.5★.
- [x] **`lib/supabase/mapRestaurantRow.ts:21,26–27` — drop the Toronto coordinate fallback.** Return `null` lat/lng for restaurants without coords; map filters out unmappable rows.
- [x] **`lib/i18n/locales/en.ts:403` and `fr.ts:403`** — replace "Seatly" with "Cenaiva" in the Settings → Change Password subtitle (`"Update your Seatly password"` and the FR equivalent).
- [x] **`lib/i18n/locales/en.ts:600–601`** — gate the demo `scheduleVenue: 'Cenaiva — Downtown'` and `scheduleManagerName: 'Alex Rivera'` strings behind demo mode (or remove from the production bundle).
- [x] **Resolve `cenaiva.app` vs `cenaiva.com` split-brain.** Pick one and update:
  - `lib/config/contactInfo.ts` (currently `help@cenaiva.app`)
  - `lib/sharing/generateShareCard.ts:6` (currently hardcoded `cenaiva.app`)
  - All places that import `BRAND_DOMAIN` (currently `cenaiva.com`)
  - `app/(staff)/rate-seatly.tsx` filename / route
- [x] **`lib/booking/bookingDefaults.ts:9`** — `DEFAULT_TIMEZONE = 'UTC'` contradicts `lib/restaurants/hoursStatus.ts:114/122` and `lib/discover/torontoTime.ts` which default to `'America/Toronto'`. Pick one default and apply consistently.
- [x] **`useMobileTranscription.ts:172`** calls `/functions/v1/deepgram-live-token` — that function doesn't exist in `supabase/functions/`. Either deploy it or remove/guard the call. **High risk if Deepgram path is reachable in prod.**
- [x] **`app.json` bundle ID mismatch** — iOS uses `com.savyo.cenaiva`, Android uses `com.cenaiva.app`. Pick one (likely `com.cenaiva.app`) and align. Also dedupe the duplicate `CFBundleURLTypes` block at lines 22–33.
- [x] **Update `docs/integration/DEEP_LINKING.md`** to match whichever bundle ID wins.

**Effort:** 2–4 hours. **Risk:** Medium (the bundle-ID change requires rebuild + reinstall test).

---

## Phase G — Mock-data sweep (large, methodical)

The bulk of remaining hardcoded data. ~75 production files import from `lib/mock/*` ungated. Batch D in the previous wave fixed only the worst 5. Approach: gate every consumer behind `isDemoModeEnabled()` and render empty state otherwise.

### Sub-phase G.1 — Customer side ✅

- [ ] `app/(customer)/feed.tsx` — `listFeedPosts`, `listFollowingPosts`, `listTrendingPosts`
- [ ] `app/(customer)/notifications.tsx` — `mockReservations`, `mockRestaurants`
- [ ] `app/(customer)/discover/index.tsx` — `mockRestaurants`, `discoverPresentation`
- [ ] `app/(customer)/discover/[id].tsx` — `mockRestaurants`, `mockMenuItems`, `snaps`
- [ ] `app/(customer)/discover/category/[category].tsx` — `mockRestaurants`
- [ ] `app/(customer)/discover/explore.tsx` — `social`
- [ ] `app/(customer)/discover/snaps/[restaurantId].tsx` — `snaps`
- [ ] `app/(customer)/discover/snaps/detail/[snapId].tsx` — `snaps`
- [ ] `app/(customer)/discover/tag/[tag].tsx` — `snaps`, `social`
- [ ] `app/(customer)/discover/post-review/*` — 4 files
- [ ] `app/(customer)/map.tsx` — `mockMapRestaurants`
- [ ] `app/(customer)/events/index.tsx` — `events`
- [ ] `app/(customer)/activity/index.tsx` — `mockReservations`, `mockRestaurants`
- [ ] `app/(customer)/bookings/[id].tsx` — `mockReservations`, `mockOrders`
- [ ] `app/(customer)/orders/[id].tsx` — `mockOrders`
- [ ] `app/(customer)/checkout/[orderId].tsx` — `mockRestaurants`
- [ ] `app/(customer)/profile/{help,promotions,notifications,invite,index}.tsx` — various

### Sub-phase G.2 — Staff/owner side (highest visibility) ✅

- [ ] `app/(staff)/home.tsx` — **owner dashboard hero shows fabricated metrics; highest priority**
- [ ] `app/(staff)/reservations.tsx` — fake "Sarah Chen", "Marcus Liu" reservation list
- [ ] `app/(staff)/crm.tsx` — fake guests
- [ ] `app/(staff)/floor.tsx` — fake floor tables
- [ ] `app/(staff)/schedule.tsx` — fake staff roster
- [ ] `app/(staff)/ordersKds.tsx` — fake KDS tickets
- [ ] `app/(staff)/events.tsx` — `OWNER_EVENTS`
- [ ] `app/(staff)/promote.tsx` — `OWNER_EVENTS`, `OWNER_PROMOTIONS`
- [ ] `app/(staff)/promotions/index.tsx` — promotions list
- [ ] `app/(staff)/waitlist.tsx` — waitlist entries
- [ ] `app/(staff)/insights.tsx` — analytics insights
- [ ] `app/(staff)/expenses.tsx` — expense lines
- [ ] `app/(staff)/notifications.tsx` — staff notifications
- [ ] `app/(staff)/ai.tsx` — AI panel mock data
- [ ] `app/(staff)/staff.tsx` — staff list
- [ ] `app/(staff)/menu*.tsx` — menu items / categories
- [ ] `app/(staff)/guests/{index,[id]}.tsx` — guest detail screens
- [ ] `app/(staff)/profile/{edit,index}.tsx` — owner profile
- [ ] `app/(staff)/business.tsx`, `export.tsx` — business profile / export options

### Sub-phase G.3 — Booking flow ✅

- [ ] `app/booking/[restaurantId]/step2-time.tsx` — `getEventById`
- [ ] `app/booking/[restaurantId]/review.tsx` — `getSnapRestaurantName`
- [ ] `app/booking/[restaurantId]/step4-preorder.tsx` — `mockMenuItems`, `menuCategories`
- [ ] `app/booking/[restaurantId]/step-prepay-offer.tsx` — `mockRestaurants`

### Sub-phase G.4 — Reusable components ✅

- [ ] `components/feed/*` (FeedHero, FeedPostCard, CollectionsStrip)
- [ ] `components/snaps/*` (SnapGrid, SnapShareSheet, SnapPreviewCard, etc.)
- [ ] `components/owner/*` (RevenueHero, OwnerLiveFeed, FloorCanvas, TableDetailSheet, LiveTimeline, PeriodToggle, OwnerAlertsStrip)
- [ ] `components/discover/*` (RestaurantBrowseCard, DiscoverGridSection, EnhancedCard, HeroFeatured, MapView, etc.)
- [ ] `components/cenaiva/{CenaivaVoiceShell,AssistantMapOverlay,RestaurantRail}`
- [ ] `components/profile/{PersonalInformationBody,SavedRestaurantsList,SavedRestaurantCard}`

**Effort:** 8–16 hours total. **Risk:** Medium (each file is small but cumulative manual verification needed). **Approach:** ship sub-phases as separate commits so any regression is small to revert.

---

## Phase H — Edge function security (needs Supabase deploy)

Server-side hardening that requires coordinated deploy.

- [x] **Audit each `verify_jwt = false` function in `supabase/config.toml`** and flip to `true` where the function already does its own JWT decode internally:
  - `cenaiva-orchestrate` ✓ flipped (had decode)
  - `cenaiva-availability` ✓ added internal auth check, then flipped
  - `cenaiva-small-prompt` ✓ added internal auth check, then flipped
  - `elevenlabs-tts` ✓ flipped (had decode)
  - `create-public-booking` and `get-availability` left **open** — public booking widget allows anonymous bookings.
  - `prepare-phone-login` and `register-restaurant-owner` left open as planned.
- [ ] **Set `ALLOWED_ORIGINS` env on the Supabase project** to remove the `*` CORS fallback in `_shared/cors.ts`. *(Not set yet — confirmed via `npx supabase secrets list`. Do this before web launch.)*
- [x] **Add IP-based rate limiting** to `prepare-phone-login` (and any other anonymous endpoint). *(10 reqs/IP/min via `_shared/rateLimit.ts`, Deno-KV-backed, fail-open on KV errors.)*
- [x] **Set `CENAIVA_ALLOW_TEST_PAYMENTS=1` only on dev project**, never on production. *(Verified via `npx supabase secrets list` — not set on prod.)*
- [x] **Add `_shared/openai.ts`** — single source for OPENAI_API_KEY env, model name, temperature, max_tokens.
- [ ] Deploy: `npx supabase functions deploy --project-ref exbjodmnpdiayfzrdyux`. *(User runs after `git pull`.)*

**Effort:** 3–6 hours. **Risk:** High if any anonymous caller breaks; coordinate with web app deploys.

---

## Phase I — Design tokens unified (one PR, mostly mechanical)

Three competing color/spacing/radius tables that have already drifted.

- [x] **Create a single `lib/theme/tokens.ts`** with colors, spacing, radius. Treat as the source.
- [x] **`tailwind.config.js`** — values mirrored from `lib/theme/tokens.ts` with a header comment. (Tailwind classes aren't actually used by any component — kept in sync defensively.)
- [x] **`lib/theme/palettes.ts`** — re-exports `darkPalette`/`lightPalette` from tokens.
- [x] **`lib/theme/ownerTheme.ts`** — inline `rgba(…)` mixes replaced with `withAlpha(token, alpha)` helper from `tokens.ts`.
- [x] **Reconcile spacing scales** — `ownerSpace` now imports from `spacing` in `tokens.ts` (`ownerSpace.xs === spacing.sm`, etc.); preserves current pixel values, eliminates the parallel scale.
- [x] **Reconcile borderRadius scales** — both `borderRadius` and `ownerRadii` live in `tokens.ts`; owner-side kept at its larger values intentionally (denser-information UI), customer-side kept on its 4pt-grid scale.
- [x] **`lib/map/darkMapStyle.ts`** — converted to `buildGoogleMapStyle(palette)`; existing `googleDarkMapStyle` export preserved for backward compatibility, plus a new `googleLightMapStyle`.
- [x] **`lib/loyalty/tiers.ts`** — tier hex colors now read from `loyaltyTierColors` in `tokens.ts`; Gold tier color matches palette gold so badges and chrome stay in step.
- [x] **Delete or regenerate `design-system/MASTER.md`** — both copies (and the now-empty `design-system/` directory) deleted. They referenced Playfair Display SC + Karla fonts the app doesn't load and a third gold value `#D4AF37`.

**Effort:** 4–6 hours. **Risk:** Medium (visual). Verify in both themes before commit.

---

## Phase J — Validation, i18n, and multilingual readiness

Fixes that block expansion to non-English / non-Canadian markets.

- [x] **Extract Canadian HST regex** → `lib/validation/canadaTax.ts` (`CANADA_HST_REGEX`, `normalizeCanadianHst`, `isValidCanadianHst`). `restaurantRegistration.ts` imports from it.
- [x] **Extract phone normalization** → `lib/validation/phone.ts` (client) + `supabase/functions/_shared/phone.ts` (server). `phoneAuth.ts`, `restaurantRegistration.ts`, and `prepare-phone-login` all consume the canonical version. (Restaurant signup previously had a looser variant that accepted 11–15 digits without `+` — now uses the strict E.164 normalizer.)
- [x] **Deepgram model + language env-driven** (`EXPO_PUBLIC_DEEPGRAM_MODEL`, `EXPO_PUBLIC_DEEPGRAM_LANGUAGE`). Defaults remain `nova-3` / `en`.
- [x] **Translate English-only fallback strings** — new i18n keys `common.fallback{User,NewUser,Restaurant}`, `calendar.{eventTitle,confirmationCode,partyOf,notes,shareDialogTitle}`, `bookingNotice.{none,min30,hour1,hour2,hour24}`. `AuthContext.tsx`, `displayProfile.ts`, `myReservations.ts`, `addToCalendar.ts` updated to call `i18n.t(...)`. `NOTICE_OPTIONS` reshaped to `[{ minutes, labelKey }]`; consumer (`reservation-settings.tsx`) renders via `t(option.labelKey)`.
- [x] **`lib/restaurants/pricing.ts`** — `PRICE_LEVEL_CATEGORY_NAMES` extended with French (`plat`, `plats`, `plat principal`, `plats principaux`); thresholds `EXPO_PUBLIC_PRICE_TIER_LOW_MAX` / `EXPO_PUBLIC_PRICE_TIER_HIGH_MIN` env-overridable.
- [x] **`lib/discover/torontoTime.ts`** — split into `getZonedHour24(timeZone)` / `getZonedGreetingPeriod(timeZone)`. Toronto wrappers retained, marked `@deprecated`.
- [ ] **`lib/restaurants/hoursStatus.ts`** — Phase F already changed default to `DEFAULT_TIMEZONE`. Making the timezone arg required is deferred — too many callers without an obvious source for the value.
- [x] **`lib/storage/restaurantBillingAddress.ts`** — `country` default reads `EXPO_PUBLIC_DEFAULT_COUNTRY` (defaults to `'CA'`).

**Effort:** 6–10 hours. **Risk:** Low–medium.

---

## Phase K — Cleanup, polish, deferred odds and ends

Low-impact tidying. Do these in slack time or roll into related changes.

- [ ] **Reconcile `MAX_ONLINE_PARTY_SIZE = 150`** (`lib/booking/bookingLimits.ts:1`) vs `DEFAULT_MAX_PARTY_SIZE = 20` (`lib/booking/bookingDefaults.ts:12`). Two consts, two values, conflicting.
- [ ] **Reconcile 3-tier vs 4-tier price scale** — `lib/restaurants/pricing.ts` uses `1 | 2 | 3` while `lib/restaurants/priceTiers.ts` declares `$/$$/$$$/$$$$`.
- [ ] **`lib/receipt/receiptTypes.ts:25`** — widen `currency: 'CAD'` literal type to `string` (blocks multi-currency at compile).
- [ ] **Centralize voice/UX timing magic numbers** into `lib/cenaiva/voice/timings.ts`. Currently scattered across `CenaivaAssistantProvider.tsx:78–88`, `useMobileTranscription.ts:16–23`, `useMobileTTS.ts:350+`, `useCenaivaWakeWord.ts:32–37`.
- [ ] **Centralize network timeouts** into `lib/network/timeouts.ts`. Currently `useCenaivaOrchestrator.ts:6` (45_000), `getCenaivaSmallPrompt.ts:97` (6_000), `publicBookingApi.ts:73–75` (45_000/1800/6000), etc.
- [ ] **Centralize SQL column lists** for `restaurants`/`menu_items`. Currently inconsistent across `cenaiva-orchestrate/index.ts:2304/4725/5181`, `lib/supabase/fetchRestaurants.ts:61`, `lib/cenaiva/api/dataHooks.ts:198`.
- [ ] **`_shared/availability.ts:605/624`** — extract `14 * 60 + 30` (afternoon split) into a named constant.
- [ ] **`searchFallback.ts:174`** — extract `<= 50` km nearby radius into `NEARBY_RADIUS_KM`.
- [ ] **`lib/map/mapFilters.ts:80`** — extract `>= 4.6` "Top rated" cutoff into `TOP_RATED_MIN`.
- [ ] **`lib/booking/addToCalendar.ts:81`** — extract `'TRIGGER:-PT2H'` into `CALENDAR_REMINDER_HOURS = 2`.
- [ ] **`lib/booking/publicBookingApi.ts:122/127`** — move demo `floor_capacity: 150` and `'18:00'` slot fallback into `lib/mock/bookingAvailability.ts`. Keeps demo-only values out of the production module.
- [ ] **`lib/storage/restaurantPaymentMethod.ts:25–32`** — drop the BIN-prefix `inferCardBrand`. Use Stripe's `card.brand` from the saved payment-method object.
- [ ] **`app/(customer)/profile/register-restaurant-card-entry.tsx`** — `MONTHLY_FEE_LABEL = '$200.00 / mo'` is inlined for the receipt totals. Move to a single owner-pricing source once Cenaiva monthly pricing exists in config.
- [ ] **`scripts/qa/mobile-click-smoke.mjs`** — read scheme + bundle ID from `app.json` at runtime instead of hardcoding two values.
- [ ] **Sanitize developer paths** in `docs/hey-cenaiva-mobile-recent-handoff.md`, `docs/hey-cenaiva-latency-optimization-handoff.md`, `__tests__/cenaiva/latencyBudget.test.ts`. Replace `/Users/stevengeorgy/...` and `10.0.0.69` with placeholders.
- [ ] **`SEATLY-MASTER-BIBLE.mdc:8`** — `Last updated: March 2026` is already past today. Replace with a git-tracked stamp or update.
- [ ] **`README.md`** — currently one line. Pick a canonical name (`mobile-cenaiva-v2` per `package.json` matches).
- [ ] **`eas.json`** — add `production` and `preview` build profiles. Currently only `development`.
- [ ] **`.env.example`** — replace real-looking ElevenLabs voice IDs (lines 24–25) with placeholder strings. Replace Twilio `+10000000000` with country-agnostic `+<country><number>`.
- [ ] **`lib/storage/restaurantPaymentMethod.ts:25`** — duplicate version constants between `package.json`, `build.gradle`, podspec for the social-share module.
- [ ] **Thread `availableSlots` through `lib/map/mapFilters`** so `MapRestaurantPopup` can render the `AvailableTimes` rail instead of always falling back to NotifyMe. The mobile `Restaurant` type currently has no `availableSlots` field — the web computes them per-restaurant from a tonight-availability query. Mirror that query at the map-data layer (probably in `lib/map/mapFilters.ts` or a new `lib/map/availability.ts`) so the popup gets a populated `availableSlots: AvailabilitySlot[]` on each marker tap.

**Effort:** 4–8 hours. **Risk:** Low.

---

## Phase L — Backend tables (separate stream, requires DB work)

Items that need new Supabase tables/columns. Each is independently sequencable; not blocked by Phases E–K.

- [ ] **Per-user referral codes** — `user_profiles.referral_code` column (unique, generated at signup). Frontend fetches; remove `REFERRAL_CODE = 'ALEX-CENAIVA-24'` placeholder.
- [ ] **`restaurants.tax_rate NOT NULL`** — DB migration after backfill (`SELECT id FROM restaurants WHERE tax_rate IS NULL` first). Then drop the `?? DEFAULT_TAX_RATE_FALLBACK` and `throw 'restaurant_misconfigured'` instead.
- [ ] **`restaurants.timezone NOT NULL`** — same pattern.
- [ ] **`restaurants.currency NOT NULL`** — same pattern.
- [ ] **`restaurants.max_party_size NOT NULL`** — already exists per `_shared/availability.ts:126`; expose to client mapper so booking screens can clamp per-restaurant.
- [ ] **`auth.sessions` listing endpoint** — wire up `app/(staff)/active-sessions.tsx`.
- [ ] **`/owner/billing/cycle` endpoint** — Stripe-of-record numbers for `subscription-plan.tsx` / `billing-history.tsx` / `billing-year.tsx`. Replace env-driven on-device math.
- [ ] **`loyalty_rewards` table** + admin editing UI. Replace `mockRewards` in `loyalty.tsx`.
- [ ] **`loyalty_transactions` table**. Replace `mockLoyaltyTransactions`.
- [ ] **`wallet_transactions` table** + endpoint. Replace `MINI_ACTIVITY` and credits/gift cards in `wallet.tsx`.
- [ ] **`/owner/stats/bookings` endpoint** — aggregations from `reservations` for today/this-week counts. Replace placeholders in `app/(staff)/profile/index.tsx` and home.
- [ ] **Real analytics aggregations** — drop the synthesized `* 0.62 / * 0.32 / ...` revenue breakdown from `app/(staff)/analytics.tsx` (currently demo-gated).
- [ ] **`referral_program_settings` row** — replace literals in `lib/storage/referralLimits.ts` (`REFERRAL_DAILY_SHARE_LIMIT`, `REFERRAL_LIFETIME_CREDIT_CAP`, `REFERRAL_SHARE_COOLDOWN_SECONDS`) with remote config.
- [ ] **`staff_members` query** — replace empty `INITIAL_TEAM` in `staff-members.tsx`.
- [ ] **`staff_pins` query** — replace empty `INITIAL_PINS` in `staff-pins.tsx`.

**Effort:** Per item; some are small (referral code), some are big (analytics). Sequence based on which user feature is most painful.

---

## How to use this checklist

1. Open the file. Tick items as you (or an LLM) lands them.
2. Each phase is meant to ship as one or more commits to `main`. Don't bundle phases.
3. Run `npx tsc --noEmit | grep -v "mobile-seatly-v2-2"` after every batch — must be clean.
4. After Phase H, also run `npx supabase functions deploy ...` for the touched edge functions.
5. After every phase, smoke the affected screens in both demo mode (`EXPO_PUBLIC_CENAIVA_DEMO_MODE=true`) and production mode (`false`) before committing.

## What's already done (commits on `main`)

Reference for what NOT to redo:

- `5deaed8` — Promotions claim flow, refer-and-earn rate limits, map zoom rescue
- `be4ace8` — Centralize client-side duplicate constants
- `4c97d29` — Centralize server-side `_shared/` constants (booking-defaults, elevenlabs, stripe, geo, uuid, confirmation-code)
- `3db33c1` — Drop personal/PII fallbacks (Savyo Yaqoop, Mark Henderson team, fake PINs/sessions/2FA target, `198` weekly bookings)
- `328ed50` — Consolidate legal/contact links (`privacy@cenaiva.com`, brand domain, support email)
- `9f5abe5` — Misc cleanup (Deepgram URL env, map center env, voice ID fallbacks dropped, ICS brand, full `.env.example`)
- `da43255` — Replace `mockCustomer.id` with real auth user (9 production files); Toronto pin removed from feed
- `d8313fc` — `$200 / month` literal removed; preference picker lists extracted
- `6b0c3f0` — Server hardening (test-mode payment gate, CORS allowlist via env)
- `6315501` — Mock-data gating for wallet, loyalty, billing-year, analytics, receipts
- Phase E (this commit) — half-fixes: Stripe API version + confirmation-code generators centralized; CEN- prefix chosen; `register-restaurant-owner` uses `_shared/stripe.ts` + `_shared/cors.ts`; tax/currency/timezone fallbacks unified; Nominatim UA built from `BRAND_DOMAIN`; storage modules use `key()`; `lib/storage/migrate.ts` created and wired into `_layout.tsx`; `addToCalendar` and `ThemeProvider` adopt central constants
- Phase F (this commit) — visible brand & data integrity: synthesized `4.5★` and Toronto coord defaults dropped (Restaurant.avgRating/lat/lng now nullable, ~30 consumers updated to render "New" / filter unmappable rows); "Seatly" → "Cenaiva" in changePasswordSub; orphaned `scheduleVenue`/`scheduleManagerName` i18n keys removed; `cenaiva.app` consolidated to `cenaiva.com` (support email, share caption); `app/(staff)/rate-seatly.tsx` → `rate-cenaiva.tsx`; iOS bundle id aligned to `com.cenaiva.app` (CFBundleURLTypes deduped); `hoursStatus.ts` defaults to `DEFAULT_TIMEZONE`; Deepgram live-token call gated behind `EXPO_PUBLIC_DEEPGRAM_LIVE_TOKEN`
- Phase G — mock-data sweep, gated every `lib/mock/*` runtime import behind `isDemoModeEnabled()` across G.1 customer (21 files), G.2 staff/owner (20 files; owner-home dashboard now zeros instead of fabricated $4,280 revenue), G.3 booking flow (3 files), G.4 components (13 files). Pattern: `import { mockX as DEMO_X } from ...; const mockX = isDemoModeEnabled() ? DEMO_X : []`. Pure utility functions (`timeAgoLabel`, `getUrgencyCopy`, `shortTagLine`, `getDiscoverBadges`) and type-only imports left unchanged.
- Phase H (this commit) — edge-function security: new `_shared/openai.ts` (lazy client + ORCHESTRATOR_MODEL/SMALL_PROMPT_MODEL/temperature/max_tokens) consumed by `cenaiva-orchestrate` and `cenaiva-small-prompt`; new `_shared/rateLimit.ts` (Deno-KV IP bucket, fail-open on KV errors) wired into `prepare-phone-login` at 10 reqs/IP/min; new `_shared/auth.ts` (`checkAuth(req) → 401 helper`) wired into `cenaiva-availability` and `cenaiva-small-prompt`. `verify_jwt = true` flipped for `cenaiva-orchestrate`, `cenaiva-availability`, `cenaiva-small-prompt`, `elevenlabs-tts`. Public booking flow (`get-availability`, `create-public-booking`) and signup endpoints (`prepare-phone-login`, `register-restaurant-owner`) intentionally left open. CORS wildcard removal deferred until `ALLOWED_ORIGINS` env is set on the project.
- Phase I (this commit) — design-token unification: new `lib/theme/tokens.ts` is the single source of truth (brand gold, palettes, spacing, owner-side scales, border radius, loyalty tier colors, `withAlpha()` helper). `palettes.ts`, `index.ts`, `ownerTheme.ts`, `tailwind.config.js`, `loyalty/tiers.ts`, `map/darkMapStyle.ts` all import from tokens (or mirror with a header note in the case of Tailwind). `ownerSpace` aliased to subset of `spacing` so owner UI keeps current pixel values. `darkMapStyle.ts` now exports both dark and light styles via `buildGoogleMapStyle(palette)`. Stale `design-system/MASTER.md` (both copies) deleted along with the empty directory.
- Phase J (this commit) — validation/i18n/multilingual: new `lib/validation/{phone,canadaTax}.ts` and `_shared/phone.ts` centralize phone + HST validation across mobile, server, and the owner-signup form (which previously had a looser phone variant). Deepgram model/language env-driven. ~12 hardcoded English fallback strings (`'New user'`, `'User'`, `'Restaurant'`, ICS title/body, share dialog) moved to i18n with French equivalents. `NOTICE_OPTIONS` reshaped to `[{ minutes, labelKey }]`. `PRICE_LEVEL_CATEGORY_NAMES` extended with French menu terms. Price thresholds env-overridable. `torontoTime.ts` split into `getZonedHour24(tz)` + Toronto wrappers. Restaurant billing-address country default env-driven.
