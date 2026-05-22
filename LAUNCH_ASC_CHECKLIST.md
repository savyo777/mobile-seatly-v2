# App Store Connect submission checklist — Cenaiva v1.0

Final hand-off checklist. Walk through this section by section. URLs + exact paste-ready values included.

ASC app id: **`6765771585`** (already wired in `eas.json`).
Apple Team ID: **`WUHMA73X3T`**.
Bundle ID: **`com.cenaiva.app`**.

---

## ⚠️ Hard stop before clicking "Add for Review"

This doc gets you to "everything green, Submit button enabled." Do NOT click **Add for Review** until you've walked the TestFlight build yourself end-to-end. The reviewer's flow:
1. Sign in as `appreview@cenaiva.com` (password `Cenaiva-Review-2026!`)
2. Pass consent gate
3. See Discover with "Good morning, appreview" greeting
4. Tap Bookings tab → see **SEAT-KWSQ** at Qoop (already seeded)
5. Try a fresh booking at any restaurant without `deposit_tiers` (Keg Mansion, Blue Blood, STK, Ruth's Chris, Harbour Sixty)
6. Tap Profile → Privacy → Delete Account (verify path exists — don't actually delete)

If any of those break, fix + rebuild + re-submit BEFORE clicking Add for Review.

---

## Phase A — Apple Developer Program (one-time prereqs)

| # | URL | What to verify |
|---|---|---|
| A1 | https://developer.apple.com/account | Enrolled, paid ($99/year), expiration date > today |
| A2 | https://developer.apple.com/account/resources/identifiers/list | `com.cenaiva.app` listed, status Active, capabilities include "Sign In with Apple" |
| A3 | https://appstoreconnect.apple.com/agreements/ | Paid Apps Agreement: **Active** (required even for free apps that take deposits via Stripe) |
| A4 | App Store Connect → Agreements → Banking | Payout method configured (Canadian or US bank account) |
| A5 | App Store Connect → Agreements → Tax | W-8BEN (non-US) or W-9 (US) form on file |

If A3 / A4 / A5 say "pending" or are empty, App Review will hold the app indefinitely. Resolve these first.

---

## Phase B — App listing (App Information section)

URL: https://appstoreconnect.apple.com/apps/6765771585/distribution/info

| Field | Value |
|---|---|
| Bundle ID | `com.cenaiva.app` (auto-populated; verify) |
| Primary Language | English (Canada) or English (U.S.) |
| Subtitle | `AI-powered dining` (30 chars max — also acceptable: `Reserve, dine, discover`) |
| Privacy Policy URL | `https://cenaiva.com/legal/privacy` |
| EULA | Leave blank — uses Apple's standard EULA. (If you'd rather use the in-app Terms, paste `https://cenaiva.com/legal/terms`.) |
| Category — Primary | **Food & Drink** |
| Category — Secondary | Travel |
| Content Rights | Check: "Does Not Use Third-Party Content" |
| Age Rating | Open the questionnaire, answer everything as "None" / "No"; Apple will rate it 4+. **Override to 17+** in the manual rating section since our Terms require 16+ and 17+ is Apple's closest preset above 12+. |

---

## Phase C — App Privacy nutrition labels

URL: App Store Connect → Cenaiva → **App Privacy** → Get Started

### Data Types Collected (answer this way):

| Data type | Collected? | Linked to identity? | Used for tracking? | Purpose |
|---|---|---|---|---|
| **Name** | YES | YES | NO | App Functionality |
| **Email Address** | YES | YES | NO | App Functionality, Customer Support |
| **Phone Number** | YES | YES | NO | App Functionality, Customer Support |
| **Physical Address** | NO | — | — | — |
| **Other User Contact Info** | NO | — | — | — |
| **Health & Fitness** | NO | — | — | — |
| **Financial Info — Payment Info** | NO (handled by Stripe, not stored by Cenaiva) | — | — | — |
| **Financial Info — Other** | NO | — | — | — |
| **Precise Location** | NO | — | — | — |
| **Coarse Location** | YES | NO | NO | App Functionality (nearby restaurants) |
| **Contacts** | NO | — | — | — |
| **User Content — Photos** | YES | YES | NO | App Functionality (snap-and-share) |
| **User Content — Audio** | YES (voice assistant) | NO | NO | App Functionality |
| **User Content — Customer Support** | YES | YES | NO | Customer Support |
| **Browsing History** | NO | — | — | — |
| **Search History** | YES | YES | NO | App Functionality (personalized picks) |
| **Identifiers — User ID** | YES | YES | NO | App Functionality |
| **Identifiers — Device ID** | YES | NO | NO | Analytics (PostHog) |
| **Purchases — Purchase History** | YES (bookings) | YES | NO | App Functionality |
| **Usage Data — Product Interaction** | YES | NO | NO | Analytics |
| **Usage Data — Advertising Data** | NO | — | — | — |
| **Diagnostics — Crash Data** | YES | NO | NO | App Functionality (Sentry) |
| **Diagnostics — Performance Data** | YES | NO | NO | App Functionality |
| **Diagnostics — Other** | NO | — | — | — |

**Tracking question**: "Does your app use data for tracking purposes?" → **NO**

(Cenaiva does NOT share data with third-party advertisers, does NOT use cross-app/cross-website tracking, does NOT use IDFA.)

---

## Phase D — Pricing and Availability

URL: App Store Connect → Cenaiva → Pricing and Availability

| Field | Value |
|---|---|
| Price | **Free** (Tier 0) |
| Availability | All countries, or Canada + US to start |
| App Distribution Methods | App Store (default) |
| Pre-orders | OFF |
| Volume Purchase Program | OFF |

---

## Phase E — iOS App version 1.0 — "Prepare for Submission"

URL: https://appstoreconnect.apple.com/apps/6765771585/distribution/ios/version/inflight

### E1 — Marketing copy

**Promotional Text** (170 chars max — editable anytime without re-review):
```
Discover tonight's best tables, book in seconds, or just ask Hey Cenaiva to find your next dinner. Reservations and restaurants — your way.
```

**Description** (4000 chars max):
```
Cenaiva is the modern way to discover restaurants and book reservations on your terms.

DISCOVER TONIGHT'S BEST TABLES
Get personalized "best match for you" picks, browse by cuisine, neighborhood, vibe, or price. Trending tonight and 7-day forecasts let you grab the best slot before it sells.

RESERVE WITH ZERO FRICTION
Pick your party size, your time, and confirm in under 30 seconds. Optional deposits secure your spot at sought-after restaurants — fully refundable when the restaurant marks you seated.

TALK TO HEY CENAIVA
Ask in plain English: "Find me a steakhouse near downtown for two tomorrow at 7." Cenaiva's on-device voice assistant turns it into a booking — no typing, no scrolling.

PRE-ORDER + CALENDAR
Browse the menu, pre-order while you book (so your starters land the moment you sit), and add the reservation to your calendar with one tap.

EVENTS + PROMOTIONS
Discover dinner-theater nights, chef tastings, holiday menus, and seasonal promotions running at restaurants near you.

PRIVACY-FIRST
Your data stays yours. Pseudonymous browsing until you book. Delete your account from inside the app at any time.

ABOUT CENAIVA
Cenaiva is a Canadian-built dining platform that connects diners with restaurant operators. Restaurants use Cenaiva for kitchen display, guest profiles, pre-orders, and revenue analytics — diners get the benefit of a partner that the restaurant actually trusts.
```

**Keywords** (100 chars max, comma-separated NO SPACES):
```
reservation,booking,restaurant,dining,table,opentable,resy,ai,voice,toronto,canada,foodie,bookatable
```

**Support URL**: `https://cenaiva.com/support` (must serve a real page before submitting — fall back to `mailto:help@cenaiva.com` if the page isn't live yet)

**Marketing URL** (optional): `https://cenaiva.com`

**Version**: `1.0`

**Copyright**: `© 2026 Cenaiva Inc.` (or `© 2026 Steven Georgy` if no incorporated entity)

### E2 — Media

**iPhone 6.9" Display**: Drag all 6 files from `launch-assets/ios/` (1320×2868 each, verified):
1. `01-onboarding-find-tables.png`
2. `02-hey-cenaiva-voice.png`
3. `03-discover.png`
4. `04-bookings.png`
5. `05-profile.png`
6. `06-staff-dashboard.png`

Other display sizes (6.7", 5.5", iPad) — leave empty. Apple will use the 6.9" set as the canonical version for newer iPhones.

App Preview videos — leave empty. Defer to v1.1.

### E3 — App Review Information

| Field | Value |
|---|---|
| Sign-in required | ✓ Yes |
| **Username** | `appreview@cenaiva.com` |
| **Password** | `Cenaiva-Review-2026!` |
| First name | Steven |
| Last name | Georgy |
| Phone | (your real mobile with country code, e.g. `+1 416 555 0100`) |
| Email | `markhabbi2@gmail.com` |
| **Notes** | (paste the block below) |

#### Notes (paste verbatim):

```
Welcome reviewers — thanks for testing Cenaiva.

DEMO ACCOUNT
A demo customer account is pre-seeded with a confirmed reservation so you can immediately see populated state:
  Username: appreview@cenaiva.com
  Password: Cenaiva-Review-2026!
On sign-in, the Bookings tab already shows a confirmed reservation: SEAT-KWSQ at Qoop, 2 guests, tomorrow 7:00 PM Toronto.

QUICK PATH TO TEST THE CORE FLOW
1. Tap "Sign in" on the welcome screen and use the credentials above.
2. After sign-in you will land on the customer Discover screen (greeting: "Good morning, appreview" / "Good evening, appreview" depending on time of day).
3. Tap any restaurant card (e.g. "Blue Blood Steakhouse", "Keg Mansion", or "MICKY") to open its detail page.
4. Tap "Reserve" → pick a date, time, and party size → tap "Confirm booking".
   - Most restaurants in the demo data do not require a deposit. If one does, Cenaiva uses Stripe in test mode for this build — use card 4242 4242 4242 4242, any future expiry, any CVC, any postal code.
5. The confirmation screen appears and the reservation is then visible in the Bookings tab alongside SEAT-KWSQ.

HEY CENAIVA VOICE ASSISTANT
- From the Discover screen, tap the gold chat-bubble FAB at the bottom right.
- When prompted for microphone permission, tap Allow.
- Try a phrase like "Find me an Italian restaurant for two tomorrow at 7" and the assistant will return matching slots.
- Voice processing happens partly on-device and partly through a privacy-reviewed cloud transcription service. We disclose this in the Privacy Policy and in the in-app consent gate that runs on first launch.

ACCOUNT DELETION (App Store Review Guideline 5.1.1(v))
- Tap the Profile tab (bottom right) → "Privacy" → "Delete Account".
- This permanently deletes the user's account, reservations, snaps, and personally identifying data from the Cenaiva platform. Some payment records are retained for a limited period for tax compliance, as disclosed in our Privacy Policy section 11.

LEGAL ACCEPTANCE GATE
- On first launch (or after we publish a new Terms version), the app shows a full-screen consent screen with Terms of Service and Privacy Policy in fullScreen modals.
- The user must tick the agreement checkbox and tap "Accept and continue" before they can access any other screen. There is no way to bypass this — the only alternatives are "Sign out" or reading the docs.
- The appreview account has already accepted; you will not see the gate on sign-in.

MINIMUM AGE
- Cenaiva's Terms require users to be at least 16 years old (App Store rating is set to 17+ since 16 is not one of Apple's preset age brackets).

CONTACT
- For any issue during review please reach me at markhabbi2@gmail.com — I respond within a few hours during business hours (Eastern Time, Canada).

Thank you for reviewing Cenaiva.
```

**Attachment**: skip (optional).

### E4 — Version Release

Pick **"Manually release this version"** so you control the launch timing after Apple approves.

### E5 — Build

After the EAS build finishes + auto-submits, it appears here under **Build** section as a "+" picker. Wait until App Store Connect shows the build as "Ready to Test" (5-15 min after EAS submit). Then:
1. Click **+** next to Build → select the build → "Done"
2. Answer the export compliance question: "Does your app use encryption beyond standard HTTPS?" → **NO** (HTTPS is exempt under US export rules)

---

## Phase F — Pre-flight final review (before clicking Add for Review)

| Check | How to verify |
|---|---|
| Every section in the left sidebar shows a green checkmark | Visual inspection of sidebar |
| Privacy Policy URL serves a real page | Open https://cenaiva.com/legal/privacy in browser → should return 200, not 404 |
| Support URL serves a real page | Open https://cenaiva.com/support (or fall back to mailto:) |
| TestFlight build is visible + "Ready to Test" | App Store Connect → TestFlight tab |
| **You** have installed the TestFlight build on a real device and walked the appreview flow end-to-end | Manual; this is the catch-net |
| App Review Notes mentions account-deletion path | E3 block above mentions it |
| App Review Notes provides demo creds | E3 block above includes them |

---

## Phase G — Click Add for Review (USER ACTION — Claude will not do this)

Top-right of the iOS App version 1.0 page: **Add for Review** button becomes blue/enabled once everything is green.

After clicking:
- Apple's review typically takes 24-48 hours
- You'll get email updates: "Waiting for Review" → "In Review" → "Approved" or "Rejected"
- If rejected: read the rejection reason carefully, fix, bump buildNumber via `eas build --platform ios --profile production --auto-submit`, resubmit

**Common rejection reasons + how to preempt:**
- "Missing demo account" → already provided in E3 ✓
- "Privacy nutrition labels don't match privacy policy" → re-read Phase C against the live policy
- "Account deletion not in-app" → already at Profile → Privacy → Delete Account; mentioned in E3 ✓
- "Sign in with Apple missing" → we have it; verified earlier
- "Permission usage descriptions vague" → already non-empty + specific in `app.json` infoPlist

---

## Quick reference

| Item | Value |
|---|---|
| ASC app id | `6765771585` |
| Bundle ID | `com.cenaiva.app` |
| Apple Team | `WUHMA73X3T` |
| EAS project | `1e9ba9c7-4c10-442e-a345-6ca128628363` |
| Demo creds | `appreview@cenaiva.com` / `Cenaiva-Review-2026!` |
| Demo booking | SEAT-KWSQ at Qoop, 2 guests, 2026-05-23 19:00 Toronto |
| Privacy URL | `https://cenaiva.com/legal/privacy` |
| Terms URL | `https://cenaiva.com/legal/terms` |
| Support URL | `https://cenaiva.com/support` |
| iOS screenshots | `launch-assets/ios/*.png` (6 files, 1320×2868) |
| Play screenshots | `launch-assets/android/*.png` (6 files, 1080×2400) |
| Play feature graphic | `launch-assets/play-store/feature-graphic.png` (1024×500) |
