# MOBILE_STRIPE_GUIDE_ADDENDUM.md — Follow-up details

> **⚠️ UPDATE NOTICE (2026-05-21)** — Modify-reservation flow now surfaces fee disclosure inline. See [`STRIPE_UPDATES.md`](./STRIPE_UPDATES.md) and the §A2 amendment at the bottom of this addendum for the post-Option-B modify UX. The 402 `modify_requires_card` Alert in `app/booking/[restaurantId]/step2-time.tsx` now explicitly tells the diner that the additional charge will include a platform fee (5.5%) + Stripe processing fee (both non-refundable) before they add a card. The "Reservation updated" success Alerts also call out which portion will refund on cancel/seat.

Companion to `MOBILE_STRIPE_GUIDE.md`. The main guide has been shipped
to the mobile team already; this doc captures details that were
identified as gaps in the post-ship audit. Treat both docs as
authoritative — anything in this addendum supplements (does not
replace) the main guide. Section numbers here do **not** correspond
to the main guide's section numbers; this is a standalone reference.

This addendum is current as of **2026-05-20**; Option B parity update
on the modify flow shipped 2026-05-21 (see notice above).

---

## A1. The `subscription_consent_log` table (Canadian compliance)

### Why it exists

Cenaiva charges Canadian restaurants for ongoing subscription billing,
which means every card-save + every publish-confirm has to capture
**defensible consent** per:

- **PIPEDA** (Personal Information Protection and Electronic Documents Act)
- **CPA** (Consumer Protection Act — Ontario / per-province variants)
- **Quebec Bill 64** (Loi 25 / Law 25 on personal information protection)

Without an audit trail showing what disclosure copy the owner saw at
the moment they consented, a chargeback dispute or regulator inquiry
has nothing to point at. This table is that trail.

### Schema

`supabase/migrations/20260520000000_payment_method_on_file_and_publish_gate.sql:18-32`:

