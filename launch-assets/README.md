# Launch assets — Cenaiva v1.0.0

Starter screenshots captured 2026-05-21 during the launch-prep session.

## Contents

### iOS (1170×2532 — captured on iPhone 16e sim)
- `01-discover.png` — Customer Discover screen with "tonight's picks", restaurant cards, cuisine chips
- `02-discover-map.png` — Map view with restaurant pins + price clusters
- `08-staff-dashboard.png` — Staff Home with Quick Actions + Week Momentum chart

### Android (1080×2400 — captured on Pixel 7 AVD)
- `01-staff-home.png` — Staff Home with Cenaiva gold header, "Good evening Steven", peak/busy timeline
- `02-staff-bookings.png` — Bookings tab with Today/Tomorrow/Week/Custom segmented control + live reservation control
- `03-staff-business.png` — Business profile with Preview/Edit, stats, About, Contact, Settings

## ⚠️ Before submitting to App Store

**iPhone 16e is NOT an accepted screenshot size for the App Store.** Apple requires 6.9" display (iPhone 16 Pro Max, 1320×2868).

To retake on the right sim:
1. Xcode → Window → Devices and Simulators → "+" → add iPhone 16 Pro Max sim
2. Boot it: `xcrun simctl boot "iPhone 16 Pro Max"`
3. Install the production preview build: `eas build --profile preview --platform ios --local`
4. Re-walk these same screens and capture with `xcrun simctl io booted screenshot launch-assets/ios/XX.png`

The iPhone 16e shots are still useful for:
- Designing the App Store listing layout
- Marketing reference (the actual screen content is identical)
- A/B testing copy/positioning before committing to final shots

## ⚠️ For Play Store

Pixel 7 AVD (1080×2400) IS accepted by Google Play (≥1080×1920 is the bar).

You can submit the Android shots as-is.

## Additional screens to capture before submission

Both stores require 2-8 screenshots. The above is a starter set. Capture these too:

| Screen | iOS Maestro selector | Android adb tap path |
|---|---|---|
| Customer Profile | tap "Profile" tab | tap "Profile" tab |
| Customer Bookings list | tap "Bookings" tab | tap "Bookings" tab |
| Hey Cenaiva voice modal | tap FAB (gold circle) | tap FAB |
| Restaurant detail (customer view) | deep link `/restaurants/<uuid>` from a non-owner account | same |
| Booking confirmation | complete a test booking | same |
| Settings / Notifications | Profile → gear | Profile → gear |

Use a customer-only test account (not Steven's dual-role account) so the customer flows render without staff-side rerouting.

## Quick re-take recipe

```bash
# iOS (on a sim that's ≥6.7"):
xcrun simctl io booted screenshot launch-assets/ios/<NAME>.png

# Android:
adb exec-out screencap -p > launch-assets/android/<NAME>.png

# Validate sizes (Apple requires 1320×2868, 1290×2796, or 1242×2208):
sips -g pixelWidth -g pixelHeight launch-assets/ios/*.png
```

## Naming convention

Use `NN-screen-name.png` so they sort lexically in the order they should appear in the store listing:
- `01-` first screen (most important, drives install)
- `02-` second
- ...
- `08-` last

App Store reorders via drag-drop in their UI anyway, but starting with sensible ordering saves time.
