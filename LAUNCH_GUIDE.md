# Cenaiva — App Store + Play Store Launch Guide

Last updated 2026-05-21. This is the full path from "dev build runs on my sim" to "app is publicly downloadable on the App Store + Google Play."

**Realistic timeline**: 5-10 business days end-to-end. The wall-clock blockers are Apple App Review (~24-72 hours) and the first Google Play review (~7 days for a fresh app, then ~3 hours for updates).

**Cost**: Apple Developer Program $99/year + Google Play Developer Account $25 one-time. EAS Production builds are free up to 30/month on Expo's free plan; pay-as-you-go past that.

---

## 0. Pre-flight checklist (do these once, before submitting)

### Accounts you need
- [ ] **Apple Developer Program** account ($99/year) — https://developer.apple.com/programs/enroll/
  - Personal account is fine; Organization unlocks team-managed signing certs but requires D-U-N-S number (free, takes 1-3 days)
- [ ] **App Store Connect** access at https://appstoreconnect.apple.com (automatic once Developer Program approved)
- [ ] **Google Play Console** account ($25 one-time) — https://play.google.com/console/signup
  - Personal account works; "Organization" account requires a D-U-N-S number too
- [ ] **Expo account** for EAS Build — https://expo.dev (free tier covers launch traffic)

### Cenaiva-specific pre-flight
- [ ] Bundle identifier confirmed: `com.cenaiva.app` (iOS + Android matched — see CLAUDE_SKILLS.md §1)
- [ ] Stripe key in production mode (`pk_live_…`, not `pk_test_…`) — `grep EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY .env`
- [ ] `DEPOSIT_STRIPE_STUB_MODE=false` set in Supabase production secrets (NEVER leave it true with a live Stripe key — see CLAUDE_SKILLS.md §21)
- [ ] Legal acceptance gate working (consent screen blocks unaccepted users — see CLAUDE_SKILLS.md §13)
- [ ] k6 load test passes at 1500 VUs (verified 2026-05-21, see commit `9621691`)
- [ ] No literal API secrets in tracked files (audited 2026-05-21)
- [ ] All Supabase edge functions deployed at latest versions
- [ ] `app.json` version bumped (more on this in §3)

---

## 1. Required assets (gather these before you start the submission)

### App icon
- [ ] **1024×1024 PNG, no transparency, no rounded corners** (Apple + Google both round automatically)
- Lives at `assets/icon.png` — confirm the file is exactly 1024×1024
- `app.json` already references it via `"icon": "./assets/icon.png"`

### App Store screenshots (iOS)
Apple requires screenshots for at least the **6.9" display** (iPhone 16 Pro Max). One device size covers all newer iPhones.

| Device | Display | Required pixel size | Required for launch? |
|---|---|---|---|
| iPhone 16 Pro Max | 6.9" | **1320 × 2868** (portrait) | **YES** |
| iPhone 14 Pro Max | 6.7" | 1290 × 2796 | Optional — Apple will reuse 6.9" |
| iPhone 8 Plus | 5.5" | 1242 × 2208 | Optional, legacy |
| iPad Pro 13" (M4) | 13" | 2064 × 2752 | Only if you want iPad listing |