```sql
CREATE TABLE public.subscription_consent_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  user_profile_id uuid REFERENCES user_profiles(id),
  consent_type text NOT NULL CHECK (consent_type IN ('card_save', 'publish_trial_start')),
  disclosure_text text NOT NULL,
  amount_cents int NOT NULL DEFAULT 19999,
  currency text NOT NULL DEFAULT 'cad',
  ip_address inet,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

Indexed on `(restaurant_id, created_at DESC)`. RLS lets restaurant
owners SELECT their own rows; writes are service-role only.

### When rows get written

| Trigger | Edge fn | consent_type | disclosure_text source |
|---|---|---|---|
| Owner saves a subscription card | `save-subscription-payment-method/index.ts:253-257` | `'card_save'` | `SAVE_CARD_DISCLOSURE` from `apps/web/src/components/billing/disclosures.ts` — the text rendered above the "Save card" button |
| Owner clicks "Publish my restaurant" + confirms in modal | `publish-restaurant/index.ts:373-377` | `'publish_trial_start'` | `PUBLISH_CONFIRM_DISCLOSURE(previewTrialEndDate)` — the text in the confirmation modal, includes the actual trial-end date the owner saw |

### Mobile note

Mobile diner app **never writes to this table** (it's owner-side
only). If a future mobile owner app is built, every card-save + every
publish-confirm flow needs to insert a row with the exact disclosure
copy the mobile UI displayed at consent time — not a generic string.
The `ip_address` and `user_agent` are captured from request headers
on the edge fn side, so mobile doesn't need to pass them.

### Why disclosure_text isn't a reference

The disclosure text is stored **as a string**, not as a foreign key to
a "disclosures" template table. Reason: marketing/legal will update
the copy over time, but the consent record must reflect what the
owner actually saw at consent time. A FK would let a copy edit
retroactively change the audit record — defeats the point.

---

## A2. `modify-reservation` deposit delta flow

### When this fires

The diner's existing reservation crosses a deposit tier upward —
e.g. they originally booked a party of 4 ($0 deposit), and they
modify to a party of 8 ($80 deposit at $10/person). The system must
charge the **delta** of the new deposit minus what they already paid.

### The 402 error path

If the diner has **no saved card** on file, `modify-reservation`
returns HTTP `402 Payment Required` with body:

```json
{
  "error": "Modify requires a saved card",
  "unavailable_reason": "modify_requires_card",
  "delta_cents": <amount_owed_after_gross_up>
}
```

The 402 fires at multiple validation points in
`modify-reservation/index.ts` (lines 370-397, 538-583, 669-…) — the
edge fn re-checks the card requirement at every branch of the modify
state machine so a late-discovered party-size-up still bails cleanly.

**Mobile UX expectation:** catch 402 + `modify_requires_card` →
prompt the diner to add a card (route them to the saved-cards UI) →
re-attempt the modify after the card is saved.

### The charge path (when a card exists)

`modify-reservation/index.ts:611` creates a PaymentIntent with:

```js
{
  amount: dinerTotalCents,                  // grossed up if delta < $12
  application_fee_amount: applicationFeeCents,  // 5.5% of base delta
  customer: dinerStripeCustomerId,
  payment_method: defaultSavedCardPmId,
  confirm: true,
  off_session: true,
  metadata: {
    kind: "modify_deposit_delta",
    reservation_id,
    delta_base_cents,
    delta_processing_fee_cents,
  }
}
```

`off_session: true` means the diner isn't actively present — they
moved their reservation from the dashboard or a deep link; Stripe
charges the saved card without UI. If the issuer requires SCA,
Stripe returns `requires_action` and the modify endpoint surfaces
that back to the client with a `client_secret` for
`stripe.handleNextAction(clientSecret)`.

### Refund on party-size DOWN

If the diner shrinks their party past a tier, `modify-reservation`
issues a partial refund of the delta. Same `application_fee_amount`
retrieval pattern as `cancel-reservation` — fetches the original PI's
fee and refunds the restaurant's 94.5% slice.

### Failed delta charge

If the delta charge fails (card declined, expired, etc.), the modify
is **rolled back** — the reservation stays at its pre-modify
party_size + slot. The diner sees the original reservation unchanged
in their bookings list.

---

## A3. Complete environment variable inventory (Stripe + payments)

All edge functions read env vars via `Deno.env.get()`. Set these in
Supabase project settings (Dashboard → Project → Settings → Edge
Functions → Secrets). The `VITE_*` prefixed vars also need to be
present in the frontend `.env` (Vite picks them up at build time).

### Stripe — core

| Var | Type | Where used | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | secret (`sk_test_…` / `sk_live_…`) | Every edge fn that calls `stripe.*` | The platform-level secret. Single source of truth. |
| `VITE_STRIPE_PUBLISHABLE_KEY` | publishable (`pk_test_…` / `pk_live_…`) | Frontend Stripe Elements init | Frontend reads at build time. Mobile reads the same value via a config endpoint to avoid hardcoding. |
| `STRIPE_WEBHOOK_SECRET` | webhook signing secret (`whsec_…`) | `stripe-webhook/index.ts` | Used by `stripe.webhooks.constructEventAsync(payload, sig, secret)`. Required for signature verification. |
| `STRIPE_WEBHOOK_SECRET_PLATFORM` | webhook signing secret | `stripe-webhook/index.ts` | Separate secret for platform-level events (subscriptions, invoices) vs Connect events (account.updated, payment_intent on connected accounts). Some Cenaiva deployments use one secret for both; others split. |
| `STRIPE_SUBSCRIPTION_PRICE_ID` | Price ID (`price_…`) | `publish-restaurant/index.ts`, `create-subscription/index.ts` | **Must be Price ID, NOT Product ID.** $199.99 CAD/mo recurring. |

### Stripe — operational flags

| Var | Default | Effect |
|---|---|---|
| `ALLOW_LEGACY_CREATE_SUBSCRIPTION` | unset (treated as false) | When `true`, `create-subscription` edge fn returns success instead of 410 Gone. Emergency operator use only. |
| `DEPOSIT_STRIPE_STUB_MODE` | `true` (default for dev) | When `true`, `confirm-deposit-stub` flips deposit status to `'charged'` without a real Stripe PI. See §A6 below. |
| `CENAIVA_HOLDS_ENABLED` | unset (treated as false) | When `true`, public booking goes through `create-reservation-hold` → `convert_reservation_hold_to_reservation` RPC instead of directly to `book_reservation`. Reduces race conditions on hot slots. |

### Resend (transactional email)

| Var | Type | Where used |
|---|---|---|
| `RESEND_API_KEY` | secret (`re_…`) | `_shared/owner-notifications.ts`, `_shared/reservation-notifications.ts` |
| `RESEND_FROM_EMAIL` | email string | Defaults to `Cenaiva <hello@cenaiva.com>` in `owner-notifications.ts`; falls back to `Cenaiva <noreply@cenaiva.com>` in reservation-notifications |

Without `RESEND_API_KEY`, email sends fail-open (logged as
`failure_reason: 'resend_api_key_missing'` in
`restaurant_notification_log`). The flow doesn't break, but emails
silently don't go out.

### Twilio (transactional SMS)

| Var | Type | Notes |
|---|---|---|
| `TWILIO_ACCOUNT_SID` | account sid | Required for any SMS send |
| `TWILIO_AUTH_TOKEN` | secret | Pairs with the SID |
| `TWILIO_FROM_NUMBER` / `TWILIO_FROM_PHONE` / `TWILIO_PHONE_NUMBER` | E.164 phone | Multiple var names exist for historical reasons; check the specific edge fn for which it reads. Most use `TWILIO_FROM_NUMBER` for legacy compat. |

### Supabase platform (set automatically by Supabase, not us)

| Var | Used by |
|---|---|
| `SUPABASE_URL` | Every edge fn |
| `SUPABASE_SERVICE_ROLE_KEY` | Every edge fn for admin client (RLS-bypassing) |
| `SUPABASE_ANON_KEY` | Edge fns that need to validate user JWTs |

### Mobile-specific

Mobile needs `VITE_STRIPE_PUBLISHABLE_KEY` (or equivalent in its own
config naming) and the Supabase URL + anon key. **Never** ship
`STRIPE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` to the mobile
client.

---

## A4. Cron job inventory (Stripe + payments related)

`pg_cron` runs every job in **UTC**. Each cron calls a helper
function (`seatly_call_cron_function`) that hits the Supabase Edge
runtime over `pg_net`. Source migrations are listed.

### Stripe / payments / lifecycle crons

| Cron name | Schedule (UTC) | Edge fn called | Purpose |
|---|---|---|---|
| `cenaiva_bill_booking_fees` | `0 * * * *` (hourly) | `bill-booking-fees` | Sweeps `restaurant_booking_fees` rows with `status='pending'` into `stripe.invoiceItems.create` on the restaurant's subscription customer. Rows flip to `'billed'`. 500-row batch per run. Source: `20260519000100_pg_cron_bill_booking_fees.sql` |
| `cenaiva_cleanup_stale_onboarding_cards` | `0 4 * * *` (daily 4am UTC) | `cleanup-stale-onboarding-cards` | Detaches saved cards from unpublished restaurants where `payment_method_attached_at` is older than 90 days. First-attach timestamp wins (re-saving doesn't reset). Source: `20260520000100_pg_cron_cleanup_stale_onboarding_cards.sql` |
| `cenaiva_purge_deleted_restaurants` | `0 5 * * *` (daily 5am UTC) | `purge-deleted-restaurants` | Anonymizes restaurants where `scheduled_purge_at ≤ NOW()` (30 days after soft-delete). Nulls PII, keeps row + FKs intact for CRA 7-year retention. Source: `20260520000300_pg_cron_purge_deleted_restaurants.sql` |
| `cenaiva_notify_trial_ending` | `0 9 * * *` (daily 9am UTC) | `notify-trial-ending` | Emails owners 7 days before their 90-day trial expires. Source: `20260520000600_pg_cron_trial_ending.sql` |

### Non-Stripe crons that interact with payment data

| Cron name | Schedule (UTC) | Why mobile cares |
|---|---|---|
| `cenaiva_expire_reservation_holds` | every 5 min (`*/5 * * * *`) | Flips `reservation_holds.status='expired'` past the hold window. If mobile creates a hold via `create-reservation-hold`, it must convert within 12 minutes or the hold expires and the table goes back into availability. |
| `cenaiva_send_booking_reminder` | every 5 min | Sends 2h-before SMS reminders. Affects how mobile presents "Your reservation tomorrow at 7 PM" surfaces. |

### Time zone gotcha

All times above are **UTC**. The cron table doesn't shift for
restaurant-local time. If you're debugging "why didn't my 4am
cleanup fire at 4am Toronto time?" — answer: it fires at 4am UTC
which is midnight in Toronto. This is fine for purges/cleanups (the
data is unchanged regardless of when the row gets touched) but
matters for owner-facing emails (`notify-trial-ending` fires at 9am
UTC = 5am Toronto = before the owner is awake). Adjust the schedule
if business hours matter.

### Cron management

To pause a cron: `SELECT cron.unschedule('cenaiva_bill_booking_fees');`

To resume: re-run the migration (it's `IF NOT EXISTS` / `cron.schedule`
is idempotent on name).

To inspect: `SELECT * FROM cron.job;` for the schedule list,
`cron.job_run_details` for execution history.

---

## A5. `saved_cards` table schema (for mobile saved-card UI)

Source migration: `supabase/migrations/20260416000001_stripe_payments.sql:34-67`.

```sql
CREATE TABLE saved_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id text,
  brand text NOT NULL DEFAULT 'Visa',
  last4 text NOT NULL DEFAULT '0000',
  exp_month int,
  exp_year int,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);
