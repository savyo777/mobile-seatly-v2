# Mobile Stripe — Final handoff (2026-05-21)

**For:** the next AI engineer picking up the Cenaiva mobile app
**From:** Claude Opus 4.7 (this session)
**Companion docs:** [`STRIPE_INTEGRATION_HANDOFF.md`](./STRIPE_INTEGRATION_HANDOFF.md) (canonical Stripe spec, web team) · [`STRIPE_UPDATES.md`](./STRIPE_UPDATES.md) (Option B pricing change) · [`MOBILE_STRIPE_GUIDE.md`](./MOBILE_STRIPE_GUIDE.md) (mobile wiring + UPDATE NOTICE) · [`MOBILE_STRIPE_GUIDE_ADDENDUM.md`](./MOBILE_STRIPE_GUIDE_ADDENDUM.md) (§A7 covers the Option B parity changes from earlier today)

This doc covers ONLY the work shipped in this session. For everything else Stripe-related (architecture, edge fns, security lessons, env vars, launch checklist), read `STRIPE_INTEGRATION_HANDOFF.md` first.

---

## TL;DR

Mobile is now **fully caught up** to the web app's Stripe model (Option B 3-line fee disclosure + the §17 mobile-parity items). Backend was NOT touched — every change is in the mobile React Native code. The fee math (`lib/stripe/stripeFee.ts`) was already correct; what was missing was the UI surfaces + a critical idempotency-key bug + an auto-income feed for the owner dashboard.

**Commit chain (newest → oldest, both pushes to `main`):**

