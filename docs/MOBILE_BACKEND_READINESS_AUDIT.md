# Mobile Backend Readiness Audit

Last reviewed: May 15, 2026

This audit covers the mobile app under `app/`, `components/`, `hooks/`, and
the runtime service modules under `lib/`. It excludes the stale duplicate
`mobile-seatly-v2-2/` folder and generated `graphify-out/` artifacts.

The goal is production behavior where every customer and staff screen is driven
by Supabase, Storage, Edge Functions, Realtime, Stripe, or the authenticated
user's own persisted preferences. Demo data may remain, but only behind
`EXPO_PUBLIC_CENAIVA_DEMO_MODE=true`.

## Status Legend

| Status | Meaning |
| --- | --- |
| Backend/automated | Production path reads/writes live backend data, is user or restaurant scoped, and does not show mock values to real users. |
| Partial | Some live backend exists, but the feature still has local-only state, demo-gated seed data, empty placeholders, missing write paths, or incomplete automation. |
| Mock/placeholder | No real production backend path exists yet, or the screen is intentionally empty/local until a table/function is built. |

## Executive Summary

The app is not fully backend-driven yet. The foundation is in place: auth,
restaurant catalog, bookings, reviews/snaps, owner restaurants, expenses, menu
items, events/promotions, KDS, floor tables, CRM, analytics, and notifications
all have at least some Supabase integration. The biggest remaining production
gaps are customer social/feed, wallet, referral, saved restaurants/collections,
customer payment methods, staff member/PIN management, sessions/2FA/biometrics,
Stripe invoice-of-record billing, and complete owner dashboard automation.

Current repo evidence:

- Roughly 500 mobile TypeScript files were reviewed by route/service grouping.
- More than 80 non-mock files still import from `lib/mock/*`, mostly gated by
  `isDemoModeEnabled()` but often with no live replacement yet.
- Live client code touches these Supabase tables today: `restaurants`,
  `user_profiles`, `reservations`, `visit_photos`, `restaurant_reviews`,
  `menu_items`, `orders`, `order_items`, `tables`, `guests`, `expenses`,
  `restaurant_analytics`, `notifications`, `events`, `promotions`, `waitlist`,
  `shifts`, `loyalty_transactions`, and several owner/admin helper tables.
- Mobile calls these Edge Functions today: `cenaiva-orchestrate`,
  `cenaiva-availability`, `cenaiva-small-prompt`, `elevenlabs-tts`,
  `create-public-booking`, `get-availability`, `register-restaurant-owner`,
  `prepare-phone-login`, `scan-receipt`, and `convert-currency`.

## Backend/Automated Today

These areas have a real production backend path and should be preserved while
the rest of the app catches up.