```

### Field semantics

- `user_profile_id` — owns the row. RLS gates everything on this:
  diner can only see/insert/update/delete their own cards.
- `stripe_payment_method_id` — `pm_…` token on the **platform**
  Stripe Customer (not the connected restaurant). NULL in stub mode
  (when `DEPOSIT_STRIPE_STUB_MODE=true`, see §A6).
- `brand` — `Visa` / `Mastercard` / `Amex` / etc. Used for the
  `•••• 4242 Visa` chip display.
- `last4` — last 4 digits of the card. Display only — never used as
  a security signal.
- `exp_month` / `exp_year` — for the "expired" indicator. Mobile
  should grey out cards where `(exp_year, exp_month) < (current
  year, current month)` and prompt to re-save before booking.
- `is_default` — there should be **exactly one** `is_default=true`
  row per `user_profile_id` at any time. Mobile shouldn't enforce
  this client-side; let the backend manage it. The `stripe-attach-
  payment-method` edge fn flips the new card to default and clears
  the others.

### RLS policies

Four policies (SELECT / INSERT / UPDATE / DELETE), all gated on
`user_profile_id IN (SELECT id FROM user_profiles WHERE auth_user_id
= auth.uid())`. Service-role bypasses RLS, so edge fns can manage
cards on behalf of users.

### How mobile reads it

```typescript
const { data, error } = await supabase
  .from("saved_cards")
  .select("id, brand, last4, exp_month, exp_year, is_default, stripe_payment_method_id")
  .order("is_default", { ascending: false })
  .order("created_at", { ascending: false });
