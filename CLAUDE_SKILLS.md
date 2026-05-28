# Cenaiva Mobile — Skills, Architecture, and Hard-Won Lessons

Single durable knowledge transfer for any future AI engineer (or human) joining this repo. CLAUDE.md is the live operational ruleset; this file is the longer-form context behind those rules. Optimized for one-read onboarding: every section is a self-contained chunk you can jump to.

Source material distilled from 23+ handoff docs (now deleted), every commit of the May 2026 launch push, and saved feedback memories at `~/.claude/projects/-Users-stevengeorgy-mobile-seatly-v2-5/memory/`.

---

## 1. Project identity (read first)

- **Brand**: Cenaiva. NOT Seatly. If you see Seatly anywhere user-visible, fix it. The only intentional Seatly artifacts are the `@seatly/` AsyncStorage migration prefix and the `mobile-seatly-v2-2/` stale subfolder (do not touch).
- **Repo**: `savyo777/mobile-seatly-v2` on GitHub. Working dir on disk: `mobile-seatly-v2-5/` (the trailing number changes; don't be confused).
- **package.json.name**: `mobile-cenaiva-v2`
- **Brand domain**: `cenaiva.com`
- **Bundle / scheme**: `com.cenaiva.app` / `cenaiva://`. Both iOS bundle and Android package unified to `com.cenaiva.app` (the legacy `com.savyo.cenaiva` iOS identifier was retired on the 2026-05-21 prebuild that added expo-calendar; only `com.cenaiva.app` is installed on the sim now).
- **Branching**: COMMIT DIRECTLY TO `main`. Solo user, reviews by running the app. No feature branches, no PRs unless explicitly asked. `git push origin main` after every batch.
- **Commit messages**: HEREDOC, sentence-case, no conventional-commit prefix. Co-Authored-By line: `Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- **What NOT to touch**: `mobile-seatly-v2-2/` (stale duplicate, ~hundreds of pre-existing TS errors), `ios/` and `android/` (Expo-managed; only edit on explicit ask), `.claude/worktrees/` (harness-generated).
- **TS verification**: `npx tsc --noEmit 2>&1 | grep -v "mobile-seatly-v2-2"`. Filtered output empty = clean.

---

## 2. Stripe Option B fee math — DO NOT DRIFT FROM THIS

The single most launch-blocking class of bug this session. Mobile and server MUST agree on the formula or Stripe rejects the PaymentIntent with `amount_mismatch`.

**Canonical formula (server is source of truth, mobile mirrors):**
```ts
cenaivaFee     = max(ceil(base * 0.055), 1)      // 5.5% of BASE
subtotal       = base + cenaivaFee
dinerTotal     = ceil((subtotal + 30) / 0.971)   // gross-up so Stripe's 2.9% + 30¢ comes off the top
processingFee  = dinerTotal - subtotal           // visible line item
applicationFee = cenaivaFee                      // routes to Cenaiva via Stripe Connect
```

**Mobile lives at**: `lib/stripe/stripeFee.ts`. Locked by 14 jest boundary tests in `__tests__/stripe/stripeFee.test.ts`. **Never edit the formula without bumping the tests AND the server-side `_shared/stripe-fee.ts` in lockstep.**

**Worked examples (must match exactly):**
| Base | Diner pays | Cenaiva fee | Processing fee |
|---|---|---|---|
| $5  | $5.75    | $0.28 | $0.47 |
| $10 | $11.18   | $0.55 | $0.63 |
| $20 | $22.04   | $1.10 | $0.94 |
| $40 | $43.77   | $2.20 | $1.57 |

**The gotcha that broke this session:**

1. **Send BASE to the server, not the gross-up.** Mobile cart computes the gross-up for display, but `create-public-payment-intent` expects `amount_cents = base` and grosses up server-side. Sending the grossed amount returns `amount_mismatch` 400. Fixed in `1bfe859`.

**Cart UI**: displays 3 line items always — Deposit / Platform fee (5.5%) / Processing fee — plus Total. Disclosure: "Platform fee and processing fee are non-refundable. Your CA$X deposit is fully refundable when the restaurant marks you seated."

**Refund-on-cancel math**: refund the BASE; the platform + processing fees stay. Shared with web via `_shared/refund-math.ts`. See `__tests__/stripe/stripeFee.test.ts` for the contracts.

---

## 3. Reservation hold lifecycle

30-minute TTL. The hook is `useReservationHold` at `lib/booking/useReservationHold.ts` (~557 lines), wrapped by `ReservationHoldProvider` mounted ONCE in `app/booking/[restaurantId]/_layout.tsx` (the whole booking flow shares one hold).

**Lifecycle states**: `idle → creating → active → expired | converting | confirmed | error`

**Heartbeat (line 369-406)**: every 30 seconds while `active` + foregrounded, calls `heartbeatReservationHold(holdId, 120)`. The 120 is `extend_seconds`. **Server returns a new `expires_at` in the success body** — apply it to state or the client timer drifts past the server-side TTL and dead-ends the diner. (Was broken before `b787c33`.)

**Three classic hold bugs (all fixed this session, all easy to regress):**

1. **Premature unmount cancel**. There used to be a `useEffect` cleanup that fired `fireAndForgetCancel(holdId)` whenever `clearPersistedHold` identity changed. Identity changes on Provider re-render, AppState transitions, Metro Fast Refresh in dev. Every false trigger cancelled the user's live hold. Removed in `b787c33`. **DO NOT re-add an unmount cancel.** Server natural expiry (30 min) is enough; user-initiated cancel via `cancelHold()` is still exported for explicit UI affordances.

2. **Heartbeat response ignored**. The `.then(resp)` was missing — `expires_at` never flowed back into state. Restored in `b787c33`.

**Persistence**: the hook persists to AsyncStorage so the diner can resume after backgrounding. Key derived from `restaurantId + dateTime`. Storage prefix is `@cenaiva/` (the legacy `@seatly/...` prefix is auto-migrated on cold start via `lib/storage/migrate.ts`).

**Dev-only instrumentation**: `console.log('[hold] …')` at three transition points (heartbeat extension, client-tick expired, transitionToActive). Keep these — they paid for themselves diagnosing the May 21 incident.

---

## 4. Split-tender — REMOVED from mobile on 2026-05-28

The split-tender feature (one party splitting a deposit across N cards) was removed from mobile checkout on 2026-05-28 — the complexity wasn't worth the diner usage (5 bugs fixed since launch, plus a mid-submit race). The mobile checkout now only supports single-pay.

**Server contract still exists** for the web sister repo. `create-public-booking` still accepts `split_tender_payers` and inserts `reservation_deposit_payments` rows; `reservation_deposit_settle` trigger still flips reservation to `'confirmed'` when all rows charge. If web also removes split-tender later, follow up with a PR to delete the server-side branch.

**Do not re-introduce on mobile** without an explicit product decision.

---

## 5. friendlyError() defense-in-depth

Every error/warning Alert in mobile RN code MUST route through `friendlyError()` (`lib/errors/friendlyError.ts`) — even when the literal fallback is already safe. The wrapper is the contract; the literal is the safety net. **NEVER append error codes to user-visible text.** Codes go to telemetry, not the Alert body. (Saved in `feedback_friendly_error_strict`.)

Pattern:
```ts
catch (err) {
  Alert.alert(
    'Could not load',
    friendlyError(err, 'Your bookings could not be loaded. Please try again.'),
  );
}
```

When you need the raw `err.message` (e.g. a server-returned overlap message), bypass deliberately + add a comment explaining why.

---

## 6. Edge function deploy workflow

Pre-authorized end-to-end on Supabase project `exbjodmnpdiayfzrdyux`. No per-deploy approval required.

**Preferred (MCP tool)**: `mcp__supabase__deploy_edge_function`. Pass the FULL bundle (entrypoint + every `_shared` import + `deno.json`). The MCP tool occasionally throws `InternalServerErrorException` on retries — fall back to the CLI: `npx supabase functions deploy <name>`.

**Workflow when editing a shared edge fn (e.g. `create-public-booking`):**

1. `mcp__supabase__get_edge_function('<name>')` to get the DEPLOYED source verbatim. The local repo's copy may be drift-stale — the web sister repo has shipped features mobile doesn't have locally (e.g. `runPostHoldConversion`, full owner-notifications). DO NOT just deploy the local file — you'll overwrite the web team's changes.
2. Extract the deployed `index.ts` + every `_shared` file the response includes.
3. Apply YOUR edit on top of the deployed source.
4. Deploy via MCP with the full file bundle.
5. Sync the deployed source back into the local repo so future MCP fetches start from current.
6. Mention which functions you (re)deployed in the commit message.

**Local-build escape hatch**: `SENTRY_DISABLE_AUTO_UPLOAD=true` in `ios/.xcode.env.local` (gitignored) — without it the Sentry source-map upload script fails with "An organization ID or slug is required". Only matters when running `xcodebuild` locally; EAS Cloud builds have the secret set.

**Coordination rule (CLAUDE.md)**: when an edge fn is shared with the web sister repo, coordinate before destructive changes. For backwards-compatible fixes (the payer-info insert was strictly additive), the deploy is safe. For schema-changing edits (renaming a response field), pause and write a `docs/WEB_APP_HANDOFF.md` first.

---

## 7. DB migration workflow

Same project pre-authorization. Two paths:

- **Preferred**: `mcp__supabase__apply_migration` (keeps the migration log up to date in the Supabase dashboard)
- **CLI**: `npx supabase db push` (for local-edited migration files)

**CLAUDE.md rule**: for destructive changes (NOT NULL adds, column drops, anything that could break running queries), write a precheck query into the migration file as a comment. Example:
```sql
-- Precheck (safety):
--   SELECT count(*) FROM information_schema.columns
--   WHERE table_schema='public' AND table_name='user_profiles'
--     AND column_name='tos_accepted_at';
--   -- expect 0 before this migration runs
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS tos_accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS tos_version text;
```

**The "two book_reservation versions" gotcha**: when functions are overloaded by arg count, both versions need the same logic. We discovered this the hard way — the 17-arg accepted `pending_payment`, the 20-arg didn't, and `create-public-booking` was dispatching to the 20-arg whenever event/promotion params were sent (which is always). Migration: re-apply BOTH variants.

---

## 8. Demo mode + mock data gating

`isDemoModeEnabled()` from `lib/config/demoMode.ts` is the master switch (env: `EXPO_PUBLIC_CENAIVA_DEMO_MODE`).

**Pattern** in real screens:
```ts
import { mockX as DEMO_X } from '@/lib/mock/...';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
const mockX = isDemoModeEnabled() ? DEMO_X : [];
```

**Why this matters**: per a saved user directive, "Don't show fake numbers to real users." Every `lib/mock/*` import in a production screen MUST be gated, or demo data leaks into prod. The audit found ~80 production files importing mocks ungated — a real launch blocker for a while.

`lib/mock/*` is intentionally KEPT (per CLAUDE.md loyalty-flag pattern) so a single env toggle restores the showcase experience.

---

## 9. Loyalty feature flag pattern

The loyalty / rewards system is **hidden but preserved** across the app. Every surface gates on `isLoyaltyEnabled()` from `lib/config/loyaltyFeature.ts` (currently returns `false`).

**Intentionally retained for the day we flip the flag:**
- All `lib/loyalty/*`, `lib/mock/loyalty.ts`
- `loyalty_*` columns on user/guest profiles
- `loyalty.*` i18n keys
- `loyaltyTierColors` in theme tokens

**To re-enable**: change `lib/config/loyaltyFeature.ts` to return `true` (or wire to an env var) and smoke-test: profile home, wallet, notifications, onboarding slide 3, post-snap reward, the two staff guest screens.

**New loyalty UI added during this hidden period MUST also wrap in `isLoyaltyEnabled()`** — don't surface loyalty without going through the flag.

---

## 10. Auth identity — `useCurrentUserId()`

For "the current user's id" in production code, use `useCurrentUserId()` from `lib/auth/currentUserId.ts`. **Never** reach into `mockCustomer.id` (= `'u1'`) from a real screen.

The hook returns the auth user's id, falls back to `mockCustomer.id` only when demo mode is on, returns `null` otherwise.

**Old bug, now resolved but watch for regressions**: `mockCustomer.id` was used as the current user's identity in 9 production files. If you see a new file importing from `lib/mock/customer`, refactor it before merge.

**Auth context** (`lib/auth/AuthContext.tsx`) exposes:
```ts
{
  session, user, loading,
  isAuthenticated, isStaffLike, role,
  signOut,
  needsLegalConsent: boolean | null,  // gate state
  recordLegalConsent: () => Promise<void>,
}
```

Roles come from `app_metadata.role` ONLY (never `user_metadata.role` — that's user-mutable and a forge vector closed in the 2026-05-17 security audit).

---

## 11. Constants — single source of truth

When you spot a literal that looks duplicated, check first whether a centralized constant exists:

| Topic | Lives at |
|---|---|
| Booking defaults (turn time, slot, timezone, currency, max party) | `lib/booking/bookingDefaults.ts` |
| Booking limits (party-size cap, booking window) | `lib/booking/bookingLimits.ts` |
| Login lockout policy | `lib/auth/lockoutPolicy.ts` |
| Loyalty tiers | `lib/loyalty/tiers.ts` |
| Diner tiers | `lib/loyalty/dinerTiers.ts` |
| Legal URLs | `lib/config/legalLinks.ts` |
| Contact emails | `lib/config/contactInfo.ts` (SUPPORT_EMAIL, PRIVACY_EMAIL, LEGAL_EMAIL, SECURITY_EMAIL) |
| Staff roles | `lib/owner/staffRoles.ts` |
| Promotion types | `lib/owner/promotionTypes.ts` |
| Owner trial policy | `lib/owner/trialPolicy.ts` |
| Owner referral policy | `lib/owner/referralPolicy.ts` (server: `supabase/functions/_shared/referral-policy.ts`) |
| KDS thresholds | `lib/owner/kdsThresholds.ts` |
| Price-tier options | `lib/restaurants/priceTiers.ts` |
| Preference catalogs (cuisines, dietary, vibes) | `lib/constants/preferenceCatalog.ts` |
| AsyncStorage prefix helper | `lib/storage/keys.ts` (`key(name)`) |
| Legal versions + minimum age | `lib/legal/versions.ts` (LATEST_LEGAL_VERSION, MINIMUM_AGE=16) |
| Server booking defaults | `supabase/functions/_shared/booking-defaults.ts` |
| Server ElevenLabs config | `supabase/functions/_shared/elevenlabs.ts` |
| Server Stripe helpers + API version | `supabase/functions/_shared/stripe.ts` |
| Server geo (haversineKm) | `supabase/functions/_shared/geo.ts` |
| Server UUID regex | `supabase/functions/_shared/uuid.ts` |
| Server confirmation code | `supabase/functions/_shared/confirmation-code.ts` |
| Server rate limits | `supabase/functions/_shared/cenaiva-limits.ts` |

**Three drift gotchas to watch for:**
- Tailwind palette vs `lib/theme/palettes.ts` (three different golds floating around: `#C9A84C`, `#C9A24A`, `#D4AF37`). Don't introduce more.
- Two confirmation-code generators inline (`PRE-XXXX`, `CNV-NNNNNN`) despite the centralized one in `_shared/confirmation-code.ts`.
- `register-restaurant-owner/index.ts` is the worst offender for reinventing `_shared/` modules.

---

## 12. OpenAI / voice rate limits

Per-user limits on every paid AI/voice edge function. All in `supabase/functions/_shared/cenaiva-limits.ts` (env-overridable, no redeploy to tune):

| Function | Per-minute brake | Per-day ceiling | Other |
|---|---|---|---|
| `cenaiva-orchestrate` (gpt-4o-mini) | 6 | 100 | 450 max output tokens |
| `cenaiva-small-prompt` (gpt-4.1-nano + ElevenLabs) | 4 | 8 | 30 max output tokens |
| `scan-receipt` (gpt-4o-mini vision) | 10 | 75 | — |
| `elevenlabs-tts` | 4 | 12 | **220 chars max per call** (biggest cost lever) |
| `deepgram-live-token` | 6 | 44 | Room for no-speech transcripts |

Per-minute = burst brakes; per-day = request ceiling. `paid_usage_buckets` adds the real per-user cost ceiling via `CENAIVA_USER_DAILY_AI_BUDGET_USD=0.50`. **Keep audio-bearing daily caps tight first** — ElevenLabs dominates Hey Cenaiva spend.

429 responses use stable codes `rate_limit_minute` / `rate_limit_day`. Mobile `friendlyError()` already maps them. Every new paid AI endpoint MUST add a bucket here and use `enforceRateLimit()` + `rateLimitIdentifier()` from `_shared/rate-limit.ts`.

---

## 13. Legal acceptance gate

Shipped 2026-05-21. The gate blocks any authenticated user from `/(customer)` or `/(staff)` until they accept the current Terms + Privacy.

**Plumbing:**
- `lib/legal/versions.ts` → `LATEST_LEGAL_VERSION` (single stamp). Bump it → every existing user re-hits the gate.
- `user_profiles.tos_accepted_at + tos_version` (added by migration `add_user_profile_tos_acceptance`). NULL means "never accepted."
- `AuthContext` loads `tos_version` alongside `role`, exposes `needsLegalConsent: boolean | null` + `recordLegalConsent()`.
- Gate fires in `app/_layout.tsx` `ThemedRootShell` effect, BEFORE the existing "auth → app" redirect.
- Consent screen: `app/(auth)/consent.tsx`. Renders Terms + Privacy in a **fullScreen Modal** (not a router.push) so back can't bypass the gate.
- Canonical content: `lib/legal/{termsContent, privacyContent, partnerAgreementContent}.ts` (single source for both the gate's modal AND the post-consent Profile → About → Legal screens).

**Minimum age = 16** (Terms §1). The canonical text the user provided originally said 13; we substituted to 16 per user direction. `MINIMUM_AGE = 16` exported from `versions.ts` for the future DOB-gate.

**Five legal screens** at `app/(customer)/profile/legal/`: terms, privacy-policy, partner-agreement, sub-processors, agreement-history, plus licenses. All render via the generic `components/profile/LegalScreen.tsx`.

**Account-deletion path** (Terms §3 + Privacy §11 require this): Profile → Privacy → Delete Account. Settings → Delete account still exists as a parallel path.

**Out of scope (parked for follow-ups)**: signup DOB age gate, voice consent log + modal, partner agreement consent log, push pref categories, per-restaurant marketing toggle, voice-data deletion button, "request human review" CTAs for AI scores, French translation banner.

---

## 14. Dev-client rebuild gotchas

When a new Expo native module is added (e.g. `expo-calendar`), the dev client needs a full rebuild — not just a Metro reload. Symptoms of skipping the rebuild:
- "expo-screen-capture native module not linked" warnings in Metro
- `Calendar.requestCalendarPermissionsAsync()` throws an empty-object rejection that escapes try/catch and triggers the global crash guard
- `Cannot find native module 'ExpoCalendar'` at module load

**The rebuild recipe (verified end-to-end this session):**
```bash
npx expo prebuild --platform ios     # regenerates Info.plist with new usage descriptions
cd ios && pod install                # installs the new pod (ExpoCalendar 55.0.15 etc.)
cd ..
echo "export SENTRY_DISABLE_AUTO_UPLOAD=true" > ios/.xcode.env.local  # gitignored; skip sentry source-map upload
xcodebuild -workspace ios/Cenaiva.xcworkspace -configuration Debug -scheme Cenaiva \
  -destination "id=<sim-UDID>" DEVELOPMENT_TEAM=WUHMA73X3T \
  -allowProvisioningUpdates -quiet
xcrun simctl install booted /path/to/Cenaiva.app
```

**Build time**: 8–15 min cold, ~3 min incremental.

**Sentry org error** (`error: sentry-cli — An organization ID or slug is required (provide with --org)`): the SENTRY_DISABLE_AUTO_UPLOAD env var is the fix. EAS Cloud has SENTRY_ORG set as a secret so it doesn't hit this. Local builds need the override.

---

## 15. Cross-surface handoff rule

When a plan / change touches anything shared with the web sister repo, produce `docs/WEB_APP_HANDOFF.md` mapping the DB + backend + frontend touchpoints + a sign-off checklist. Trigger categories:
- Shared DB (`user_profiles`, `reservations`, `reservation_holds`, `reservation_deposit_payments`, `orders`, `restaurants`, etc.)
- Shared edge functions (`create-public-booking`, `create-public-payment-intent`, `confirm-deposit-paid`, `cancel-reservation`, `stripe-webhook`, etc.)
- Fee math (`stripeFee.ts` + `_shared/stripe-fee.ts`)
- ToS / Privacy / Partner Agreement copy
- Opt-out flags / consent log tables

(Saved in `feedback_web_handoff_doc` memory.)

`docs/WEB_APP_HANDOFF.md` was deleted in the launch cleanup because it's transient — write a fresh one each time the change requires it, then delete after the web team signs off.

---

## 16. Mirror web for parity-sensitive features

**Fee math**: mobile must MATCH web exactly. Stripe rejects PIs with mismatched amounts. (See §2.)

**Verify web's behavior before mobile extension**:
1. Use `mcp__supabase__get_edge_function(<name>)` to fetch the deployed shared source
2. Read the relevant branch
3. Build mobile against that contract
4. If web doesn't have the feature, don't add it mobile-only

---

## 17. K6 load-test runbook

Two ready-to-run scripts at `tests/load/`. k6 already installed at `/opt/homebrew/bin/k6` (v2.0.0+).

| Script | Targets | Threshold |
|---|---|---|
| `browse-availability.k6.js` | `GET /functions/v1/get-availability` (edge fn) | p95 < 12s |
| `availability-rpc.k6.js` | `POST /rest/v1/rpc/get_available_slots_cached` (direct RPC) | p95 < 6s |

**Ramp**: 1 → 50 → 100 → 200 VUs over 5 min. Aborts on p95 > threshold OR error rate > 10%.

**Run**:
```bash
export SUPABASE_URL="https://exbjodmnpdiayfzrdyux.supabase.co"
export SUPABASE_ANON_KEY="<EXPO_PUBLIC_SUPABASE_ANON_KEY from .env>"
export RESTAURANT_ID="<a published restaurant uuid — query Supabase MCP>"
k6 run tests/load/browse-availability.k6.js
k6 run tests/load/availability-rpc.k6.js
```

**Baseline established in `5bb354d` (May 16)** after a 20x speedup fix to `get-availability` (eliminated N+1 + added cache). Run these BEFORE every launch ramp + after any non-trivial schema/index change.

**Why these two endpoints**: anon-callable (no auth setup) + read-only (no Stripe/email/SMS side effects) + the diner's hot path. Don't load-test paid AI endpoints from k6 — they have per-user rate limits that will give you noise instead of signal.

---

## 18. Platform parity exceptions (catalogued)

"Not one thing should be iOS only." The intentional exceptions:
- **Apple Sign-In** (no Android equivalent)
- **Apple Pay vs Google Pay** (Stripe PaymentSheet auto-picks the right one per platform)
- **Biometric labels** ("Face ID / Touch ID" on iOS, "fingerprint" on Android)
- **RN shadows** (iOS uses `shadowColor/Offset/Opacity/Radius`, Android uses `elevation`)

Everything else gets a cross-platform code path or doesn't ship.

---

## 19. Common bug patterns + their fixes (running list)

| Symptom | Likely cause | Fix |
|---|---|---|
| Generic "Something went wrong" Alert | err.message lost in `friendlyError`'s code-table lookup | Bypass friendlyError for plain-Error.message strings (see §5) |
| `Reservation: invalid_status` | DB function overload mismatch (see §4A) | Apply both `book_reservation` variants together |
| `amount_mismatch` 400 | Mobile sent grossed-up amount instead of base (see §2) | Send `baseAmountCents` to create-*-payment-intent |
| Hold dies in 2 min instead of 30 | Unmount cleanup cancelled the hold (see §3) | Don't cancel on unmount; let server expiry handle it |
| Split-tender Place Order silently fails | `payer_required` CHECK constraint, server returns 200 with [] rows | Populate payer info on insert (see §4B); deploy v105+ |
| Calendar add crashes app | Dev client built before expo-calendar was added | Full rebuild (see §14) |
| Sentry build error "organization ID required" | Source map upload runs on every local build | Set SENTRY_DISABLE_AUTO_UPLOAD=true (see §14) |

---

## 20. Saved feedback memories (transferable preferences)

Live at `~/.claude/projects/-Users-stevengeorgy-mobile-seatly-v2-5/memory/`. The current set:

| Memory | What it locks in |
|---|---|
| `feedback_in_repo_docs` | When the user names a doc in this repo, that IS canonical. Don't pull similarly-named docs from other repos without asking. |
| `feedback_prefer_real_automation` | Maestro is the default for "audit every button" / "verify the flow works" tasks on this RN/Expo project. Not static analysis. |
| `feedback_secret_handling` | Never commit API keys, only vault them. Keys shared in chat are context, not authorization to embed. Grep staged diffs for `AIza[A-Za-z0-9_-]{20,}` before each commit. |
| `feedback_disk_cleanup` | Pre-authorized to clear disk via terminal when df drops below ~5 GiB. Don't prompt first. |
| `feedback_friendly_error_strict` | Every error/warning Alert routes through `friendlyError()`. Never append codes to user-visible text. |
| `feedback_complete_dont_stop` | For long/resumed work, skip plan→approval→execute and run scan→execute→push→next-tier. Use subagents + background shells liberally. |
| `feedback_web_handoff_doc` | Produce `docs/WEB_APP_HANDOFF.md` for cross-surface changes (see §15). |
| `feedback_mirror_web_for_split_tender` | OBSOLETE — split-tender was removed from mobile on 2026-05-28. Memory now records the removal, kept as a historical signal. |

Future AI: read these before starting work. They encode hours of user preference.

---

## 21. What the user has said matters

- "I want everything to main" — see §1 (Branching).
- "Don't show fake numbers to real users" — drives the `isDemoModeEnabled()` gating pattern (§8).
- "Brand is Cenaiva" — flag and fix any leftover Seatly leak in user-visible surfaces (i18n strings, ICS files, support emails).
- "Don't put API keys in any code or any MD files" — every key vaulted to Supabase Secrets / EAS Secrets / gitignored `.env`.
- "Never enable `DEPOSIT_STRIPE_STUB_MODE=true` against a `sk_live_…` Stripe key" — stub fn flips `reservation_deposit_payments.status='charged'` without a real PI. Diner is "confirmed" on a free booking, restaurant eats the no-show. Stub mode is dev/staging only. Verify Supabase prod secrets has it explicitly `false` (unset defaults to `true`).
- "Not one thing should be iOS only" — see §18.
- The user reads commit messages — write descriptive ones.

---

## 22. One-page launch readiness checklist

When the user asks "are we ready to launch?":
1. `npx tsc --noEmit | grep -v "mobile-seatly-v2-2"` — clean
2. `npx jest __tests__/stripe __tests__/storage __tests__/sharing` — 22/22 pass
3. `k6 run tests/load/browse-availability.k6.js` — p95 < 12s, 0 5xx
4. Stripe key check: `grep "EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY" .env` shows `pk_live_…` (not `pk_test_…`)
5. `DEPOSIT_STRIPE_STUB_MODE` is explicitly `false` in Supabase prod secrets
6. `mcp__supabase__execute_sql` — verify no orphan `pending_payment` reservations for test diners
7. Maestro smoke: `~/.maestro/bin/maestro test .maestro/customer/booking-happy-path.yaml`
8. Consent gate test: a fresh user signing in lands on `/(auth)/consent` before `/(customer)/discover`

If all eight pass, the app is launch-ready.