| Area | Current backend source | Notes |
| --- | --- | --- |
| Auth session, login, signup, owner login, password reset, phone OTP | Supabase Auth, `prepare-phone-login`, `user_profiles` | Email/password and phone auth are live. Lockout counters are local device safety state, which is acceptable. |
| Role routing and owner restaurant scope | `user_profiles`, `user_restaurant_roles`, `restaurants.owner_user_id` | Owner context supports legacy single-restaurant, role table, and owner column lookup. |
| Owner restaurant registration | `register-restaurant-owner`, Stripe, `restaurants` | Creates restaurant rows and billing setup. Keep deploy/secrets discipline for Stripe price IDs. |
| Restaurant catalog and map rows | `restaurants` via `loadRestaurantsForDiscover` / `fetchRestaurants` | Demo fallback is gated. Production renders live rows or empty states. |
| Public restaurant menu read | `menu_items`, `menu_categories` where used | Customer menu/detail screens can read live menu rows. |
| Booking availability and booking creation | `cenaiva-availability`, `get-availability`, `create-public-booking`, `reservations`, `orders`, `tables` | Real restaurants use backend availability and booking writes. Mock restaurant IDs still have a demo fallback path. |
| Customer booking list/detail | `reservations`, `restaurants`, `orders` | Reads signed-in user's profile-scoped reservations. Demo mode still uses mock reservations. |
| Reviews and visit photos | `restaurant_reviews`, `visit_photos`, Storage bucket `visit-photos` | Review insert/delete/list and snap photo upload/read are live. Social interactions around snaps are not live yet. |
| Availability alerts | `availability_alerts`, Realtime registry | Notify-me flow has backend create/cancel and route parsing. |
| Customer notifications | `notifications`, `post_turn_visit_requests`, Realtime registry | Reads live notifications and local post-turn requests; demo notifications are gated. |
| Cenaiva voice/AI booking assistant | `cenaiva-orchestrate`, `cenaiva-small-prompt`, `cenaiva-availability`, `elevenlabs-tts`, Deepgram token path | Core AI orchestration is backend-driven. Some UI context still uses demo restaurant rails when demo mode is enabled. |
| Owner profile, business profile, hours, closures, reservation settings | `restaurants`, `shifts`, Storage uploads | Core restaurant settings write to Supabase and Storage. Some secondary fields still live inside JSON/settings blobs. |
| Owner floor status | `tables`, `updateTableServiceStatus`, floor capacity helper | Production reads tables and writes service status. Floor plan layout authoring is not complete. |
| Owner reservations | `reservations`, `tables`, staff reservation services, Realtime availability registry | Production loads and updates reservations; demo reservation rows are gated. |
| Menu management | `menu_items` | CRUD writes exist. Category management is mostly derived from item category strings, not a dedicated production category workflow. |
| Expenses and receipt scan | `expenses`, `recurring_expense_rules`, receipt Storage, `scan-receipt`, `convert-currency` | Production read/create/update/delete and scan flows exist. Demo expenses are gated. |
| Events and promotions | `events`, `promotions`, media Storage | Owner create/list and customer event reads are partially live and should be expanded rather than replaced. |
| KDS/orders | `orders`, `order_items`, `order_item_modifiers`, `tables`, Realtime registry | Production KDS tickets and live feed exist. POS ingestion/automation completeness still depends on live order creation. |
| CRM and guest intel | `guests`, `ai_suggestions` | Reads real guest rows and AI suggestions; messaging/note actions still need persistence. |
| Owner analytics/insights/home metrics | `restaurant_analytics`, `reservations`, `guests`, `ai_suggestions` | Live rows are used for several charts and cards; not all widgets have authoritative backend aggregations yet. |
| Staff notifications | `notifications` | Reads live restaurant-scoped notifications. |

## Partially Mock Or Placeholder

These areas have some backend wiring but still need production completion before
the app can be considered fully functional.