```

The `stripe_payment_method_id` is what mobile passes to
`create-public-payment-intent` as `saved_card_id` to use a previously-
saved card.

### How mobile deletes a card

**Order matters.** Always call `stripe-detach-method` first, then
delete the DB row:

```typescript
// 1. Stripe-side detach (may fail on a transient Stripe error)
await supabase.functions.invoke("stripe-detach-method", {
  body: { saved_card_id: card.id },
});
// 2. DB row delete (only after Stripe detach succeeds — the edge fn
// already handles the DB delete, so mobile usually just calls (1)
// and the row disappears).
```

If you reverse the order (DB delete first) and Stripe detach fails,
the card is orphaned on Stripe — diner gets charged on a "deleted"
card the next time they book. This was a real bug fixed 2026-05-20;
mobile should mirror the order strictly.

### account_merge — cards survive

When a diner signs in via a new identity (Apple → Google switch) and
hits `merge-accounts`, their saved_cards rows are re-pointed to the
canonical profile id. Audit row in `merge_audit_log` records
`merged_count_saved_cards`. Mobile doesn't need to handle this
explicitly — the rows just show up under the canonical profile.

---

## A6. Deposit stub mode (`DEPOSIT_STRIPE_STUB_MODE`)

### What it is

A dev/test path that lets deposit flows complete **without minting a
real Stripe PaymentIntent**. Useful when:

- Running locally without `STRIPE_SECRET_KEY` set
- E2E tests that need to walk the booking-confirm flow without
  hitting Stripe's API
- Demo bookings (Mark Testing, Onboarding Test Pizza, etc.)

### How to enable

Set the env var:

```
DEPOSIT_STRIPE_STUB_MODE=true
```

Default is `true` if unset (see `confirm-deposit-stub/index.ts:58`:
`(Deno.env.get("DEPOSIT_STRIPE_STUB_MODE") ?? "true").toLowerCase() !== "false"`).

To disable (force real Stripe): set to `false` explicitly.

### What stub mode does

The stub `confirm-deposit-stub` edge fn:

1. Skips `stripe.paymentIntents.confirm()`.
2. Flips `reservation_deposit_payments.status` to `'charged'`
   **without** setting `stripe_payment_intent_id`. The row gets
   `paid_at = NOW()` and `stripe_payment_intent_id = NULL`.
3. The settle trigger then flips the parent reservation to
   `'confirmed'` once all deposit rows for that reservation are
   `'charged'`. (The trigger doesn't care whether the PI was real.)

### How cancellation handles stub-mode rows

`cancel-reservation/index.ts:355-385` has a dedicated sweep for
stub-mode deposit rows. It runs **before** the real-PI refund loop:

```sql
SELECT id, amount_cents FROM reservation_deposit_payments
WHERE reservation_id = $1
  AND status = 'charged'
  AND stripe_payment_intent_id IS NULL;
