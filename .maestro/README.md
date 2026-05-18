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

## Known coverage gaps

The following are explicitly NOT covered by Maestro yet and need manual QA:

- **Stripe PaymentSheet** — `booking-with-preorder.yaml` asserts the "Confirm Booking · $X.XX" trigger button + the Payment Method section, then stops. Scripting Maestro into the native iOS Stripe sheet to actually authorize a charge is brittle across SDK versions; manual QA with card `4242 4242 4242 4242 / 12/30 / 123 / 10001` is required to verify the full purchase round-trip.
- **Real network failure modes** — iOS simulators have no clean airplane-mode toggle Maestro can drive. Network Link Conditioner exists in Developer settings but it's a UI you'd have to script. The expected coverage is "verify `friendlyError()` surfaces on offline sign-in / booking / snap / voice", which is best tested on a real device with Wi-Fi toggled off.
- **Staff destructive write paths** — delete menu item, remove team member, role-permission toggle persist. The screens themselves are covered by `staff/team-screen.yaml` and `staff/roles-permissions-screen.yaml`, but the actual writes risk leaving the test owner locked out (or breaking other QA) if the test exits mid-run.
- **Snap / camera / voice / Deepgram / ElevenLabs transcripts** — Maestro can tap the entry points but can't verify transcription content or captured frames.
- **Android** — the corpus is iOS-only today. Selectors that match iOS-26 a11y label formats (`Discover, tab, 1 of 17`, leading commas, etc.) will need Android variants. Disk has been freed; the install + first-run path is documented in the team's runbook.