| Area | Current state | Required backend completion |
| --- | --- | --- |
| Customer profile edit | Reads/writes `user_profiles.full_name` and phone, but username and bio are hardcoded as `alexj` / `Chasing great meals across the city`; avatar picker does not upload to Storage. | Add `username`, `bio`, and avatar Storage upload/update. Enforce username uniqueness. |
| Customer profile overview/settings | Uses Auth/profile data for some rows; several settings are static/local or preference-only. | Persist all profile, privacy, notification, appearance, language, and preference settings to `user_profiles` or settings tables. |
| Discover home | Restaurant rows are live, but people search/follow, unread count, trending restaurants, and some presentation helpers are mock. | Build live social/user search, follow graph, unread count, and personalized restaurant ranking. |
| Restaurant detail | Restaurant/menu/reviews/snaps can be live, but mock fallback still supports demo restaurant rows and some presentation copy. | Keep demo fallback gated; ensure every production restaurant detail field comes from `restaurants`, `menu_items`, reviews, and visit photos. |
| Map | Live restaurant rows are available, but some map-specific presentation and demo location-radius logic remain. | Make map filters/radius/settings user-controlled and persist preferences. |
| Activity/orders/checkout | Reservations/orders read live in places; checkout detail still reconstructs missing order/item data or falls back in demo. | Add robust order detail endpoint/table read for customer receipts, preorders, refunds, and payment state. |
| Loyalty | `user_profiles.loyalty_points_balance` and `loyalty_transactions` are read; reward catalog is still mock/empty in production. | Add `loyalty_rewards` table, redeem endpoint, ledger writes on bookings/referrals/reviews, and admin reward management. |
| Wallet | Production renders zero/empty values; payment methods, credits, gift cards, and wallet activity are mock only in demo. | Add wallet ledger, credits, gift cards, saved payment method integration, and remote activity endpoint. |
| Referrals | Share rate limits are AsyncStorage-only; referral code/reward amounts are mock constants. | Add per-user referral code, referral events, remote limits/settings, first-booking reward automation, and fraud-safe caps. |
| Customer payment methods | Some local AsyncStorage card helpers exist; owner billing card fields are live separately. | Move customer cards to Stripe customer/payment method records and a Supabase-backed display endpoint. |
| Saved restaurants, promotions, collections | Saved restaurant list, claimed promotions, and snap collections are demo/local. | Add saved restaurants, saved/claimed promotions, and snap collections tables with RLS. |
| Feed/snaps/social | Snaps can be stored in `visit_photos`, but feed lists, following/trending, likes, saves, comments, and users are mock/demo. | Add social profiles, follows, likes, saves, comments, feed queries, ranking, and moderation states. |
| Post-visit prompts | `post_turn_visit_requests` exists and local AsyncStorage keeps prompt state. | Make prompt scheduling/read/dismiss state fully backend-sourced and notification-driven. |
| Help/about/support/rate screens | Mostly static app copy, FAQ arrays, or local forms. | Decide which are static content vs remote CMS/support ticket creation; wire support/rating submissions if they are product workflows. |
| Owner home dashboard | Several metrics read live, but floor counts, attention cards, pending/up-next, and some service windows are incomplete or derived client-side. | Add owner stats endpoints or views for today/week, covers, pending/reservation risk, floor occupancy, attention items, and trend aggregation. |
| Owner analytics/insights | Reads `restaurant_analytics`, `guests`, and `ai_suggestions`; revenue breakdowns and insights are incomplete when rows are missing. | Add authoritative analytics aggregation jobs/views for revenue, covers, cancellations, no-shows, channels, menu mix, and AI insight generation. |
| Owner CRM | Guest rows are live; notes, messages, visit history, favorites, upcoming reservations, churn/frequency/predictions are partial or placeholders. | Add guest notes, communication log, visit history joins, upcoming reservation joins, and AI scoring jobs. |
| Owner floor | Tables and status are live, but layout authoring/sections/capacity editing are not complete. | Add table/section CRUD, drag layout persistence, active floor plan versioning, and capacity validation. |
| Owner waitlist | Reads `waitlist`; create/update/notify automation is incomplete. | Add waitlist CRUD, quoted wait times, SMS/push notification automation, expiry, and conversion to reservation. |
| Owner schedule/staff dashboard | Reads shifts/briefing in some places; schedule swaps/contact/calendar actions still have demo text. | Add staff schedule table, shift swap requests, manager approvals, calendar export, and messaging integration. |
| Owner staff screen | Main staff dashboard reads roster/invites/approvals; standalone staff member management is empty local state. | Consolidate staff roster, invites, permissions, approvals, and staff member CRUD into one Supabase-backed model. |
| Owner billing/subscription | Current cycle math reads reservations/orders and env pricing; past invoices are empty; subscription plan uses stored restaurant Stripe fields. | Add Stripe-backed billing cycle/invoice endpoint and store/display real invoice/payment state. |
| Account security | Password/email/phone/delete/sign-out use Supabase; 2FA, biometrics, active sessions, quiet hours, and device security are local/empty. | Add session listing/revocation endpoint, real MFA state, SecureStore/local-auth wiring, and persistent quiet-hours/security preferences. |
| Owner export | Reads `accountant_exports` when available; export generation is not complete. | Add export job creation, file Storage, status polling, and downloadable CSV/PDF artifacts. |
| AI owner tools | Reads some `ai_suggestions`; microphone action has a mock timeout and generated alerts are basic. | Add persisted AI conversations, suggestion lifecycle, voice input backend, and action execution/audit logs. |

## Fully Mock Or Placeholder

These areas should be treated as missing production backend, even if the UI
renders correctly in demo mode or as an empty state.

