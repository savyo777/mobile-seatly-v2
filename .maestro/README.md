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
