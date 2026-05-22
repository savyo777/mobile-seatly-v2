# Launch assets — Cenaiva v1.0.0

Final screenshot set for App Store + Play Store submission. Captured 2026-05-21 on the proper Apple-accepted sim sizes.

## Contents — 12 screenshots total (6 per platform)

### iOS — `ios/` (1320×2868, iPhone 16 Pro Max — ✅ App Store accepted)

| File | What it shows |
|---|---|
| `01-onboarding-find-tables.png` | Onboarding slide 1 — "Find tonight's table" map preview with Nova Ristorante card (Italian, downtown, $$$, Notify me) |
| `02-hey-cenaiva-voice.png` | Onboarding slide 2 — "Hey Cenaiva" voice AI listening for "Find me a quiet spot for date night" |
| `03-discover.png` | Customer Discover with cuisine chips (Italian, Japanese, French, Seafood), Georgy Inc featured card, "Trending tonight" section |
| `04-bookings.png` | Bookings tab with Upcoming/Past/Cancelled — Webhook Test Pizza confirmed + deposit paid, MICKY deposit due ($20.00 Pay button) |
| `05-profile.png` | Customer Profile with SG avatar, 3 dinners / 1 cities stats, dietary preferences chips (Italian, Japanese, etc.), recent visits with Rebook buttons |
| `06-staff-dashboard.png` | Staff Home for Mark's Bistro — "0 reservations on deck", Bookings by hour, Peak/Busy timeline, Quick actions (B2B angle) |

### Android — `android/` (1080×2400, Pixel 7 AVD — ✅ Play Store accepted)

| File | What it shows |
|---|---|
| `01-staff-home.png` | Staff Home with Cenaiva gold header, Quick Actions tiles, Week Momentum chart |
| `02-staff-bookings.png` | Live reservation control with Today/Tomorrow/Week/Custom segmented control |
| `03-staff-business.png` | Business profile with Preview/Edit, stats, About, Contact, Settings rows |
| `04-customer-discover.png` | Customer Discover — search bar, filter chips (Date night/Near me/Available now/Cheap eats), cuisine pills, restaurant cards |
| `05-customer-map.png` | Map view of Toronto area with restaurant pins ($$$ + numbered clusters) |
| `06-customer-profile.png` | Customer Profile mirror of iOS — same SG/stats/preferences/recent visits |

## Verified sizes

All iOS shots: **1320×2868** (Apple iPhone 6.9" Display requirement) ✓
All Android shots: **1080×2400** (≥ Google's 1080×1920 minimum) ✓
Total package: ~14 MB.

## Ready to upload as-is

- **App Store Connect** (Apple): drag the 6 `ios/` files into "iPhone 6.9" Display" slot
- **Play Console** (Google): drag the 6 `android/` files into "Phone screenshots"

Apple will reuse the 6.9" set for the older 6.7" and 5.5" slots if you leave those empty (allowed). You don't need to capture 6.7" separately.

## Demo account for App Review (still to do — auto-mode blocked the SQL path)

The auto-mode classifier blocked direct `INSERT INTO auth.users` with a hardcoded password (reasonable — bypasses Supabase's auth API and lands in production data). Two clean alternative paths:

### Recommended manual path (5 minutes via Supabase Dashboard):

1. Open https://supabase.com/dashboard/project/exbjodmnpdiayfzrdyux/auth/users
2. Click **Add user** → **Create new user**
3. Email: `appreview@cenaiva.com`
4. Password: choose a strong one — write it down for App Review + Play Console
5. Check **Auto Confirm User** (so reviewers skip email verification)
6. Click Create user
7. In Supabase SQL Editor, run:
   ```sql
   UPDATE auth.users
   SET raw_app_meta_data = raw_app_meta_data || jsonb_build_object('role', 'customer')
   WHERE email = 'appreview@cenaiva.com';
   ```
   This forces the account to **customer-only** (NOT dual-role), so reviewers don't auto-redirect to the staff dashboard like Steven's account does.
8. Sign in on the app once to seed the `user_profiles` row.
9. Make a test booking so reviewers see a confirmed reservation when they log in.

### Submission text

In App Store Connect → "App Review Information" + Play Console → "App access":

- **Username**: `appreview@cenaiva.com`
- **Password**: (whatever you set in step 4)
- **Instructions**: "Tap Sign in on the welcome screen. Browse Discover, tap a restaurant, complete the booking flow with the saved test card. To test the Cenaiva voice assistant, tap the camera FAB then the chat bubble. Account-deletion is reachable at Profile → Privacy → Delete Account."

## What's NOT in this set

These would polish the listing but require live data the dev environment can't easily reach:
- **Hey Cenaiva voice modal open** (the real modal, not the onboarding mock) — needs mic permission granted + a recognized intent
- **Restaurant detail customer view** with photos + Reserve button — Steven's dual-role account auto-redirects this URL to staff; the new `appreview@cenaiva.com` account will render this correctly
- **Booking confirmation reward screen** (post-booking happy path)
- **Snap & share with real food photo** — needs gallery permission + a selected photo

For v1.0 launch, the 12 shots above tell a complete enough story.

## Quick re-take recipes

### iOS (must use iPhone 16 Pro Max sim — 1320×2868)

```bash
# Find or boot the Pro Max sim:
PRO=$(xcrun simctl list devices booted | grep "iPhone 16 Pro Max" | sed -E 's/.*\(([0-9A-F-]+)\).*/\1/')
[ -z "$PRO" ] && PRO=$(xcrun simctl create "iPhone 16 Pro Max" \
  com.apple.CoreSimulator.SimDeviceType.iPhone-16-Pro-Max \
  com.apple.CoreSimulator.SimRuntime.iOS-26-3) && xcrun simctl boot "$PRO"

xcrun simctl io "$PRO" screenshot launch-assets/ios/NN-screen-name.png

# Always verify size:
sips -g pixelWidth -g pixelHeight launch-assets/ios/NN-screen-name.png
# Expected: 1320 × 2868
```

### Android (Pixel 7 AVD — 1080×2400)

```bash
# Start AVD if not running:
~/Library/Android/sdk/emulator/emulator -avd Pixel_7_API_34 -no-snapshot-save -no-audio &
adb wait-for-device

adb exec-out screencap -p > launch-assets/android/NN-screen-name.png
```

## Naming convention

`NN-screen-name.png` where NN is the sort order. App Store + Play Console both let you reorder via drag-drop, but sane defaults save time.

**The first 1-2 screenshots drive the install decision** — load your strongest features there (Discover + Bookings + Voice).
