# AGENTS.md — handoff for any agent working in this repo

If you're an LLM agent (Claude Code, Cursor, Aider, GPT-something) walking into this codebase fresh, read this first. It captures **what the project is, what's been done recently, what conventions exist, and the lessons learned the hard way** so you don't relearn them.

For terse, Claude-Code-specific operating rules see [`CLAUDE.md`](./CLAUDE.md). For the rolling un-hardcoding plan see [`docs/UNHARDCODE_CHECKLIST.md`](./docs/UNHARDCODE_CHECKLIST.md). The original product brief / design contract is [`SEATLY-MASTER-BIBLE.mdc`](./SEATLY-MASTER-BIBLE.mdc) (note the legacy "Seatly" name; product is now Cenaiva).

---

## What this is

**Cenaiva** is a restaurant reservation app with two sides:

- **Customer app** — browse, book, snap reviews, loyalty, referrals, AI assistant ("Hey Cenaiva")
- **Staff/owner app** — reservations, floor management, KDS, CRM, analytics, billing

Stack:

- **Frontend**: React Native + Expo SDK 55, Expo Router, NativeWind (Tailwind), React Native Reanimated
- **Backend**: Supabase (Postgres + Edge Functions in Deno)
- **Payments**: Stripe (subscriptions + per-booking fees)
- **Voice**: ElevenLabs TTS + Deepgram STT, OpenAI for the assistant
- **Maps**: react-native-maps with Google provider on Android, Apple Maps on iOS