- **Count**: 3-10 screenshots per device size. Sweet spot is 6-8.
- **Format**: PNG or JPEG, no alpha channel.
- **The simulator currently booted is iPhone 16e (6.1") — Apple won't accept those.** You'll need to:
  1. In Xcode: Window → Devices and Simulators → click "+" → add "iPhone 16 Pro Max"
  2. Run the dev build on that sim (`xcrun simctl boot <new-udid>` then EAS dev build)
  3. Recapture the screens
- **Quick option**: capture on iPhone 16e for marketing reference (we did this — see `launch-assets/ios/`), then retake the final ones on iPhone 16 Pro Max sim before submission.

### Play Store screenshots (Android)
Google is much more lenient.

| Device | Required pixel size | Required for launch? |
|---|---|---|
| Phone | **1080 × 1920 or larger** (16:9 or taller) | **YES** (2-8 screenshots) |
| 7" tablet | 1080 × 1920 | Optional |
| 10" tablet | 1080 × 1920 | Optional |

- The Pixel 7 AVD outputs 1080×2400 natively — perfect.
- **Count**: 2-8.

### Other Play Store visuals
- [ ] **Feature graphic**: 1024 × 500 PNG/JPG (banner shown at top of Play Store listing)
- [ ] **App icon**: 512 × 512 PNG (high-res version of your existing icon)

### Other App Store visuals
- [ ] **App preview videos** (optional but recommended): 15-30 sec, same dimensions as screenshots, .mov/.m4v/.mp4. Can defer to v1.1.

---

## 2. Marketing copy (write these BEFORE you start the submission flow — both stores time out if you idle)

### App name
- iOS: **30 characters max**
- Android: **30 characters max** (was 50 — Google tightened in 2024)
- Suggested: `Cenaiva — Restaurant Reservations` or `Cenaiva — Eat Smarter`

### Subtitle (iOS only — Apple ranks search on this)
- **30 characters max**
- Suggested: `AI-powered dining` or `Reserve, dine, discover`

### Short description (Android only)
- **80 characters max**
- Suggested: `Book tables, split deposits, and discover restaurants with AI you talk to.`

### Full description
- iOS: **4000 characters max** | Android: **4000 characters max**
- Lead with the pain point (no-shows, fee opacity, slow concierges), then the features.
- Below is a starter draft. Edit before pasting.

```
Cenaiva is the modern way to discover restaurants and book reservations
on your terms.

DISCOVER TONIGHT'S BEST TABLES
Get personalized "best match for you" picks, browse by cuisine,
neighborhood, vibe, or price. Trending tonight + 7-day forecasts let
you grab the best slot before it sells.

RESERVE WITH ZERO FRICTION
Pick your party size, your time, and confirm in under 30 seconds.
Optional deposits secure your spot at sought-after restaurants —
fully refundable when the restaurant marks you seated. Split the
deposit with friends right inside the app: each guest pays their
own share via Apple Pay, Google Pay, or saved card.

TALK TO HEY CENAIVA
Ask in plain English: "Find me a steakhouse near downtown for two
tomorrow at 7." Cenaiva's on-device voice assistant turns it into a
booking — no typing, no scrolling.

PRE-ORDER + CALENDAR
Browse the menu, pre-order while you book (so your starters land
the moment you sit), and add the reservation to your calendar
with one tap.

EVENTS + PROMOTIONS
Discover dinner-theater nights, chef tastings, holiday menus, and
seasonal promotions running at restaurants near you.

PRIVACY-FIRST
Your data stays yours. Pseudonymous browsing until you book.
Delete your account from inside the app at any time.

ABOUT CENAIVA
Cenaiva is a Canadian-built dining platform that connects diners
with restaurant operators. Restaurants use Cenaiva for KDS, guest
profiles, pre-orders, and revenue analytics — diners get the
benefit of a partner that the restaurant actually trusts.

Questions? help@cenaiva.com
Terms: https://cenaiva.com/legal/terms
Privacy: https://cenaiva.com/legal/privacy
```

### Keywords (iOS only)
- **100 characters max, comma-separated, NO SPACES after commas**
- Suggested: `reservation,booking,restaurant,dining,table,opentable,resy,ai,voice assistant,toronto,canada`

### Categories
- iOS Primary: **Food & Drink** | Secondary: **Travel**
- Android Primary: **Food & Drink** | Secondary: **Lifestyle**

### Content rating
- iOS: **4+** (no objectionable content; the AI assistant has no chat-with-strangers feature)
- Android: complete the rating questionnaire in Play Console — answer truthfully; you'll get rated **PEGI 3 / ESRB Everyone** based on your answers

### Age requirement (CRITICAL — matches our Terms §1)
- Cenaiva requires **16+** to use (per terms confirmed 2026-05-21)
- App Store: set "Age Rating" → answer Yes to "Restricts user to age 17+" — actually 17+ is closest preset; Apple's options are 4, 9, 12, 17. Pick 17+ since 16 isn't an option.
- Play Store: set target age to **18+** in the questionnaire (Google's brackets are 13, 18) since we require 16+

### Privacy policy URL (REQUIRED both stores)
- iOS + Android: paste `https://cenaiva.com/legal/privacy`
- Make sure that URL actually serves the current Privacy Policy v1.1 (already in the mobile app at `lib/legal/privacyContent.ts`; web team should mirror)

### Support URL (required by Apple)
- `https://cenaiva.com/support` or `mailto:help@cenaiva.com` (Apple accepts either)

### Marketing URL (optional but improves listing)
- `https://cenaiva.com`

### EULA (optional)
- Apple's default EULA is fine for most apps. If you want to substitute your own, link to `https://cenaiva.com/legal/terms`.

---

## 3. Build the production binary

### One-time setup
```bash
cd /Users/stevengeorgy/mobile-seatly-v2-5
npm install -g eas-cli
eas login  # use your Expo account
eas init   # if not already initialized; creates a project on Expo
```

### Check `app.json` version + buildNumber
Open `app.json` and confirm:
```json
{
  "expo": {
    "version": "1.0.0",        // user-visible version
    "ios": {
      "bundleIdentifier": "com.cenaiva.app",
      "buildNumber": "1"       // Apple-internal; must increment each upload
    },
    "android": {
      "package": "com.cenaiva.app",
      "versionCode": 1         // Google-internal; must increment each upload
    }
  }
}
```
For a brand-new launch, leave `1.0.0` / `1` / `1`. For every subsequent build (even a quick rebuild for a small fix), bump `buildNumber` and `versionCode` by 1.

### Build iOS for the App Store
```bash
eas build --platform ios --profile production
```
- Takes ~20-40 minutes. Cloud build, you don't need to babysit.
- First run: EAS will prompt for Apple credentials. Choose "Let EAS handle credentials" — it'll create the distribution cert + provisioning profile for you and store them in your Apple Developer account.
- When done, EAS gives you a `.ipa` file URL + an option to "submit to the App Store".

### Build Android for Play Store
```bash
eas build --platform android --profile production
```
- Same ~20-40 min. Produces an `.aab` (Android App Bundle).
- First run: EAS creates an upload keystore. **Back this up** — losing it means you can never push updates to your app.

### Or build both at once
```bash
eas build --platform all --profile production
```

---

## 4. Submit to the App Store (iOS)

### Step 1 — Create the app listing in App Store Connect
1. Go to https://appstoreconnect.apple.com → My Apps → + → New App
2. Platform: iOS
3. Name: `Cenaiva` (or whatever you chose in §2)
4. Primary language: English (Canada) or English (U.S.)
5. Bundle ID: select `com.cenaiva.app` (it should appear after EAS creates it; if not, register it manually at https://developer.apple.com/account/resources/identifiers/list)
6. SKU: anything internal; `cenaiva-ios-001` works
7. User Access: Full Access (defaults)
8. Click Create

### Step 2 — Fill out the app's metadata pages
In App Store Connect, your new app has a sidebar with sections to complete:

| Section | What to put |
|---|---|
| **App Information** | Bundle ID confirms; pick categories (Food & Drink / Travel); copyright `© 2026 Cenaiva Inc.`; Age Rating questionnaire |
| **Pricing and Availability** | Free; available in all territories (or just Canada/US to start) |
| **App Privacy** | Click "Get Started", complete the data-collection questionnaire. Cenaiva collects: Name (linked to identity), Email (linked), Phone (linked), Photos (snaps; linked, not tracked), Crash data (not linked), Diagnostics (not linked). NOT used for tracking. The Privacy Policy URL is `https://cenaiva.com/legal/privacy` |
| **iOS App** → version 1.0 | **This is the build page.** Upload screenshots here, paste the description, paste the keywords, etc. |
| **Version Release** | Choose "Manually release this version" so you control launch timing |

### Step 3 — Upload screenshots + copy
On the **iOS App** version 1.0 page:
- Drag your 6-8 screenshots from `launch-assets/ios/` into the "6.9" Display" slot (Apple's UI calls it iPhone 6.9" Display)
- Paste the App Name, Subtitle, Description, Keywords, Promotional Text (170 chars, optional and editable without re-review)
- Support URL, Marketing URL
- App Review Information: contact name, phone, email (so Apple can reach you if review fails)
- **Demo account credentials**: critical — Apple's reviewers WILL try to log in. Either give them a real test account (recommended: create `appreview@cenaiva.com` with a real diner profile) or check "Sign-in not required" if your app's main flow works without login. Cenaiva REQUIRES login to book, so provide credentials.

### Step 4 — Submit the build
1. Wait for your EAS build to appear under **Build** on the version page (5-15 min after EAS finishes; Apple's processing takes time)
2. Click the "+" next to Build → select your latest TestFlight build
3. Click "Add for Review" at the top right
4. Answer the export compliance question: Cenaiva uses HTTPS only → "No" to "Does your app use encryption beyond standard HTTPS" (HTTPS is exempt under US export rules)
5. Click **Submit for Review**

### Step 5 — App Review timeline
- Average: 24-48 hours for first submission
- Common rejection reasons (preempt these):
  - **Missing demo account**: gave Apple no way to log in. Fix: §3 step 4.
  - **Privacy nutrition labels don't match Privacy Policy**: re-read the privacy questionnaire and the live policy at https://cenaiva.com/legal/privacy
  - **Restored purchases not implemented** (for in-app purchases): N/A for Cenaiva (we use Stripe, not IAP, and Apple allows this for "physical goods" — restaurant bookings + deposits qualify)
  - **Sign in with Apple required** if you offer Google sign-in: Cenaiva already has Apple Sign-In wired (per CLAUDE_SKILLS.md §18) — verify it works in the production build
- If approved with "Pending Developer Release": go to App Store Connect, click "Release this Version" when you're ready

---

## 5. Submit to Google Play

### Step 1 — Create the app listing
1. Go to https://play.google.com/console → Create app
2. App name: Cenaiva
3. Default language: English (United States) or English (Canada)
4. App or game: App
5. Free or paid: Free
6. Accept declarations
7. Create app

### Step 2 — Set up store listing (left sidebar → "Main store listing")
| Field | What to put |
|---|---|
| App name | Cenaiva (matches what you set on Apple) |
| Short description | (from §2) |
| Full description | (from §2) |
| App icon | 512 × 512 PNG |
| Feature graphic | 1024 × 500 PNG |
| Phone screenshots | 2-8 from `launch-assets/android/` |
| App category | Food & Drink |
| Tags | Pick 5 — e.g. Restaurant, Reservations, Food, Dining, AI |
| Contact details | Email: help@cenaiva.com, Website: https://cenaiva.com, Phone (optional) |
| Privacy policy | `https://cenaiva.com/legal/privacy` |

### Step 3 — App content questionnaires (left sidebar → "App content")
Complete all sections — Google blocks publishing until 100% green:
- **Privacy policy** — paste URL
- **App access** — does Google reviewers need login? Yes → provide credentials (same `appreview@cenaiva.com` account as Apple)
- **Ads** — does the app contain ads? No
- **Content rating** — fill questionnaire honestly; Cenaiva will rate ESRB Everyone / PEGI 3
- **Target audience** — choose 18+ (matches our 16+ minimum-age requirement)
- **News app** — No
- **COVID-19 contact tracing** — No
- **Data safety** — Long form. Most relevant answers:
  - Data collected: Name, Email, Phone, App activity (bookings), Photos (snaps), Crash logs, Diagnostics
  - Data shared with third parties: Stripe (payment processing), Supabase (backend hosting), OpenAI/ElevenLabs/Deepgram (voice features only)
  - Data is encrypted in transit + at rest: YES
  - Users can request data deletion: YES (in-app: Profile → Privacy → Delete Account)
- **Government apps** — No
- **Financial features** — Yes, deposit collection via Stripe → answer the follow-ups
- **Health** — No
- **Families policy** — Not directed at children → marks the app as "general audiences"

### Step 4 — Pricing & distribution
- Countries: pick at least Canada + USA for launch
- Free
- Contains ads: No
- Available on Android Auto / Wear OS / TV: No
- Distribute via Play Store: Yes

### Step 5 — Upload the AAB + start the production rollout
1. Left sidebar → **Production** → Create new release
2. Drop your `.aab` from the EAS Build artifacts into the upload zone
3. Release name: `1.0.0 (1)`
4. Release notes: short — `First public release of Cenaiva.`
5. Click "Save" → "Review release" → "Start rollout to Production"

### Step 6 — Review timeline
- **First-app review**: 3-7 days (Google is slower than Apple for first submissions)
- Subsequent updates: 2-4 hours typically
- Rejection reasons to preempt:
  - **Privacy policy URL returns 404**: confirm `https://cenaiva.com/legal/privacy` is live BEFORE submitting
  - **Data safety questionnaire contradicts the privacy policy**: re-read both side-by-side
  - **Missing account-deletion in-app**: we have it (Profile → Privacy → Delete Account) — flag this in the review notes
  - **Permissions used without justification**: Cenaiva uses RECORD_AUDIO (Hey Cenaiva), CAMERA (snaps), LOCATION (nearby restaurants), CALENDAR (add booking). Each needs a one-sentence justification in the manifest's usage descriptions

---

## 6. After submission — what happens

### Apple TestFlight (free internal testing)
- TestFlight build is available as soon as Apple "processes" the EAS upload (~10-30 min)
- Add up to 10,000 external testers via email
- Use this to run a beta with friendly users BEFORE going to App Review

### Play Store internal testing track
- In Play Console → Testing → Internal testing → create release → drop your AAB
- Add testers by email; Google gives you a join URL
- Same purpose as TestFlight; instant availability

### Production rollout — staged rollout (Android)
- On first publish, Play Console asks: "What % of users should get this?" — start at 10%, watch for crash reports for 24 hours, bump to 50%, then 100%
- Apple has no staged-rollout for the FIRST app release; you can phase v1.1+ via "Phased Release"

### Monitor crash + analytics
- Sentry is already wired (see `app.json`'s sentry plugin)
- Confirm `SENTRY_AUTH_TOKEN` was set as an EAS Secret BEFORE the production build, otherwise source maps won't upload
- Verify via Sentry dashboard at https://sentry.io within 24 hours of release

---

## 7. The screenshot starter set

We captured a starter set of iPhone 16e screenshots to `launch-assets/ios/`:
- `01-discover.png` — Discover screen with "tonight's picks" + restaurant cards
- `02-discover-map.png` — Map view showing restaurant pins
- `03-profile.png` — User profile with dining preferences
- (more captured during the screenshot session — see directory)
- `08-staff-dashboard.png` — Staff Home with Quick Actions + Week Momentum

**IMPORTANT**: iPhone 16e is 6.1" and NOT an accepted App Store screenshot size. Use these as marketing/layout reference, then retake the FINAL versions on iPhone 16 Pro Max sim (6.9") before submitting.

Quick recipe for retaking on the right sim:
```bash
# Boot the right sim
xcrun simctl boot "iPhone 16 Pro Max"  # add via Xcode > Devices first if not listed
# Rebuild the EAS dev client for that sim (or run production preview)
eas build --platform ios --profile preview --local
# Install onto sim
xcrun simctl install booted /path/to/Cenaiva.app
# Take same screenshots from same screens
xcrun simctl io booted screenshot launch-assets/ios/01-discover.png
# ... etc
```

For Android, the Pixel 7 AVD outputs at the right size out of the box:
```bash
# With Pixel 7 emulator running:
adb -s emulator-5554 exec-out screencap -p > launch-assets/android/01-discover.png
```

---

## 8. Common gotchas

### "Build failed: missing credentials"
- Run `eas credentials` to inspect/regenerate Apple or Google signing assets
- For iOS: delete the EAS-managed cert + re-create — EAS will re-issue

### "App Review rejected: app crashes on launch"
- Almost always means the production build is hitting a missing env var
- Pre-check: build a production preview locally (`eas build --profile preview --local`), install on a clean sim, run end-to-end. Don't ship until that walks through booking + login + voice + payment without crashing

### "TestFlight build doesn't appear in App Store Connect"
- Apple's "Processing" step can take an hour. If still missing after 2 hours, EAS upload likely failed — check `eas build --status`

### "Stripe live key not working in production build"
- EAS Secrets are SEPARATE from your local `.env`. You MUST run:
  ```bash
  eas secret:create --scope project --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value pk_live_...
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value https://...
  eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value eyJ...
  # ... plus every other EXPO_PUBLIC_ env var your app reads
  ```
- Verify with `eas secret:list`

### "Privacy policy URL 404s"
- The web sister repo must have https://cenaiva.com/legal/privacy live BEFORE you submit. Coordinate with the web team.

### "Apple wants Sign in with Apple alongside Google Sign-In"
- Per App Store Guidelines §4.8, if you offer ANY third-party sign-in (Google, Facebook), you must also offer Sign in with Apple on iOS
- Cenaiva already has it — confirm via Maestro: `auth/oauth-buttons-render.yaml` should show "Continue with Apple" on iOS

### "Account deletion not in-app"
- Both stores REQUIRE the user to be able to delete their account from inside the app (not just contact-us)
- Cenaiva has it: Profile → Privacy → Delete Account (added 2026-05-21 with the legal docs integration)
- Mention this path explicitly in the App Review demo notes so reviewers can find it

### "Permission denied for RECORD_AUDIO / CAMERA / LOCATION"
- Each requires a usage description in `app.json` under `ios.infoPlist`:
  - `NSMicrophoneUsageDescription`: "Cenaiva uses your microphone for the Hey Cenaiva voice assistant."
  - `NSCameraUsageDescription`: "Cenaiva uses your camera to capture snaps of your meals."
  - `NSLocationWhenInUseUsageDescription`: "Cenaiva uses your location to show nearby restaurants."
  - `NSCalendarsUsageDescription`: "Cenaiva adds your confirmed bookings to your calendar."
- Verify each is non-empty + describes the actual usage in plain English BEFORE building

---

## 9. Post-launch (the first 24-72 hours)

1. **Watch Sentry for crash spikes** — set up Slack/email alerts for any new high-frequency issue
2. **Watch Supabase logs** for 5xx spikes on edge functions — `mcp__supabase__get_logs({service: 'edge-function'})`
3. **Watch your App Store Connect "App Analytics"** for install funnel: how many start the app vs complete sign-up vs complete first booking?
4. **Reply to every App Store / Play Store review** in the first 72 hours — Apple + Google ranking favors apps with active developer responses
5. **Have a hotfix branch ready**: if a critical bug surfaces, `eas build --profile production --auto-submit` lets you push a fix without going through the full Console upload dance

---

## 10. Checklist summary

Before clicking Submit on EITHER store, walk through this list:

- [ ] Bundle id is `com.cenaiva.app` everywhere
- [ ] Production Stripe key set in EAS Secrets (`pk_live_…`)
- [ ] Production Supabase env vars set in EAS Secrets
- [ ] `DEPOSIT_STRIPE_STUB_MODE=false` in Supabase production secrets
- [ ] All Supabase edge functions deployed at latest version
- [ ] k6 load test passed at target concurrency (≥1500 VUs)
- [ ] Privacy Policy live at `https://cenaiva.com/legal/privacy`
- [ ] Terms of Service live at `https://cenaiva.com/legal/terms`
- [ ] Legal consent gate working (consent screen blocks unaccepted users)
- [ ] Account deletion works in-app (Profile → Privacy → Delete Account)
- [ ] Sign in with Apple works on iOS (if you have Google Sign-In)
- [ ] Sentry source-maps uploading (SENTRY_AUTH_TOKEN set as EAS Secret)
- [ ] Demo account ready for App Review: `appreview@cenaiva.com` with a real diner profile + at least one past booking visible
- [ ] App icon 1024×1024, no transparency
- [ ] 6-8 screenshots on iPhone 16 Pro Max sim (NOT iPhone 16e)
- [ ] 2-8 screenshots on Pixel 7 AVD
- [ ] Feature graphic for Play Store (1024×500)
- [ ] App description + keywords + categories all set
- [ ] In-app version bumped (`version`, `buildNumber`, `versionCode`)
- [ ] Tested production build end-to-end on a clean device (not just dev build)

Hit Submit. Then go for a walk.

---

## 11. Reference

| What | Where |
|---|---|
| EAS Build dashboard | https://expo.dev/accounts/<your-org>/projects/mobile-cenaiva-v2 |
| App Store Connect | https://appstoreconnect.apple.com |
| Apple Developer | https://developer.apple.com/account |
| Google Play Console | https://play.google.com/console |
| Sentry dashboard | (whatever org you used) |
| Apple App Review Guidelines | https://developer.apple.com/app-store/review/guidelines/ |
| Google Play Developer Policy | https://play.google.com/about/developer-content-policy/ |
| EAS Build docs | https://docs.expo.dev/build/introduction/ |
| Cenaiva CLAUDE_SKILLS.md | local repo — single source of truth for app-specific patterns |

If anything in this guide goes stale, fix it in this file and commit. The launch process is sequential enough that one accurate doc beats five out-of-date ones.