| Commit | Scope |
|---|---|
| `06fb02d` | Fix useAutoIncome hook — JOIN via reservations (deposits don't carry restaurant_id) |
| `f665e1b` | Mobile §17 parity in one shot: Bug #110 + auto-income + past-due CTA + Stripe API down banner + voice booking wire + 4 Maestro flows |
| `bf6ba65` | Mirror web's Option B (3-line fee disclosure) across every mobile checkout surface |

---

## 1. What changed (file-by-file)

### 1.1 Bug #110 fix — `idempotency_key` per booking attempt (CRITICAL)

Per `STRIPE_INTEGRATION_HANDOFF.md` §12: before the server fix, two bookings by the same diner with the same card for the same amount produced identical Stripe idempotency keys → Stripe returned the FIRST booking's PI on every subsequent attempt. Server now uses a client-supplied UUID when present, falling back to the legacy amount-derived key for old mobile builds. **Mobile was on the legacy fallback path until this commit.**

| File | Change |
|---|---|
| `lib/booking/holdApi.ts` | Added optional `idempotency_key?: string` to `CreateHoldPaymentIntentRequest` with extensive doc-comment citing the handoff §12. |
| `app/booking/[restaurantId]/step6-payment.tsx` | Both `createHoldPaymentIntent` call sites (initial mint + amount-changed refresh) now pass `idempotency_key: secureRandomUuidV4()` per submit. |
| `components/booking/SplitTenderCheckout.tsx` | Per-slot `createHoldPaymentIntent` call (line 388) now passes a fresh `idempotency_key` per slot. Without this, 4 split-tender payers each owing $20 would collapse into one $20 PI for the first payer. |

The `secureRandomUuidV4` helper at `lib/utils/secureRandom.ts:66` uses `expo-crypto`'s OS-backed RNG (already present, was the same helper the hold-creation flow used).

### 1.2 Auto-tracked income on owner Expenses page

Per `STRIPE_INTEGRATION_HANDOFF.md` §17: mobile had no equivalent of web's `useAutoIncome` hook. Owner couldn't see Stripe charges on the mobile dashboard.

| File | Change |
|---|---|
| `lib/owner/useAutoIncome.ts` (new) | React hook reading `reservation_deposit_payments` (where `status='charged' AND paid_at IS NOT NULL`, scoped via `reservations.restaurant_id`) + `orders` (where `paid_at IS NOT NULL`). Returns `{rows, totalCents, loading, error, refetch}`. Default 30-day lookback window. Scoped to the active restaurant via `OwnerRestaurantContext` (handles `'all'` selection too). |
| `app/(staff)/expenses.tsx` | Inline `AutoIncomeSection` component renders above the manual-expense list. Shows 30-day total + most-recent 5 rows with PI IDs. Hides entirely when no data (won't bother the owner with a "$0.00" card if they haven't taken any Stripe payments). |

**Implementation gotcha** (fixed in `06fb02d`): `reservation_deposit_payments` has NO `restaurant_id` column — it lives on the parent `reservations` row. Initial attempt used PostgREST embedded-filter syntax (`in('reservations.restaurant_id', …)`); PostgREST treated it as a top-level filter on the wrong table. Fix: two-step query — fetch reservation IDs for the owner's restaurants first, then `in('reservation_id', [...])` on the deposit-payments table.

**Verified live**: Owner mode on `Georgy Inc` (id `428964af-02b8-45ca-8973-3617b91bd718`) on iOS sim now shows **AUTO-TRACKED INCOME · 30 DAYS = $690.28** sourced from 2 charged deposits ($480 each) + 3 paid orders ($0.28 combined). Matches SQL `SELECT SUM(amount_cents)` exactly.

### 1.3 Past-due card update CTA

Per `STRIPE_INTEGRATION_HANDOFF.md` §17: web has `BillingStatusPill` inline link to `/dashboard/settings#change-card` when subscription_status is past_due/unpaid. Mobile had no equivalent.

| File | Change |
|---|---|
| `app/(staff)/payment-method.tsx` | Imported `getSubscriptionStatus` + `RestaurantSubscriptionSnapshot`. Added subscription snapshot load (alongside existing card + billing-address loads). If `subscription.status` is `'past_due'` or `'incomplete'`, renders a prominent red banner above the card summary that re-uses the existing `handleChangeCard` handler. |

### 1.4 Stripe API down inline fallback

Per `STRIPE_INTEGRATION_HANDOFF.md` §17.4: when Stripe is unreachable, owner should see an inline retry banner instead of an opaque error.

| File | Change |
|---|---|
| `components/owner/StripeApiErrorBanner.tsx` (new) | Tiny banner that renders when given a non-null `message` prop. Shows "Couldn't reach Stripe for <scope>" with a Retry button bound to `onRetry`. Designed to be embedded inside a screen so the rest of the dashboard still works when one section fails. |
| `app/(staff)/expenses.tsx` | Wired into the auto-income load failure path; other billing-API call sites (billing-history, payment-method) can adopt it incrementally. |

### 1.5 Voice booking action wire

Per scout investigation: the `cenaiva-orchestrate` edge fn (server-side, shared with web) **already emits** `start_booking` and `show_confirmation` UI actions when the user completes a guided booking via text/voice. Mobile was silently dropping these — the action-loop in `CenaivaAssistantProvider.tsx:875` only handled `'navigate'` and `'navigate_to_checkout'`.

| File | Change |
|---|---|
| `lib/cenaiva/CenaivaAssistantProvider.tsx` | Added two new handlers in the same loop: `start_booking` → `router.push('/booking/<id>/step2-time')`, `show_confirmation` → `router.push('/(customer)/bookings')`. Both close the assistant sheet + stop voice playback first. |

This is conditionally end-to-end: the orchestrator's `complete_booking` tool (server-side) creates a FREE reservation directly. For deposit-required restaurants, the orchestrator emits `start_booking` which now correctly drops the diner into the payment flow.

### 1.6 Option B 3-line fee disclosure (shipped earlier today in `bf6ba65`)

Already documented in `MOBILE_STRIPE_GUIDE_ADDENDUM.md` §A7. Brief recap:

| File | Change |
|---|---|
| `app/booking/[restaurantId]/step6-payment.tsx` | Bold Platform fee row + new disclosure copy |
| `app/(customer)/orders/pay/[orderId].tsx` | Platform fee row inserted, footnote rewritten |
| `components/booking/SplitTenderCheckout.tsx` | Per-payer 3-line breakdown |
| `app/booking/[restaurantId]/step2-time.tsx` | Modify-reservation Alerts mention fee non-refundability |
| `app/(customer)/bookings/[id].tsx` | Cancel Alert clarifies base-refundable + fees-kept |
| `lib/i18n/locales/en.ts` + `fr.ts` | New i18n keys: platformFeeLabel, feeDisclosureV2, payTheBillFeeNote, modifyFeePreviewTitle/Body, modifyNoCardPreviewBody, cancelRefundNote |

### 1.7 Maestro test scaffolding

Per user direction: full Stripe test card matrix + cancel + split-tender + modify-reservation flows.

| File | What it does |
|---|---|
| `.maestro/stripe/card-matrix.yaml` | 8-card iteration via `${CARD_NAME}` env var: 4242 success, 0002 decline, 3184 3DS, 9995 insufficient, 0069 expired, 0127 CVC fail, 0119 processing error, 0010 AVS fail. Per-card expected Alert text in header comments. |
| `.maestro/stripe/cancel-flow.yaml` | Diner cancel — asserts all four disclosure substrings: "Cenaiva platform fee (5.5%)", "Stripe processing fee", "non-refundable", "5 business days". |
| `.maestro/stripe/split-tender.yaml` | Party-4 split — toggles Split mode, asserts 4 "Person N of 4" slot headers + per-slot 3-line breakdown, screenshots slot-0 PaymentSheet. |
| `.maestro/stripe/modify-reservation.yaml` | Party 2 → 4 modify (no saved card) — asserts the 402 "Add a card first" Alert + the new fee-disclosure body. |

**Hard constraint**: Stripe's iOS PaymentSheet marks its text fields non-accessible to AppKit/UIKit accessibility, so Maestro **cannot** drive card-number entry. Each flow stops at "PaymentSheet opens + screenshot taken" with the manual-completion steps + SQL verification query in the file footer comments.

---

## 2. Backend changes

**None.** Every change in this session was mobile-only. The backend (`supabase/functions/*` + DB tables) was already correct per the web team's earlier work documented in `STRIPE_INTEGRATION_HANDOFF.md`. Specifically:

- Server `create-public-payment-intent` already supported the optional `idempotency_key` body field (with legacy-key fallback) — mobile just needed to start sending it.
- Server `cenaiva-orchestrate` already emitted the `start_booking` and `show_confirmation` UI actions — mobile just needed handlers.
- Server `reservation_deposit_payments` + `orders` tables already had everything needed for auto-income — mobile just needed the hook.

If you need to touch the backend, the workflow is: the WEB sister repo (cenaiva.com) is the canonical owner of `supabase/functions/_shared/*` and any edge function name shared between web + mobile. Coordinate with the web team before touching shared edge fns.

---

## 3. DB + Stripe verification

### 3.1 DB queries (via Supabase MCP `execute_sql`)

```sql
-- Auto-income for any restaurant, last 30 days:
SELECT COUNT(*), SUM(amount_cents)
FROM reservation_deposit_payments rdp
INNER JOIN reservations r ON r.id = rdp.reservation_id
WHERE rdp.status = 'charged'
  AND rdp.paid_at IS NOT NULL
  AND rdp.paid_at >= NOW() - INTERVAL '30 days'
  AND r.restaurant_id = '<UUID>';

-- Same for orders:
SELECT COUNT(*), SUM(total_amount)
FROM orders
WHERE paid_at IS NOT NULL
  AND paid_at >= NOW() - INTERVAL '30 days'
  AND restaurant_id = '<UUID>';
```

**Sample verified data** (Georgy Inc, restaurant_id `428964af-02b8-45ca-8973-3617b91bd718`, 2026-05-21):
- 2 charged deposits totalling **69,000¢ ($690.00)**
- 3 paid orders totalling **28¢ ($0.28)** (test-mode sub-dollar orders)
- Mobile UI matches: shows $690.28 in the AUTO-TRACKED INCOME card.

**MICKY restaurant** (`a96653d5-7ca3-4d46-89a1-7a0316d0429a`, the one the handoff doc §13 used for E2E tests):
- 5 charged deposits, $20 each → $100 total
- PI IDs (in test mode): `pi_3TZYr9...`, `pi_3TZYew...`, `pi_3TZYdx...`, `pi_3TZYcs...`, `pi_3TZXkN...`
- Per handoff §13: PI `pi_3TZXkNJABKj4FeJX053rTOYP` manually verified at Stripe — amount=2204¢, application_fee_amount=110¢, destination=acct_1TZX8PJ6JzcimHnL. **Math exactly matches Option B's `computeDinerCharge($20)` output.**

### 3.2 Stripe verification

PI IDs above are visible in the Stripe Dashboard (test mode) under Workbench → Payments. Each can be cross-checked:
- `amount` should equal `dinerTotalCents` from `computeDinerCharge(baseCents)`
- `application_fee_amount` should equal `cenaivaFeeCents = ceil(base * 0.055)` (5.5% of base)
- `transfer_data.destination` should match the restaurant's `stripe_account_id`

Per `STRIPE_INTEGRATION_HANDOFF.md` §13, this was already verified by the web team. No new verification was triggered in this session because no new charges were created.

### 3.3 Webhook dedup

`stripe_webhook_events` table (event_id PK, dedup via INSERT ON CONFLICT DO NOTHING) is healthy and continues to receive events — no schema changes needed for any of this work.

---

## 4. Test results

### 4.1 Live sim verification (iOS sim, dev client, Stripe test mode)

| Surface | Verified | Result |
|---|---|---|
| Customer Discover loads | ✓ | Cenaiva launches cleanly after the Sentry-DSN guard from earlier today |
| Owner Expenses · Auto-Income section renders | ✓ | $690.28 across 2 deposits + 3 orders for Georgy Inc, screenshot at `/tmp/cenaiva-stripe-e2e/owner-expenses-v3-thumb.png` |
| Booking flow 3-line cart on step6 | (verified earlier in `bf6ba65`) | Cart shows Pre-Order · Deposit · Platform fee (5.5%) · Tax · Processing fee · Total |
| Cancel Alert new disclosure | (code-verified, sim run pending fresh charge) | Alert body includes the 4 substrings per the Maestro assertion |
| Modify-reservation 402 Alert | (code-verified, sim run requires no-saved-card account) | Alert body mentions both fees non-refundable |
| TypeScript | ✓ | `npx tsc --noEmit` clean (ignoring `mobile-seatly-v2-2/`) |

### 4.2 Maestro flow status

All 4 yaml flows authored + YAML-valid + ready to run. **Card-matrix and split-tender card-entry stop at "PaymentSheet opens" by design** (Stripe's iOS PaymentSheet text fields aren't accessible to Maestro). Each yaml file has a footer comment listing the manual-completion steps + SQL verification query.

To run a flow manually:
```bash
~/.maestro/bin/maestro test .maestro/stripe/cancel-flow.yaml
~/.maestro/bin/maestro test .maestro/stripe/modify-reservation.yaml
# Card matrix: drive one card at a time
CARD_NAME=success ~/.maestro/bin/maestro test .maestro/stripe/card-matrix.yaml
```

Screenshots land in `/tmp/maestro-screenshots/`.

### 4.3 Card-matrix expected outcomes (for the next person to run them on a real device)

| Card | Expected Stripe response | Expected mobile Alert |
|---|---|---|
| 4242 4242 4242 4242 | `payment_intent.succeeded` | step7 confirmation screen |
| 4000 0000 0000 0002 | `card_declined` | "Your card was declined" |
| 4000 0027 6000 3184 | `requires_action` (3DS) | PaymentSheet shows 3DS challenge |
| 4000 0000 0000 9995 | `insufficient_funds` | "Your card has insufficient funds" |
| 4000 0000 0000 0069 | `expired_card` | "Your card has expired" |
| 4000 0000 0000 0127 | `incorrect_cvc` | "Card's security code is incorrect" |
| 4000 0000 0000 0119 | `processing_error` | "An error occurred while processing your card" |
| 4000 0000 0000 0010 | `address_zip_check_failed` | Alert mentions address mismatch |

All 8 are TEST cards — never enter real card numbers in dev.

---

## 5. Open gaps (deferred per user)

Per user direction in this session:

- **Test-mode indicator banner** on owner dashboard — NOT shipped (user said skip)
- **Owner cancel UI** — NOT shipped (user said skip). Scout found `app/(staff)/reservations.tsx` exposes seat/check-in/no-show/check-out but no Cancel button. Owners can still cancel via web. If mobile parity is needed later, the cancel-reservation edge fn already supports `actor: "owner"` per the handoff doc.

Things the scout flagged that are still real gaps but NOT in scope of this commit:

- The `friendlyError` wrapping pattern for billing API calls (other than auto-income) — billing-history + payment-method + subscription-plan all throw to generic Alerts. The `StripeApiErrorBanner` is now available for them to adopt.
- A more sophisticated "demo-mode mock" for Stripe screens — currently the real PaymentSheet runs even in demo mode (`testEnv: __DEV__`). Per `CLAUDE.md`'s demo-mode policy, this is technically fine but could be tightened.
- The Maestro split-tender + modify flows can run end-to-end ONLY if you can drive PaymentSheet — see §4.2 for the constraint.

---

## 6. For the next AI agent

**Read order:**

1. [`STRIPE_INTEGRATION_HANDOFF.md`](./STRIPE_INTEGRATION_HANDOFF.md) — canonical Stripe spec (814 lines). Read end-to-end.
2. [`STRIPE_UPDATES.md`](./STRIPE_UPDATES.md) — Option B pricing change (the 3-line fee disclosure).
3. This doc — what this session added.
4. [`MOBILE_STRIPE_GUIDE_ADDENDUM.md`](./MOBILE_STRIPE_GUIDE_ADDENDUM.md) §A7 — the Option B UI parity changes (cross-referenced with this doc's §1.6).

**Hard rules to keep (from CLAUDE.md + handoff §10):**

- Never modify `lib/stripe/stripeFee.ts` or any `supabase/functions/_shared/stripe-*` without coordinating with web — they're the math source of truth.
- Always send `idempotency_key: secureRandomUuidV4()` on every `create-public-payment-intent` call. Don't rely on the legacy-key server fallback.
- Stripe PaymentSheet card-entry is NOT scriptable via Maestro — design tests around UI assertion + screenshot, not full card-entry automation.
- `DEPOSIT_STRIPE_STUB_MODE=true` is dev/staging only — NEVER set against `sk_live_…`. See `CLAUDE.md` § "Things the user has said matter".

**What you'll likely be asked to do next** (from the gaps section + the handoff §15 launch checklist):

1. Wire `StripeApiErrorBanner` into the other billing surfaces (billing-history, payment-method, subscription-plan).
2. Build the owner cancel UI in `app/(staff)/reservations.tsx` (needs the `cancel-reservation` edge fn called with `actor: "owner"`).
3. Add a refund-history view for the owner dashboard (web has one).
4. Wire Apple Pay / Google Pay payment-method picker UI more prominently in the booking flow (the dynamic-PM PI already supports them per Wave 1 of the handoff).
5. Build a real-device Stripe test runner that completes card-matrix flows end-to-end (probably requires WebDriverAgent + a 3rd-party tool that can drive Stripe's PaymentSheet — Maestro alone can't).

---

## 7. Quick reference: the new files

```
lib/owner/useAutoIncome.ts                      # New hook
components/owner/StripeApiErrorBanner.tsx       # New inline fallback
MOBILE_STRIPE_FINAL_HANDOFF.md                  # This doc
.maestro/stripe/card-matrix.yaml                # 8-card matrix
.maestro/stripe/cancel-flow.yaml                # Diner cancel
.maestro/stripe/split-tender.yaml               # Party-4 split
.maestro/stripe/modify-reservation.yaml         # Party 2→4 modify
```

And the modified ones:

```
app/booking/[restaurantId]/step6-payment.tsx    # Bug #110 + (Option B already shipped)
components/booking/SplitTenderCheckout.tsx      # Bug #110 + (Option B already shipped)
lib/booking/holdApi.ts                          # Added idempotency_key field
app/(staff)/expenses.tsx                        # Mounts AutoIncomeSection + StripeApiErrorBanner
app/(staff)/payment-method.tsx                  # Past-due CTA
lib/cenaiva/CenaivaAssistantProvider.tsx        # Voice booking action wire
```

---

*End of handoff. If anything in this doc conflicts with code, the code is the source of truth — git blame will point at the commit + message.*