Working directory is `/Users/savyoyaqoop/mobile-seatly-v2-15`. Repo is `savyo777/mobile-seatly-v2`. Folder + repo name still say "seatly" — the brand was renamed to Cenaiva but the rename is incomplete (see [Lessons learned](#lessons-learned)).

---

## Architecture map

```
app/                          Expo Router routes
  (auth)/                     login, register, owner-login, owner-register
  (customer)/                 customer-side tabs
    discover/                 restaurant browse, snap reviews, post-review
    activity/                 bookings + orders + receipts
    bookings/                 booking detail
    orders/                   order detail
    checkout/                 preorder checkout
    profile/                  profile, wallet, loyalty, invite, settings, legal
    events/                   events list
    feed.tsx, map.tsx, notifications.tsx
  (staff)/                    owner-side screens
    home, reservations, crm, floor, ordersKds, schedule, staff,
    analytics, insights, events, promote, promotions, waitlist,
    expenses, ai, menu*, billing-*, subscription-plan, settings,
    business, business-hours, reservation-settings, profile, legal,
    payment-method, add-card, billing-address, security, ...
  booking/[restaurantId]/     6-step booking flow (date → time → table →
                              preorder → review → payment → confirmation)
components/                   shared components grouped by domain
  booking/, cenaiva/, discover/, events/, feed/, map/, owner/,
  postVisit/, profile/, snaps/, ui/
lib/                          domain logic, services, storage, theme
  auth/                       AuthContext, identity helpers, lockout policy,
                              role normalization
  booking/                    booking limits, defaults, public API,
                              date utils, hours schedule, calendar export
  cenaiva/                    voice assistant (provider, voice hooks, API)
  config/                     demo mode flag, legal links, contact info,
                              social links
  constants/                  preferenceCatalog (and other shared lists)
  data/                       restaurantCatalog (the source for restaurant
                              rows in the app)
  loyalty/                    tier tables (loyalty + diner)
  map/                        map filters, geo, dark map style
  mock/                       mock data — gated by isDemoModeEnabled() in
                              real screens
  owner/                      owner-specific constants (roles, KDS,
                              promotion types, trial policy)
  receipt/                    receipt payload + HTML builder
  restaurants/                pricing tiers, hours status
  services/                   accountSecurity, oauth, ownerRestaurant,
                              phoneAuth, restaurantRegistration, userProfile
  sharing/                    share-card generator + native social share
  storage/                    AsyncStorage helpers (cards, claimed
                              promotions, billing address, referral limits,
                              keys helper)
  supabase/                   supabase client + env + row mappers
  theme/                      palette, typography, owner theme override
  types/                      shared type re-exports (work in progress)
  utils/                      formatCurrency, etc.
supabase/
  config.toml                 verify_jwt + project ref
  functions/                  Deno edge functions
    _shared/                  ⭐ one source of truth — booking-defaults,
                              elevenlabs, stripe, geo, uuid,
                              confirmation-code, cors, jwt, hours, time,
                              availability, booking, supabase, json-response
    cenaiva-orchestrate/      AI tool-calling orchestrator
    cenaiva-availability/     flexible availability
    cenaiva-small-prompt/     fast OpenAI + ElevenLabs micro-prompt
    create-public-booking/    booking write
    get-availability/         booking-time slots
    elevenlabs-tts/           TTS proxy
    register-restaurant-owner/ Stripe customer + setup-intent flow
    prepare-phone-login/      OTP login init
    delete-account/           soft-delete
  migrations/                 SQL migrations
docs/                         handoffs and integration docs
  UNHARDCODE_CHECKLIST.md     ⭐ rolling work plan
  integration/                deep linking, etc.
.env.example                  every public/server env var documented
```

---

## Recent work (chronological)

The most recent session focused on a comprehensive **un-hardcoding pass** triggered by a security/hardcoding audit. The work is on `main`. Highlights:

1. Built three new features (claim button on promotions, refer-and-earn rate limits, map zoom-out lockout fix).
2. Created [`docs/UNHARDCODE_CHECKLIST.md`](./docs/UNHARDCODE_CHECKLIST.md) — phased plan E through L.
3. Centralized **client-side** constants into the table linked above (booking defaults, lockout policy, loyalty tiers, legal links, contact emails, staff roles, etc.).
4. Centralized **server-side `_shared/`** modules (booking defaults, ElevenLabs, Stripe, geo, UUID, confirmation code).
5. Dropped PII fallbacks (`Savyo Yaqoop` from receipts, `mark@novaristorante.com` / `+1 416 555 0142` from 2FA, fake `INITIAL_PINS`/`INITIAL_TEAM`/`INITIAL_SESSIONS`, hardcoded `198 weekly bookings`).
6. Consolidated legal/contact links (`privacy@seatly.com` → `privacy@cenaiva.com`, `seatly.com/licenses` → `cenaiva.com/licenses`, single `TERMS_URL`/`PRIVACY_URL`/`SUPPORT_EMAIL`).
7. Replaced **`mockCustomer.id`** with real auth identity in 9 production files via the new `useCurrentUserId()` hook (`lib/auth/currentUserId.ts`).
8. Toronto-pinned local feed → real device location via existing `useLocation()` hook.
9. Server hardening — test-mode payment branch in `cenaiva-orchestrate` now requires `CENAIVA_ALLOW_TEST_PAYMENTS=1`; CORS allowlist via `ALLOWED_ORIGINS`.
10. Mock-data gating for the 5 highest-impact screens (wallet, loyalty, billing-year, analytics breakdown, receipts). ~75 more screens remain — see Phase G of the checklist.

A second audit pass found regressions and missed sites; those are tracked in the checklist as Phase E.

---

## Conventions

### Demo mode

The app has a global flag `EXPO_PUBLIC_CENAIVA_DEMO_MODE`. The helper `isDemoModeEnabled()` in `lib/config/demoMode.ts` is the canonical check.

When you import from `lib/mock/*` in any non-mock, non-test file, **gate it**:

```ts
import { mockReservations as DEMO_RESERVATIONS } from '@/lib/mock/reservations';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const mockReservations = isDemoModeEnabled() ? DEMO_RESERVATIONS : [];
```

In production, real screens render empty / zero state. Real Supabase queries are stubs in many places — they will land per Phase L of the checklist.

### Auth identity

For "the current user's id" in production code, **always use the hook**:

```ts
import { useCurrentUserId } from '@/lib/auth/currentUserId';

const me = useCurrentUserId();
if (!me) return null; // or show sign-in CTA
```

The hook returns:
- The authenticated user id when signed in
- `mockCustomer.id` only when demo mode is on AND the user is unauthenticated
- `null` otherwise — write paths must refuse to proceed in this case

Don't import `mockCustomer.id` directly into a real screen.

### Centralized constants

Before introducing a new constant, check whether one of these already exists (full list in `CLAUDE.md`):

- `lib/booking/bookingDefaults.ts` — turn time, slot duration, timezone, currency, party-size limits, advance days
- `lib/loyalty/tiers.ts` — Bronze 0 / Silver 500 / Gold 1500 / Platinum 3000 (single source of truth — was previously contradicted between settings.tsx and loyalty.tsx)
- `lib/auth/lockoutPolicy.ts` — `MAX_FAILED_ATTEMPTS`, `LOCKOUT_MS`
- `lib/config/legalLinks.ts` — `BRAND_DOMAIN`, `TERMS_URL`, `PRIVACY_URL`, `LICENSES_URL`, `ACK_URL` (env-overridable)
- `lib/config/contactInfo.ts` — `SUPPORT_EMAIL`, `PRIVACY_EMAIL`, `LEGAL_EMAIL`
- `supabase/functions/_shared/booking-defaults.ts` — server-side mirror of bookingDefaults
- `supabase/functions/_shared/elevenlabs.ts` — voice ID, model, voice settings
- `supabase/functions/_shared/stripe.ts` — `STRIPE_API_VERSION`, `stripeRequest`, `stripeGet`
- `supabase/functions/_shared/geo.ts` — `haversineKm`
- `supabase/functions/_shared/confirmation-code.ts` — `makeConfirmationCode()`

Don't reinvent. If you see a duplicate, fix the duplication or add it to the checklist.

### Branching

- **Commit straight to `main`.** Solo developer; no PRs.
- Push with `git push origin main` after each meaningful batch.
- Sentence-case commit messages, no conventional-commit prefix.
- Include `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>` on AI-assisted commits.

### Edge function deploys

The agent **writes** function code; the user **runs** the deploy:

```bash
npx supabase functions deploy <name> --project-ref exbjodmnpdiayfzrdyux
```

Mention required deploys in the commit message so the user knows.

### DB migrations

Same — agent writes SQL under `supabase/migrations/`, user applies.

For destructive changes (`NOT NULL`, column drops), supply a precheck query first:

```sql
SELECT id FROM restaurants WHERE tax_rate IS NULL;
```

### Type checking

The repo has a stale `mobile-seatly-v2-2/` subfolder that's irrelevant and full of pre-existing TypeScript errors. Always filter it:

```bash
npx tsc --noEmit 2>&1 | grep -v "mobile-seatly-v2-2"
```

If the filtered output is empty, you're clean.

### i18n

react-i18next is set up. Locale files at `lib/i18n/locales/{en,fr}.ts`. The bilingual launch is a hard requirement — when adding user-visible copy, add both English and French keys, not raw strings.

---

## Lessons learned

Things that bit us in this codebase. Don't repeat.

### 1. The brand was renamed but the rename is incomplete

The product is now **Cenaiva** but the legacy name **Seatly** still surfaces in:

- Folder name (`mobile-seatly-v2-15`)
- AsyncStorage keys prefixed `@seatly/...` (6 files; helper `lib/storage/keys.ts` exists but isn't fully adopted)
- Confirmation-code prefix `SEAT-` (in `_shared/confirmation-code.ts:11`)
- Nominatim User-Agent on the orchestrator (`Seatly/1.0 (seatly.app)`)
- i18n strings: `"Update your Seatly password"` in `en.ts:403` and `fr.ts:403`
- `design-system/MASTER.md` (Seatly gold `#D4AF37`, Playfair Display SC fonts the app doesn't load)
- Filename `app/(staff)/rate-seatly.tsx`

Two domains coexist: `cenaiva.app` (support email) and `cenaiva.com` (legal links, share captions). Pick one before adding new references.

### 2. `mockCustomer.id` was used as the real user's identity

In nine production files, code did `const ME = mockCustomer.id` and then wrote snap reviews / saved likes / read notifications under `'u1'` regardless of whether the user was signed in. Fixed via `useCurrentUserId()` (`lib/auth/currentUserId.ts`).

**Rule:** never import from `lib/mock/users` in a non-mock, non-test file outside the auth-fallback helper.

### 3. Owner-facing fake metrics

`app/(staff)/billing-year.tsx` had 22 fabricated monthly invoices ($558.0, $612.5, $487.25 …) for years 2024–2026. `app/(staff)/profile/index.tsx` had `thisWeekBookings = 198` hardcoded. `app/(staff)/analytics.tsx` synthesized revenue breakdowns as percentages of one number (Food 62%, Drinks 32%, Tips 12%…). Customers thought they were seeing real data.

**Rule:** in any owner-facing screen, fake numbers must be gated behind `isDemoModeEnabled()`. Never synthesize plausible-looking numbers without a `demo` label.

### 4. Two `Stripe` API versions in the same project

`register-restaurant-owner/index.ts` ran on Stripe API `2024-06-20` while `cenaiva-orchestrate/index.ts` was on `2025-02-24.acacia`. Stripe response shapes differ between versions, so this caused intermittent shape-mismatch bugs.

**Rule:** Stripe access goes through `_shared/stripe.ts`. Don't `import Stripe from 'npm:stripe@N'` directly inside a function. Use `STRIPE_API_VERSION` from the shared module.

### 5. Confirmation-code formats fragmented

Three or four different confirmation-code generators existed (`SEAT-XXXXXX`, `PRE-XXXX`, `CEN-XXXX`, `CNV-NNNNNN`) with different prefixes and alphabets. All collision-prone.

**Rule:** the canonical generator is `makeConfirmationCode()` in `_shared/confirmation-code.ts`. Use it. Don't re-implement.

### 6. Tailwind palette drifted from the runtime theme

`tailwind.config.js` had `gold: '#C9A84C'` while `lib/theme/palettes.ts` had `#C9A24A` and `design-system/MASTER.md` had `#D4AF37`. UI looked different depending on whether NativeWind classes or `useColors()` was used.

**Rule:** when changing a theme color, change it in `lib/theme/palettes.ts` and verify Tailwind matches. Phase I of the checklist proposes a single token source.

### 7. `0.13` (Ontario HST) was the silent default everywhere

Four call sites silently substituted Ontario HST for any restaurant whose `tax_rate` was NULL. Wrong outside Ontario. The constant is now centralized in `lib/booking/bookingDefaults.ts:DEFAULT_TAX_RATE_FALLBACK` (deprecated) and `_shared/booking-defaults.ts` — but the call sites still need to fail loudly instead of using the fallback. Fix path: enforce `restaurants.tax_rate NOT NULL` in the DB and throw `"restaurant_misconfigured"` when missing.

**Rule:** for tax/timezone/currency, the database row is the source of truth. Throw, don't default.

### 8. CORS was wide open

`_shared/cors.ts` had `Access-Control-Allow-Origin: '*'` on every public function. Combined with `verify_jwt = false` on most functions, anyone could hit the AI endpoints from a browser tab and burn OpenAI/ElevenLabs spend. Fixed: env-driven `ALLOWED_ORIGINS` with a backward-compat `*` fallback that should be removed once the operator wires up the env.

**Rule:** new public endpoints opt-in to a tight allowlist; document the env in `.env.example`.

### 9. Test-mode payment fabricated successful charges

`cenaiva-orchestrate` had a test-mode branch that minted a fake successful payment record when `STRIPE_SECRET_KEY` was empty. If the env was ever lost in production (rotation race, deploy bug), every charge would silently succeed without billing the customer. Fixed: now requires explicit `CENAIVA_ALLOW_TEST_PAYMENTS=1`.

**Rule:** test-mode shortcuts in payment paths must be behind an explicit env flag, never solely behind "is the production secret missing".

### 10. The `mobile-seatly-v2-2/` subfolder

There's a stale duplicate copy of an older codebase at `./mobile-seatly-v2-2/`. It's full of pre-existing TypeScript errors, has its own `package.json`, and is **not** loaded by the app. Filter it from typechecks (`grep -v "mobile-seatly-v2-2"`). Don't edit it. Don't include it in audits. Don't be confused by the duplicate file paths.

### 11. The user wants everything on `main`

This was repeated three times in different sessions:
- "no, work on the main branch, this is why i cant see any changes youre doing"
- "i want everything to main thoguh"
- "from now and on whatever you do commit it to main branch"

The user is solo and reviews work by running the app from `main`. Don't open PRs unless they explicitly ask.

### 12. The user is not literal about file/path conventions

When the user says "make a claude.md file", they mean it should work — not that the filename must be lowercase. CLAUDE.md is the Claude Code convention. Use the convention.

---

## Where to start

1. Read [`CLAUDE.md`](./CLAUDE.md) for the operating rules.
2. Open [`docs/UNHARDCODE_CHECKLIST.md`](./docs/UNHARDCODE_CHECKLIST.md) and pick a phase.
3. If a fresh task lands that isn't on the checklist, decide: is it Phase E–L, or something new? If new, do the work; if it's an un-hardcoding item, tick it off as you go.
4. After every batch:
   - `npx tsc --noEmit | grep -v "mobile-seatly-v2-2"` is empty
   - `git add -A && git commit -m "..." && git push origin main`
   - Mention any required Supabase function deploys or DB migrations in the commit message — those are the user's job.

---

## Open questions / things only the user can decide

- **Brand domain canonical** — `cenaiva.com` (legal/marketing — current default) vs `cenaiva.app` (support email surface). Pick one and finish the migration.
- **Geographic expansion** — currently every default assumes Canada (`'CA'` country, Ontario HST, `'America/Toronto'` timezone, `+1` phone normalization, English-only copy). Multi-country requires backend table changes and is gated on a product call.
- **`STRIPE_OWNER_PLAN_PRICE_ID`** — the Stripe price ID for the owner subscription. Must be set in Supabase secrets for `register-restaurant-owner` to work.
- **`ALLOWED_ORIGINS`** — needs to be set in Supabase secrets to remove the `*` CORS fallback.

When in doubt, ask the user — don't guess on these.
