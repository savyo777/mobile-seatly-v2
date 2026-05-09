# Un-hardcoding Checklist

Phased plan to finish removing hardcoded values from the codebase. Each phase is sized to land as one PR / commit batch. Phases are ordered for efficiency: each builds on the previous and gets harder/riskier as you go down.

Tick items off as you land them. Most have file paths so an LLM (or you) can pick up exactly where this leaves off.

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

- [ ] **`lib/supabase/mapRestaurantRow.ts:118` — drop the synthesized `4.5` default rating.** Return `null` and let the UI render "no rating yet" instead of pretending every restaurant is 4.5★.
- [ ] **`lib/supabase/mapRestaurantRow.ts:21,26–27` — drop the Toronto coordinate fallback.** Return `null` lat/lng for restaurants without coords; map filters out unmappable rows.
- [ ] **`lib/i18n/locales/en.ts:403` and `fr.ts:403`** — replace "Seatly" with "Cenaiva" in the Settings → Change Password subtitle (`"Update your Seatly password"` and the FR equivalent).
- [ ] **`lib/i18n/locales/en.ts:600–601`** — gate the demo `scheduleVenue: 'Cenaiva — Downtown'` and `scheduleManagerName: 'Alex Rivera'` strings behind demo mode (or remove from the production bundle).
- [ ] **Resolve `cenaiva.app` vs `cenaiva.com` split-brain.** Pick one and update:
  - `lib/config/contactInfo.ts` (currently `help@cenaiva.app`)
  - `lib/sharing/generateShareCard.ts:6` (currently hardcoded `cenaiva.app`)
  - All places that import `BRAND_DOMAIN` (currently `cenaiva.com`)
  - `app/(staff)/rate-seatly.tsx` filename / route
- [ ] **`lib/booking/bookingDefaults.ts:9`** — `DEFAULT_TIMEZONE = 'UTC'` contradicts `lib/restaurants/hoursStatus.ts:114/122` and `lib/discover/torontoTime.ts` which default to `'America/Toronto'`. Pick one default and apply consistently.
- [ ] **`useMobileTranscription.ts:172`** calls `/functions/v1/deepgram-live-token` — that function doesn't exist in `supabase/functions/`. Either deploy it or remove/guard the call. **High risk if Deepgram path is reachable in prod.**
- [ ] **`app.json` bundle ID mismatch** — iOS uses `com.savyo.cenaiva`, Android uses `com.cenaiva.app`. Pick one (likely `com.cenaiva.app`) and align. Also dedupe the duplicate `CFBundleURLTypes` block at lines 22–33.
- [ ] **Update `docs/integration/DEEP_LINKING.md`** to match whichever bundle ID wins.

**Effort:** 2–4 hours. **Risk:** Medium (the bundle-ID change requires rebuild + reinstall test).

---

## Phase G — Mock-data sweep (large, methodical)

The bulk of remaining hardcoded data. ~75 production files import from `lib/mock/*` ungated. Batch D in the previous wave fixed only the worst 5. Approach: gate every consumer behind `isDemoModeEnabled()` and render empty state otherwise.

### Sub-phase G.1 — Customer side

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

### Sub-phase G.2 — Staff/owner side (highest visibility)

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

### Sub-phase G.3 — Booking flow

- [ ] `app/booking/[restaurantId]/step2-time.tsx` — `getEventById`
- [ ] `app/booking/[restaurantId]/review.tsx` — `getSnapRestaurantName`
- [ ] `app/booking/[restaurantId]/step4-preorder.tsx` — `mockMenuItems`, `menuCategories`
- [ ] `app/booking/[restaurantId]/step-prepay-offer.tsx` — `mockRestaurants`

### Sub-phase G.4 — Reusable components

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

- [ ] **Audit each `verify_jwt = false` function in `supabase/config.toml`** and flip to `true` where the function already does its own JWT decode internally:
  - `cenaiva-orchestrate` (does its own decode)
  - `cenaiva-availability` (currently NO internal auth check — flip carefully or add one)
  - `get-availability`, `create-public-booking`, `cenaiva-small-prompt`, `elevenlabs-tts`
  - Leave `prepare-phone-login` and `register-restaurant-owner` open (account creation flows that need anonymous access).
- [ ] **Set `ALLOWED_ORIGINS` env on the Supabase project** to remove the `*` CORS fallback in `_shared/cors.ts`. Once set, the wildcard fallback can be deleted.
- [ ] **Add IP-based rate limiting** to `prepare-phone-login` (and any other anonymous endpoint). Use Deno KV or a similar mechanism — write `_shared/rateLimit.ts`.
- [ ] **Set `CENAIVA_ALLOW_TEST_PAYMENTS=1` only on dev project**, never on production. Verify by inspecting Supabase secrets after deploy.
- [ ] **Add `_shared/openai.ts`** — single source for `OPENAI_API_KEY` env, model name, temperature, max_tokens. Currently `cenaiva-orchestrate` and `cenaiva-small-prompt` each instantiate the client independently.
- [ ] Deploy: `npx supabase functions deploy --project-ref exbjodmnpdiayfzrdyux`.

**Effort:** 3–6 hours. **Risk:** High if any anonymous caller breaks; coordinate with web app deploys.

---

## Phase I — Design tokens unified (one PR, mostly mechanical)

Three competing color/spacing/radius tables that have already drifted.

