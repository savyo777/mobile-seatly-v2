# Cenaiva mobile launch checklist

**Date created:** 2026-05-16
**Targets:** iOS App Store, Google Play Store
**Supabase project:** `exbjodmnpdiayfzrdyux` (`ca-central-1`)
**Mobile repo:** `github.com/savyo777/mobile-seatly-v2`
**Web repo (sister):** `github.com/StevenGeorgy/Seatly`

Comprehensive pre-submission checklist. Items marked ✅ are already in the repo. Items marked 🟡 need user action (out of code's reach). Items marked 🔴 are open ship-blockers that need to land before EAS production build.

Companion docs: `STRIPE_SETUP.md` (Stripe go-live), `HAB_system_efficentsy.md` (reservation hold architecture), `PROMO_CLICKS_INTEGRATION.md` (cross-app click counter).

---

## 1. Ship-blockers (must be done before first production EAS build)

These are the items the audit found that I can fix in code. Each maps to one of the upcoming commits.

| Item | Status | File(s) |
|---|---|---|
| iOS `buildNumber` set | ✅ done | `app.json` |
| Android `versionCode` set | ✅ done | `app.json` |
| `NSPhotoLibraryUsageDescription` + `NSPhotoLibraryAddUsageDescription` | ✅ done | `app.json` |
| `runtimeVersion` policy | ✅ done | `app.json` |
| EAS `production` build profile with APNs `production` entitlement | ✅ done | `eas.json` |
| Remove `"Nova Ristorante"` leak from onboarding | ✅ done | `app/onboarding.tsx:61` |
| Remove `"Nova Ristorante"` hardcoded subtitle in owner Analytics screen | ✅ done | `app/(staff)/analytics.tsx:413` |
| Remove `"Nova Ristorante · Roster"` hardcoded subtitle in owner Staff screen | ✅ done | `app/(staff)/staff.tsx:392` |
| Remove Unsplash hardcoded URL on restaurant cover fallback; render plain dark `View` when no cover | ✅ done | `lib/supabase/mapRestaurantRow.ts` + ~12 consumer screens |
| Remove Unsplash hardcoded URL on promo cover fallback; render plain dark `View` when no cover | ✅ done | `app/(staff)/promotions/index.tsx` |
| Remove `console.log('Reset redirect URL:', redirectTo)` | ✅ done | `app/(auth)/forgot-password.tsx:93` |
| Gate 7 production `console.warn` calls behind `__DEV__` | ✅ done | various |
| Gate `CenaivaAssistantBoundary` `console.error` behind `__DEV__` + wire to crash logger | ✅ done | `components/cenaiva/CenaivaAssistantBoundary.tsx:20` |
| In-house crash logger (Supabase `crash_logs` table + RPC) | ✅ done | `lib/errors/crashLogger.ts`, `installCrashGuards.ts`, `AppErrorBoundary.tsx` |
| Apply migration `20260516010000_add_crash_logs.sql` to live DB | ✅ done | Supabase SQL editor (applied 2026-05-16) |

## 2. App Store submission paperwork (iOS)

### 2.1 Apple Developer + App Store Connect

- 🟡 Apple Developer Program account active ($99/year). Account holder name + entity match the brand.
- 🟡 App Store Connect app created with bundle id `com.cenaiva.app` (matches `app.json`).
- 🟡 Pricing tier selected (Free is fine for v1; in-app purchases of physical goods/services use Stripe per Apple's rule that physical/real-world goods don't require IAP).
- 🟡 Tax + banking info on Apple's "Agreements, Tax, and Banking" page.

### 2.2 Build & version

- ✅ `version: 1.0.0` in `app.json`.
- ✅ `ios.buildNumber: "1"` set in `app.json`. **Bump before every TestFlight upload.**
- 🟡 Provisioning profile + Apple Distribution certificate handled by EAS (`eas credentials`).

### 2.3 App privacy / data safety

Apple's **App Privacy** form on App Store Connect needs to match what the app actually does:

- **Data collected**: email, phone, name, location (when in use), payment info (via Stripe — not stored on device), photos (uploaded for reviews + receipts), audio (Hey Cenaiva voice).
- **Linked to user**: yes for email/phone/name/payment/photos.
- **Used for tracking**: NO (this matches the absent `NSUserTrackingUsageDescription`).
- **Third-party data sharing**: Supabase (hosted backend), Stripe (payments), Deepgram (speech-to-text), ElevenLabs (text-to-speech), OpenAI (Hey Cenaiva intent parsing). Each should appear under "Data linked to you → shared with third parties" with the right purpose.

### 2.4 ATT (App Tracking Transparency)

- ✅ Not required. The audit confirmed no third-party tracking SDKs (no Mixpanel, Amplitude, Firebase Analytics, Segment, Adjust). `NSUserTrackingUsageDescription` is correctly absent.

### 2.5 Sign in with Apple

- ✅ Wired up. Apple requires SiwA when Google sign-in is offered; both are present in `lib/services/oauth.ts`.

### 2.6 Account deletion (Apple rule)

- ✅ Visible from `app/(customer)/profile/settings.tsx` (customer) and `app/(staff)/settings.tsx` (owner). Type-email-to-confirm flow; no buried support email. Apple's "Account Deletion" requirement is satisfied.

### 2.7 Age rating

- 🟡 17+ likely if you can book at venues that serve alcohol; otherwise 12+. Pick during App Store Connect submission. Drives the displayed age rating badge.

### 2.8 Screenshots & metadata

Apple requires at least:
- 🟡 6.7" iPhone (iPhone 14 Pro Max): 1290 × 2796 px — at least 3 screenshots.
- 🟡 6.5" iPhone (iPhone 14 Plus / 13 Pro Max): 1242 × 2688 px — at least 3 screenshots.
- 🟡 iPad Pro 12.9": 2048 × 2732 px — required only if you support iPad (audit didn't see iPad-specific code; phone-only is the simplest path for v1).
- 🟡 App preview video (optional but improves conversion).
- 🟡 Subtitle (30 chars), promotional text (170 chars), description (4000 chars), keywords (100 chars total, comma-separated).
- 🟡 Support URL + marketing URL (`cenaiva.com` likely).
- 🟡 Privacy Policy URL → `https://cenaiva.com/privacy` (already in env as `EXPO_PUBLIC_PRIVACY_URL`).
- 🟡 Promotional graphic (1024 × 1024) — Apple no longer requires this; nice-to-have.

### 2.9 TestFlight

- 🟡 Internal testing group (up to 100 testers) — for the team.
- 🟡 External testing group (up to 10,000) — once internal is clean.

---

## 3. Play Store submission paperwork (Android)

### 3.1 Play Console + signing

- 🟡 Google Play Developer account ($25 one-time).
- 🟡 Play Console app created with package name `com.cenaiva.app`.
- 🟡 **App Bundle (`.aab`)** is required, not APK. EAS production profile (Commit 2) sets this.
- 🟡 Play App Signing enabled — Google manages your release signing key.

### 3.2 Data safety form

Mirrors Apple's App Privacy but with more granular fields:
- 🟡 What data the app collects (matches §2.3 above).
- 🟡 Whether collection is required or optional.
- 🟡 Whether data is encrypted in transit (yes — HTTPS to Supabase).
- 🟡 Whether users can request data deletion (yes — the in-app account-delete flow does this).

### 3.3 Target API level

- 🟡 Play Store requires apps to target the API level released within the last ~12 months. Expo SDK 55 targets Android API 35 (Android 15). As of mid-2026 this is the active requirement. Verify before submission.

### 3.4 Content rating

- 🟡 Fill out the IARC questionnaire in Play Console. Mostly "No" for violent/sexual/gambling content. The app may need a "Reference to Alcohol" tag if restaurants serve alcohol.

### 3.5 Permission disclosure

Play requires plain-English copy for any "dangerous" permission. The app uses:
- Camera (CAMERA)
- Microphone (RECORD_AUDIO)
- Location (ACCESS_FINE_LOCATION, ACCESS_COARSE_LOCATION)
- Photo media (READ_MEDIA_IMAGES, READ_MEDIA_VISUAL_USER_SELECTED)

🟡 Add a short explainer in the Play listing or in-app permission prompt for each.

### 3.6 Screenshots & graphics (Play)

- 🟡 Feature graphic 1024 × 500 px (required).
- 🟡 App icon 512 × 512 px (required).
- 🟡 At least 2 phone screenshots; 1080 × 1920 to 7680 × 7680, any aspect 16:9 or 9:16.
- 🟡 Short description (80 chars), full description (4000 chars).

### 3.7 Internal testing track

- 🟡 First upload goes to "Internal testing" track for the team. Promote to "Closed testing" → "Open testing" → "Production" once each stage is clean.

---

## 4. Stripe go-live

The full setup is documented in `STRIPE_SETUP.md`. Pre-launch action items:

- 🟡 Switch `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` from `pk_test_*` to `pk_live_*` in production EAS env.
- 🟡 Update `STRIPE_SECRET_KEY` Supabase edge function secret from `sk_test_*` to `sk_live_*`.
- 🟡 Verify the production webhook endpoint (`https://exbjodmnpdiayfzrdyux.supabase.co/functions/v1/stripe-webhook`) is set up in live mode (it's currently in test mode per STRIPE_SETUP.md §1.5).
- 🟡 Confirm `confirm-deposit-stub` endpoint is **not** reachable in production. The mobile app's `confirmDepositStub` in `lib/booking/publicBookingApi.ts` is the legacy path that's superseded by `confirm-hold-paid` when `EXPO_PUBLIC_CENAIVA_HOLDS_ENABLED=true`. Set the env var, verify stubbed deposit charges never happen.
- 🟡 Apple Pay merchant id `merchant.com.cenaiva` enabled in `StripeProvider`. Verify the same id is registered with Apple Developer Portal under Identifiers → Merchant IDs.
- 🟡 Google Pay merchant verification done via Stripe dashboard.
- 🟡 Test the real card path with a real (not test) card in TestFlight before App Store submission.

---

## 5. Open backend items (web repo owns these)

These are tracked here so the web team has visibility, but the mobile repo can't fix them:

- 🟡 **`delete-account` edge function**: the audit found that the function hard-deletes the auth row + cascade tables but does NOT detach Stripe payment methods or delete the Stripe customer. Per `MOBILE_STRIPE_GUIDE.md` §7, that's expected behaviour. Web team to extend the function with `stripe.paymentMethods.detach(pm_id)` for every `saved_cards.stripe_payment_method_id` and `stripe.customers.del(cust_id)` before deleting the row.
- 🟡 **Server-side push sender**: mobile registers `expo_push_token` on `user_profiles` (via `lib/notifications/pushToken.ts`) but no backend cron / trigger sends pushes. Web team to add the sender (likely a Supabase edge function consuming the registered tokens for booking reminders, hold-expiry warnings, etc).
- 🟡 **Realtime subscriptions** for live updates (owner reservations table refreshing in real time when a diner books). Currently poll-based. v1.1 feature.
- 🟡 **`body` vs `review_text` column drift**: mobile reads via `lib/reviews/getRestaurantOwnerReviews.ts` which probes both column names. Writes still target `body`. Web team to confirm the canonical column name and align both apps. The drift is currently invisible to users (the probe always finds the right column) but bookings/edge functions should write to one name.
- 🟡 **`confirm-deposit-paid` vs `confirm-deposit-stub`**: confirm the prod deposit conversion always runs the real PI verification, not the stub.

---

## 6. EAS / build infrastructure

- 🟡 Run `eas login` with the team's Apple ID + Google Play credentials.
- 🟡 Run `eas credentials` once to set up signing for both platforms. EAS will manage the iOS distribution cert + provisioning profile and the Android keystore.
- ✅ `preview` + `production` build profiles in `eas.json`.
- 🟡 First production build: `eas build --platform ios --profile production` + `eas build --platform android --profile production`. Wait for build, download the `.ipa` / `.aab`, upload to App Store Connect / Play Console.
- 🟡 Bump `ios.buildNumber` and `android.versionCode` in `app.json` for every subsequent submission (Apple + Google reject duplicates).
- 🟡 OTA updates via `expo-updates` if you want hotfixes without store re-submission. Configure `eas update` when ready; not required for v1.

---

## 7. Legal copy TODOs

The in-app legal pages currently show placeholder copy with `// TODO: replace with finalized legal copy` markers. Apple + Google review the HOSTED version at `cenaiva.com/{terms,privacy,licenses}` (already wired via `EXPO_PUBLIC_*_URL` env vars), so submission is not blocked by the in-app placeholders. But the in-app pages are visible to users and should match the hosted versions before launch.

Open TODOs:
- 🟡 `app/(customer)/profile/legal/terms.tsx:4`
- 🟡 `app/(customer)/profile/legal/privacy-policy.tsx:5`
- 🟡 `app/(customer)/profile/legal/licenses.tsx:5`

Action: paste finalized lawyer-approved strings into the three files. Or, simpler, replace each page with an in-app webview pointing at the hosted URL.

---

## 8. Beta testing checklist (run before submission)

Smoke-test matrix on real devices (one iOS + one Android minimum):

### Auth
- 🟡 Email/password sign-up + sign-in + wrong-password lockout
- 🟡 Phone OTP sign-up + sign-in
- 🟡 Google OAuth (both sides — customer + owner)
- 🟡 Apple OAuth (both sides)
- 🟡 Forgot password flow → reset email arrives → in-app deep link works
- 🟡 Verify-phone-OTP flow

### Customer booking
- 🟡 Browse restaurant → pick date/time/table → enter details → submit (free booking)
- 🟡 Same flow with preorder cart → step6-payment → Stripe PaymentSheet → confirm
- 🟡 Same with deposit-only booking
- 🟡 Hold timer banner shows and updates correctly across screens
- 🟡 Hold expires → recovery dialog → "Grab it again" works
- 🟡 Cancel reservation → refund shows in toast → email confirmation arrives

### Owner side
- 🟡 Sign in as restaurant owner → switch restaurants if multi-tenant
- 🟡 Profile shows real rating + review count (post the partner's review fix)
- 🟡 Tap rating pill → All Reviews screen lists every review with photos
- 🟡 Edit Profile → hours load correctly (post the hours_json fix)
- 🟡 Promos tab shows real Used + Clicks numbers, no mock data
- 🟡 Reservations list shows correct booking times, no "11:0 / 0" wrap

### Receipts + expenses
- 🟡 Scan a real USD receipt → conversion to CAD works (post FX provider fix)
- 🟡 Scan a CAD receipt → no conversion attempted
- 🟡 Expenses summary card shows restaurant currency, not "dominant expense currency"

### Hey Cenaiva (voice)
- 🟡 Mic permission prompt → grant
- 🟡 "Book a table" → orchestrator returns a reasonable response
- 🟡 ElevenLabs TTS plays back

### Account deletion
- 🟡 Customer: type email → delete → all upcoming bookings cancelled + refunded → signed out → routed to login
- 🟡 Owner: must remove restaurants first → blocker shown → after removal, delete works

### Error handling
- 🟡 Sign in with wrong password → friendly "Wrong email or password." (no Supabase code)
- 🟡 Decline card `4000 0000 0000 0002` → "Your card was declined. Try a different card."
- 🟡 Dismiss PaymentSheet → no error alert (silent)

---

## 9. After submission

- 🟡 Monitor `crash_logs` table for new errors:
  ```sql
  select platform, app_version, route, message, count(*)
  from public.crash_logs
  where occurred_at > now() - interval '24 hours'
  group by 1, 2, 3, 4
  order by count desc
  limit 20;
  ```
- 🟡 Watch the Apple "Resolution Center" + Play Console "Inbox" for reviewer questions.
- 🟡 If rejected, the rejection reason is usually one of: missing privacy URL, missing account deletion, ATT mismatch, IAP for digital goods (n/a — we sell real meals). Address and resubmit.

---

## 10. Out of scope for v1 launch

These are explicit "do later" items so we don't get distracted:

- Real-time floor plan updates (Supabase Realtime subscriptions).
- Sentry / paid crash reporting (we have the in-house logger).
- iOS Universal Links / Android App Links (`https://cenaiva.com/...` → app). The custom `cenaiva://` scheme covers current flows.
- iPad-specific UI (phone-only is fine for v1).
- App Store / Play featured-app submissions.
- Multi-payer split-deposit invites flow (`/deposit/:id`).
- Post-meal pay-the-bill flow (Phase 9 of `MOBILE_STRIPE_GUIDE.md`).
- Localizations beyond English + French.

---

**Document maintained alongside the mobile repo. If it drifts from code, code wins — re-run the three audit explores from `/Users/stevengeorgy/.claude/plans/prancy-spinning-codd.md`.**