```

Those rows get flipped to `'refunded'` in the DB directly (no Stripe
call, no money to refund). The cancel response surfaces them as
`refund_outcomes` with `kind: "deposit", ok: true, payment_intent_id:
null` so the UI still shows "Refunded $X" — diner can't tell whether
the original deposit was real or stub.

### **CRITICAL: never enable stub mode in production**

When `DEPOSIT_STRIPE_STUB_MODE=true` on a production Stripe key, the
restaurant **collects deposits in the UI** but no money moves. The
reservation gets confirmed, the diner thinks they paid, and the
restaurant is on the hook for a no-show without a deposit safety
net. **Always set `DEPOSIT_STRIPE_STUB_MODE=false` in Supabase
production project secrets.** Dev/staging projects can leave it on.

### Mobile note

Mobile sees the **same response shape** from `confirm-deposit-paid`
regardless of stub mode (success / fail). Mobile doesn't need a
stub-mode awareness flag — the backend hides it. The only mobile-
visible side effect: when running against a stub-mode backend, the
`reservation_deposit_payments.stripe_payment_intent_id` field on
read-back will be `null`. If mobile uses this for some downstream
display (e.g. "Receipt PI #pi_XXX"), it should gracefully handle
null.

---

## Cross-reference back to the main guide

This addendum supplements the existing sections of
`MOBILE_STRIPE_GUIDE.md` as follows:

| Addendum section | Main-guide section it expands |
|---|---|
| A1 `subscription_consent_log` | §11b Part B (subscription card flow) — adds the consent audit trail story |
| A2 `modify-reservation` delta | §9 (edge fn API reference) — adds the full payment delta flow |
| A3 Env vars | §11f operational notes — adds the complete inventory |
| A4 Cron inventory | §11f operational notes + scattered references — single source of truth |
| A5 `saved_cards` table | §12 (DB schema) — fills in the missing table |
| A6 Stub mode | §6 (cancellation flow) + §11f operational notes — formalizes the dev path |

If anything here conflicts with the main guide, this addendum is
newer; treat code as the final source of truth.

---

## A7. Option B (3-line fee disclosure) parity — 2026-05-21

### Why this amendment exists

On 2026-05-21 the web app shipped **Option B** — every diner-facing
checkout surface now itemizes three lines (Deposit base · Platform fee
5.5% · Processing fee gross-up) and discloses that the fees are
non-refundable, with the deposit base fully refundable when the
restaurant marks the diner seated. Full backend + math spec in
[`STRIPE_UPDATES.md`](./STRIPE_UPDATES.md).

The mobile app's fee math (`lib/stripe/stripeFee.ts:computeDinerCharge`)
was already correct (matches the web formula, 12 boundary unit tests
pass). What was missing was the **UI surfaces** rendering the new
itemization + disclosure copy. This amendment lists every mobile change
shipped 2026-05-21 to bring mobile to parity.

### A7a. UI surfaces updated

| File | Change |
|---|---|
| `app/booking/[restaurantId]/step6-payment.tsx` | Replaced the muted "[Cenaiva service fee] (included)" line with a bold standalone "Platform fee (5.5%)" row. Cart order: Pre-Order Subtotal → Deposit → Platform fee → Tax → Processing fee → Total. New disclosure copy at the bottom uses `booking.feeDisclosureV2` (interpolates the deposit amount). |
| `app/(customer)/orders/pay/[orderId].tsx` (post-meal pay-the-bill) | Inserted "Platform fee (5.5%)" line after Tip, before Processing fee. Replaced the old "Small-charge processing fee…" footnote with "Platform fee covers Cenaiva's marketplace cost. Processing fee covers Stripe's per-transaction charge. Both are non-refundable." |
| `components/booking/SplitTenderCheckout.tsx` | Per-payer share summary now shows 3 stacked rows (Deposit base · Platform fee · Processing fee) summed to the total on the right, plus the same disclosure line as step6 if a deposit exists. |
| `app/booking/[restaurantId]/step2-time.tsx` (modify-reservation 402 branch) | Alert body now explicitly tells the diner the additional charge includes a non-refundable Cenaiva platform fee (5.5%) + Stripe processing fee, before they add a card. |
| `app/booking/[restaurantId]/step2-time.tsx` (modify-reservation success branches) | "Charged" + "Refunded" Alerts now call out which portion is the deposit base (refunds on seat/cancel) vs the fees (non-refundable). |
| `app/(customer)/bookings/[id].tsx` (cancel confirmation Alert) | Refund line clarifies that the deposit BASE refunds within 5 business days, while the platform fee (5.5%) + Stripe processing fee paid at booking are non-refundable (with the explicit "disclosed at checkout" reminder). |

### A7b. i18n keys added (en + fr)

```ts
booking.platformFeeLabel
booking.feeDisclosureV2          // interpolates {{depositAmount}}
booking.payTheBillFeeNote
booking.modifyFeePreviewTitle
booking.modifyFeePreviewBody     // interpolates {{newBase}}, {{deltaTotal}}, {{deltaPlatform}}, {{deltaProcessing}}
booking.modifyNoCardPreviewBody  // interpolates {{newBase}}
booking.cancelRefundNote         // interpolates {{baseRefund}}, {{platformFee}}, {{processingFee}}
```

The older keys (`serviceFeeLine`, `serviceFeeIncluded`,
`serviceFeeInlineNote`, `serviceFeeNote`) are retained for any callers
not yet migrated (pre-order-only flows where there's no deposit refund
to disclose).

### A7c. NOT changed

- `lib/stripe/stripeFee.ts:computeDinerCharge` — math is correct.
- `__tests__/stripe/stripeFee.test.ts` — boundary tests are correct.
- Edge functions in `supabase/functions/_shared/stripe-fee.ts` +
  `_shared/refund-math.ts` — backend is shared with web; nothing to
  change.
- Cancel API call path — only the confirmation Alert copy changed; the
  underlying `cancelReservationByIdAsync` is the same.

### A7d. Verification checklist

When verifying the new copy on a build, walk:
1. **Booking with deposit** → step6 shows 3 line items + Option B
   disclosure ("Platform and processing fees are non-refundable. Your
   CA$X.XX deposit is fully refundable when the restaurant marks you
   seated.").
2. **Post-meal pay-the-bill** → 3 line items + new footnote.
3. **Split-tender booking** → per-payer share shows 3-line breakdown.
4. **Modify reservation upward without saved card** → 402 Alert explicitly
   mentions platform + processing fees non-refundable.
5. **Cancel a charged-deposit booking** → Alert clarifies base refunds in
   5 business days, fees non-refundable.
