# Maestro E2E flows

End-to-end UI tests that drive the iOS Simulator (and Android emulator) via [Maestro](https://maestro.mobile.dev). Each YAML file is one flow; they're grouped by area:

```
.maestro/
├── smoke.yaml              # 10-second sanity check
├── auth/                   # sign-in, sign-up, OAuth, lockout, OTP, password reset
├── customer/               # discover, booking, profile, activity, events
├── staff/                  # owner home, reservations, menu, schedule, KDS
└── cenaiva/                # Hey Cenaiva voice assistant
```

## One-time setup

1. Install Maestro CLI:
   ```bash
   curl -Ls "https://get.maestro.mobile.dev" | bash
   export PATH="$PATH:$HOME/.maestro/bin"
   ```
2. Boot the iOS Simulator (any current iPhone — `iPhone 16e` works fine):
   ```bash
   xcrun simctl boot "iPhone 16e"
   open -a Simulator
   ```
3. Build the app + install in the simulator:
   ```bash
   npx expo run:ios --device "iPhone 16e"
   ```
   First run: ~5–10 min. Subsequent runs reuse the build.

## Running flows

```bash
# Run the full suite (every flow under .maestro/)
npm run e2e

# Or use Maestro directly
maestro test .maestro/

# Single flow
maestro test .maestro/smoke.yaml

# Watch mode for authoring a new flow (rerun on save)
maestro test --continuous .maestro/customer/discover-list.yaml

# Interactive recorder — open the simulator, click around, Maestro
# writes the YAML for you
maestro studio
```

## When a flow fails

Maestro saves a screenshot + a JUnit XML report. The CLI also prints the failing assertion + the closest matching elements visible at failure time. To investigate:

```bash
# Run a single flow with verbose output
maestro test --debug-output ./maestro-debug.log .maestro/auth/sign-in-email.yaml

# Open the screenshot
open ~/.maestro/tests/<latest-run>/screenshot.png
```

If the failure is a real defect (not a flaky test), fix it at the root and re-run.

## Conventions

- **Bundle id:** every flow header is `appId: com.cenaiva.app`
- **clearState** at the top of any flow that depends on a logged-out starting state
- **assertVisible** to verify the next screen rendered; **tapOn** by visible text when possible (more stable than testIDs that get renamed)
- **runFlow + when** for conditional steps (e.g., skip the onboarding modal if it doesn't appear)
- **inputText** to type into a focused field; tap the field first, then inputText
- **Stripe test card** for any payment flow: `4242 4242 4242 4242`, exp `12/30`, CVC `123`
- Reuse YAML snippets via `runFlow: file: ../shared/sign-in-test-customer.yaml` once we have repeated setup steps

## Authenticated flows

Real-credential flows take the email/password on the CLI so secrets never live in the repo:

```bash
maestro test .maestro/customer/booking-happy-path.yaml \
  --env MAESTRO_EMAIL=you@example.com \
  --env MAESTRO_PASSWORD=...
```

`_subflows/sign-in-with-creds.yaml` is the shared boot → ensure-logged-out → past-onboarding → Welcome → email/password → land-on-shell machinery; every authenticated flow composes it. `_subflows/switch-to-customer.yaml` flips an owner-role account into the customer shell via the staff Business → Settings → "Switch to user side" deep link, so a single test account can drive both shells.

### Common iOS-26 + Expo dev-client quirks

The dev build adds a floating gear button at the upper-right of every screen ("dev launcher floater"). It shares pixel space with the app's own settings gear on the staff Business tab, so taps there are unreliable. Flows that need to reach `/(staff)/settings` use `openLink: cenaiva://(staff)/settings` instead of tapping the in-app gear.

iOS-26 also wraps a11y card labels with leading commas (`, Mark Testing`, `, Staff members, …`). Flows match those with `.*Label.*` anchors. If a new flow's `visible:` predicate stalls on a label that's clearly on screen, dump the hierarchy with `maestro hierarchy` and check the `accessibilityText` formatting.

## Pre-grant simulator permissions

Some flows fail on the iOS sim if the app shows a permission dialog (microphone, camera, location). Grant them once before running the suite so the dialogs don't block:

```bash
UDID=$(xcrun simctl list devices booted | awk '/iPhone/ {print $NF}' | tr -d '()')
xcrun simctl privacy "$UDID" grant microphone com.cenaiva.app
xcrun simctl privacy "$UDID" grant camera com.cenaiva.app
xcrun simctl privacy "$UDID" grant location com.cenaiva.app
xcrun simctl privacy "$UDID" grant photos com.cenaiva.app
```

## Coverage gaps — manual QA only

These are explicitly NOT covered by automated Maestro flows and need manual QA on a real device:

- **Stripe PaymentSheet card round-trip** — `booking-with-preorder.yaml` asserts the "Confirm Booking · $X.XX" trigger button + the Payment Method section, then stops short of opening the sheet. Investigation in the last session found a hold-activation race condition that prevents the sheet from opening reliably in the test environment (when `hold.state.status !== 'active'`, `handleConfirmBooking` in `app/booking/[restaurantId]/step6-payment.tsx:281` short-circuits past the Stripe trigger). A pre-flight safety script (`scripts/maestro-stripe-preflight.sh`) is committed to refuse to run against a non-test (`pk_test_*`) key when the race is fixed. Until then: manual QA with card `4242 4242 4242 4242 / 12/30 / 123 / 10001`.
- **Real network failure modes** — confirmed iOS-sim-infeasible. iOS simulators have no clean airplane-mode toggle Maestro can drive; Network Link Conditioner is a UI that can't be reliably scripted. The expected coverage is "verify `friendlyError()` surfaces on offline sign-in / booking", which has to be tested on a real device with Wi-Fi toggled off. Note that `auth/sign-in-wrong-password.yaml` already covers the `friendlyError()` mapping for a recoverable server error.
- **Snap / camera / voice / Deepgram / ElevenLabs transcripts** — permanent Maestro limitation. Maestro can tap the entry points but can't verify transcription content, captured frames, or audio output. The routing into these surfaces is in scope for new flows; the *content* of the audio/transcript is not.
- **Owner-role permission toggling** — `staff/roles-permissions-persist.yaml` deliberately only touches the *Server* role (the inactive role for the signed-in Manager/Owner account) so a crashed run can't lock the owner out. The Manager/Host tabs are skipped by design.
- **Menu-delete-item and team-remove-member** — destructive writes are not covered because rolling them back from a flow tail is unreliable. The screens themselves are covered by `staff/team-screen.yaml` and `staff/roles-permissions-screen.yaml`.

## Closed coverage gaps

- **Notch / Dynamic Island clipping** — audited Mar 2026. Only `components/booking/HoldTimerBanner.tsx` was rendering behind the notch; fixed in commit `9550b5a` by adding `useSafeAreaInsets()` + `paddingTop: insets.top + 10`. Spot-checked Discover, Bookings, Profile, Notifications, staff Home, staff Business, staff Settings, staff Dashboard, and staff Roles & Permissions — all clear.
- **Permission persistence (Server role)** — covered by `staff/roles-permissions-persist.yaml`. The flow opens with a pre-flight reset, toggles a Server permission, navigates away, returns, and resets to defaults at the end. Safe to re-run.

## Android (in progress)

The corpus is iOS-first. Setup notes for adding Android:

- JDK 17 (Temurin or `openjdk@17` from Homebrew). Java 23 breaks the Android Gradle Plugin.
- Android command-line tools: `brew install --cask android-commandlinetools` (no sudo). Symlinks `sdkmanager`, `avdmanager`, etc. into `/opt/homebrew/bin`.
- SDK packages: `platform-tools`, `platforms;android-34`, `build-tools;34.0.0`, `emulator`, `system-images;android-34;google_apis;arm64-v8a` (arm64 required on Apple Silicon).
- AVD: `avdmanager create avd -n Pixel_7_API_34 -k "system-images;android-34;google_apis;arm64-v8a" -d pixel_7`.
- Boot: `$ANDROID_HOME/emulator/emulator -avd Pixel_7_API_34 -no-snapshot`.
- App build: `npx expo prebuild -p android` then `npx expo run:android --port 8082` (port 8082 keeps Metro out of conflict with the iOS bundler on 8081).
- Selectors will likely need Android variants — iOS-26 uses `Discover, tab, 1 of 17` formats with leading commas, while Android uses `Discover, Tab 1 of 5`. When divergence is unavoidable, fork into `flow-android.yaml` rather than fight a unified matcher.