| Area | Current placeholder | Backend needed |
| --- | --- | --- |
| Customer feed follow/trending/social graph | `lib/mock/snaps`, `lib/mock/social`, `lib/mock/feedCollections` | Social graph, feed query, ranking, like/save/comment/collection tables. |
| People search and follow/unfollow | `searchUsers`, `follow`, `unfollow`, `isFollowing` from mocks | Public profile search plus follow edges and privacy controls. |
| Saved restaurant list | `lib/mock/profileScreens` through `SavedRestaurantsList` | `saved_restaurants` table scoped to user profile. |
| Wallet credits/gift cards/activity | Demo arrays and zero production values | Wallet ledger and gift card tables/endpoints. |
| Referral code and invite history | `REFERRAL_CODE`, reward constants, mock invite records | Referral code column/table, invite events, reward automation. |
| Customer card list | Mock profile cards or AsyncStorage helpers | Stripe-backed saved payment method display/management. |
| Snap collections | `lib/mock/collections`; production mutators no-op | `snap_collections` and join table. |
| Staff members standalone screen | `INITIAL_TEAM = []`, local role edits/removals only | Staff member CRUD and invitation lifecycle. |
| Staff PIN codes | `INITIAL_PINS = []`, local generated PINs only | Secure staff PIN table or auth factor flow; never store plaintext PINs. |
| Active sessions screen | `INITIAL_SESSIONS = []` | Auth session listing/revoke Edge Function. |
| Biometric settings | Commented as local state to wire later | Expo LocalAuthentication + SecureStore-backed setting tied to auth session. |
| Two-factor screen | Local code/UI behavior | Supabase MFA enrollment/challenge/unenroll. |
| Owner past invoices | `PAST_YEARS = []` | Stripe invoice listing endpoint. |
| Customer help FAQs and several support surfaces | Static/mock FAQ arrays | Remote content or support ticket integration if dynamic behavior is required. |

## Backend Workstream

Implement in this order so production stops showing fake data while real
features become functional in small, reversible batches.

1. **Personal user data first**
   - Add and wire `username`, `bio`, `avatar_url`, profile photo Storage, and
     notification/privacy/language preference persistence.
   - Replace every hardcoded personal display value with `fetchCurrentUserProfile()`
     or a dedicated profile hook.

2. **Customer money and rewards**
   - Add wallet ledger, gift cards, referral codes/events/settings, loyalty
     rewards, and redeem endpoints.
   - Move customer payment methods to Stripe-backed APIs instead of mock/local cards.

3. **Customer social graph**
   - Add follows, likes, saves, comments, saved restaurants, snap collections,
     and feed queries over `visit_photos`.
   - Replace all mock social helpers with Supabase services and honest empty
     states when a signed-in user has no activity.

4. **Owner operations**
   - Finish owner home/analytics stats, floor plan CRUD, waitlist writes,
     KDS/order automation, staff member CRUD, staff PINs, and shift schedule
     workflows.
   - Prefer SQL views or Edge Functions for cross-table aggregates that the
     client currently derives imperfectly.

5. **Billing and security**
   - Add Stripe invoice/subscription cycle endpoints and session/MFA endpoints.
   - Replace local-only 2FA, biometrics, sessions, and quiet-hours state with
     persisted secure state.

6. **Remove production fallbacks**
   - Keep `EXPO_PUBLIC_CENAIVA_DEMO_MODE=true` demos working.
   - With demo mode false, no screen should import live values from `lib/mock/*`
     except type-only compatibility during refactors.
   - Production backend failures should show retry/empty/error states, not
     seeded fake rows.

## Acceptance Criteria

- With `EXPO_PUBLIC_CENAIVA_DEMO_MODE=false`, a new customer sees only their own
  profile, bookings, reviews, wallet, loyalty, notifications, saved items, and
  preferences from Supabase or honest empty states.
- With `EXPO_PUBLIC_CENAIVA_DEMO_MODE=false`, a new owner sees only their linked
  restaurants, staff, reservations, tables, menu, expenses, billing, analytics,
  notifications, and settings from Supabase/Stripe or honest empty states.
- Demo mode still renders seeded data only when explicitly enabled.
- Any new table exposed through the Data API has RLS enabled, policies scoped to
  `auth.uid()`/`user_profiles`/owner restaurant roles, and grants where required.
- Every batch runs:

```bash
npx tsc --noEmit 2>&1 | grep -v "mobile-seatly-v2-2"
```

## Related Tracking

- The older hardcoding tracker remains in `docs/UNHARDCODE_CHECKLIST.md`.
- New backend schema/function work should add migrations under
  `supabase/migrations/`; the user applies DB migrations and deploys Edge
  Functions.