- [ ] **Create a single `design-system/tokens.json` (or `lib/theme/tokens.ts`)** with colors, spacing, radius. Treat as the source.
- [ ] **`tailwind.config.js`** — `require()` the tokens file and derive colors from it. Currently uses `gold: '#C9A84C'` (drifted from `lib/theme/palettes.ts:#C9A24A` and `design-system/MASTER.md:#D4AF37`).
- [ ] **`lib/theme/palettes.ts`** — import from the tokens file.
- [ ] **`lib/theme/ownerTheme.ts`** — replace inline rgba mixes (lines 21–32, 79) with a `withAlpha(token, alpha)` helper that takes from the palette.
- [ ] **Reconcile spacing scales**: `lib/theme/index.ts` (xs:4, sm:8, md:12, lg:16) vs `lib/theme/ownerTheme.ts` (xs:8, sm:12, md:16, lg:24, xl:32) vs Tailwind. Pick the 4pt grid (`lib/theme/index.ts`) and align.
- [ ] **Reconcile borderRadius scales** the same way.
- [ ] **`lib/map/darkMapStyle.ts`** — convert to a function `buildGoogleMapStyle(palette)` that returns the array, derived from palette tokens. Restores light-mode map.
- [ ] **`lib/loyalty/tiers.ts:12–17`** — move tier hex colors (`#CD7F32`, `#A8A8B8`, `#C9A84C`, `#E2E2F0`) into the palette as `tierBronze`, `tierSilver`, `tierGold`, `tierPlatinum` tokens.
- [ ] **Delete or regenerate `design-system/MASTER.md`** (and its byte-identical duplicate `design-system/seatly-owner/MASTER.md`). They reference Playfair Display SC + Karla fonts the app doesn't load and a third gold value `#D4AF37`.

**Effort:** 4–6 hours. **Risk:** Medium (visual). Verify in both themes before commit.

---

## Phase J — Validation, i18n, and multilingual readiness

Fixes that block expansion to non-English / non-Canadian markets.

- [ ] **Extract Canadian HST regex** (`/^\d{9}RT\d{4}$/i`) from `lib/services/restaurantRegistration.ts:46` → `lib/validation/canadaTax.ts`. Add a country-aware dispatch when expansion is on the roadmap.
- [ ] **Extract phone normalization** from `lib/services/phoneAuth.ts:36–56`, `supabase/functions/prepare-phone-login/index.ts:6–19`, `lib/services/restaurantRegistration.ts:49–55` → `lib/validation/phone.ts` (client) and `_shared/phone.ts` (server). Document the cross-side coupling.
- [ ] **`lib/cenaiva/voice/useMobileTranscription.ts:91`** — make Deepgram model + language env-driven (`EXPO_PUBLIC_DEEPGRAM_MODEL`, `EXPO_PUBLIC_DEEPGRAM_LANGUAGE`). Defaults `nova-3` / `en` are fine.
- [ ] **Translate English-only fallback strings**:
  - `'New user'` in `lib/auth/AuthContext.tsx:55`
  - `'User'` in `lib/auth/displayProfile.ts:27/53`
  - `'Restaurant'` in `lib/booking/myReservations.ts:91`
  - `'Reservation at <restaurant>'` ICS event title in `lib/booking/addToCalendar.ts:52/96`
  - ICS body strings (`'Confirmation code: ...'`, `'Party of ...'`, `'Notes: ...'`, `'Add reservation to your calendar'`) in `addToCalendar.ts:55–58/98–100`
  - Owner-side `NOTICE_OPTIONS` labels (`'30 min', '1 hour', ...`) in `lib/booking/bookingDefaults.ts:29` — convert to `[{ minutes, labelKey }]` pairs.
- [ ] **`lib/restaurants/pricing.ts:6`** — add French equivalents for `PRICE_LEVEL_CATEGORY_NAMES` (`plat principal`, `plats principaux`, `entrée`, `entrées`) or move to a backend `is_main_category` boolean.
- [ ] **`lib/restaurants/pricing.ts:5`** — `LOW_PRICE_MAX = 22` / `HIGH_PRICE_MIN = 55` are CAD-specific. When a non-CAD restaurant onboards, these will be wrong. Move to per-currency thresholds in DB or admin config.
- [ ] **`lib/discover/torontoTime.ts`** — rename to `getZonedHour24(timeZone)` etc.; keep a thin `getTorontoHour24()` wrapper. Removes "Toronto" from the contract.
- [ ] **`lib/restaurants/hoursStatus.ts:114/122`** — drop the `'America/Toronto'` default; require explicit `timeZone` argument from caller.
- [ ] **`lib/storage/restaurantBillingAddress.ts:20`** — `country: 'CA'` default → env-driven (`EXPO_PUBLIC_DEFAULT_COUNTRY`).

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
- [ ] **`scripts/qa/mobile-click-smoke.mjs`** — read scheme + bundle ID from `app.json` at runtime instead of hardcoding two values.
- [ ] **Sanitize developer paths** in `docs/hey-cenaiva-mobile-recent-handoff.md`, `docs/hey-cenaiva-latency-optimization-handoff.md`, `__tests__/cenaiva/latencyBudget.test.ts`. Replace `/Users/stevengeorgy/...` and `10.0.0.69` with placeholders.
- [ ] **`SEATLY-MASTER-BIBLE.mdc:8`** — `Last updated: March 2026` is already past today. Replace with a git-tracked stamp or update.
- [ ] **`README.md`** — currently one line. Pick a canonical name (`mobile-cenaiva-v2` per `package.json` matches).
- [ ] **`eas.json`** — add `production` and `preview` build profiles. Currently only `development`.
- [ ] **`.env.example`** — replace real-looking ElevenLabs voice IDs (lines 24–25) with placeholder strings. Replace Twilio `+10000000000` with country-agnostic `+<country><number>`.
- [ ] **`lib/storage/restaurantPaymentMethod.ts:25`** — duplicate version constants between `package.json`, `build.gradle`, podspec for the social-share module.

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
