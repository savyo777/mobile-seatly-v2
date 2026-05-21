# Cenaiva Web Sister-Repo Handoff — ToS Audit + Phase 3 Builds

**Audience**: Cenaiva web team lead.
**Created**: 2026-05-21 by mobile team.
**Status**: Mobile shipped Phase 1 (ToS edits) + Phase 2 (small code fixes) + Phase 4 (TOS_COVERAGE.md). Web team needs to mirror.

---

## Context

The mobile team ran a full audit of the Cenaiva consumer Terms of Service against the actual app's functionality on 2026-05-21. We found **16 over-claims, 5 mismatches, 20 confirmed**. After the user reviewed each over-claim and made per-claim decisions, we shipped the trimmed/reworded ToS to the mobile app and queued Phase 3 builds for the genuinely-missing features the user wants to keep claiming.

Mobile + web share:
- The same Supabase project (`exbjodmnpdiayfzrdyux`)
- The same Stripe Connect setup
- The same legal text (or should — see Phase 1 row below)
- The same diner-side functionality model

This handoff doc tells the web team exactly what to mirror so behavior stays consistent across surfaces. **Sign off each row when your side ships.**

---

## Coordination notes (read first)

- **Shared DB project**: `exbjodmnpdiayfzrdyux`. Mobile applies migrations via Supabase MCP. Web should `supabase db pull` and verify reads/writes use the latest schema before deploying.
- **Shared edge functions**: most fns serve both mobile + web (e.g. `create-public-booking`, `prepare-deposit`, `refund-payment-intent`). When you deploy a fn with the same `name`, agree on which side owns the canonical code. Mobile team is pre-authorized to deploy on the prod project. Coordinate on Slack before redeploying anything shared.
- **ToS text**: should ideally live in one shared source of truth (recommend a `legal/terms-of-service.md` in a future shared repo, rendered by both clients). For now, mobile + web maintain parallel copies and **must sync on every edit**. Last-Updated dates must match across mobile + web on the same calendar day.
- **Privacy Policy**: lives at `cenaiva.com/privacy` (web team owns canonical content). The mobile ToS references it via §23. Privacy Policy audit is OUT OF SCOPE this session — recommend parallel audit by web team since the same PostHog/Vercel/account-merge over-claims likely apply.

---

## Per-item handoff

For each row: **DB** lists shared DB tables/columns. **Backend** lists shared Supabase edge functions. **Frontend** lists what web mirrors. **Sign-off** column for web lead to check.

### Phase 1 — ToS text edits (mobile shipped 2026-05-21)

| Item | Mobile change | DB | Backend | Frontend (web) | Sign-off |
|---|---|---|---|---|---|
| 1.1 | Replaced 6-section stub with full 39-section ToS at `app/(customer)/profile/legal/terms.tsx`. Cut: §10 Wallet, §11.4 Gift Cards, §6.5 Voice Deletion, §2 account-merge paragraph, §20 Vercel. Reworded: §4.4 Group Deposit (now describes one-device split-tender), §6.1 Voice retention (in-flight, not stored), §6.3 AI quality monitoring (future), §6.4 + §4.5 auto-tagging/LTV (future). Kept: §9, §8.4, §9.3, §11.5 (now §10.4) Events, §15 SMS, §18 Data Rights, §19 PostHog. | none | none | **Mirror identical text changes in your web ToS render path. Bump "Last Updated" date in sync (currently `May 21, 2026`).** Section renumbering: old §11.4 Gift Cards is GONE; old §11.5 Events became §10.4; survives-termination list in §31 updated. | ☐ |

### Phase 2 — small code fixes (mobile shipped 2026-05-21)

| Item | Mobile change | DB | Backend | Frontend (web) | Sign-off |
|---|---|---|---|---|---|
| 2a | Removed `locationAlwaysAndWhenInUsePermission` from `app.json:114`. ToS §14 commits to "when-in-use only"; the over-permission entry violated that. | none | none | **N/A** — web doesn't use Expo location plugins the same way. If web requests browser geolocation, confirm you're not requesting `permission: 'persistent'` or similar. | ☐ |
| 2b | New `lib/billing/canadianTax.ts` centralizes province → tax-label map (HST/GST/GST+PST/GST+QST). Wired into `app/booking/[restaurantId]/step6-payment.tsx` so the checkout breakdown shows e.g. "HST (13%)" for Ontario instead of generic "Tax". | none | none | **Adopt the same mapper in your web checkout.** Recommend copying `lib/billing/canadianTax.ts` verbatim into the web repo (or extract to a shared package). Required for ToS §10.1 "GST/HST/QST/PST as indicated at checkout" claim. | ☐ |
| 2c | Added refund-disclosure one-liner on cancel-confirmation Alert in `app/(customer)/bookings/[id].tsx`: "If the deposit was charged, the refund is issued to your original card and will appear on your statement within 5 business days." Only shown when `liveDepositStatus === 'charged'`. | none | none | **Add same disclosure** on web booking-detail cancel flow. Same condition: only when deposit is charged. | ☐ |

### Phase 3 — builds (mobile sprint queue; coordinate on each)

| Build | What ships | DB | Backend (edge fns) | Frontend (web mirror) | Sign-off |
|---|---|---|---|---|---|
| **3a — SMS STOP/HELP webhook (TCPA)** | New `supabase/functions/twilio-incoming-sms/index.ts` parses inbound SMS, matches STOP/UNSUBSCRIBE/HELP, sets `user_profiles.sms_opt_out=true`, replies with HELP info. | New column `user_profiles.sms_opt_out BOOLEAN NOT NULL DEFAULT false`. Migration `<ts>_user_profiles_sms_opt_out.sql`. | New fn `twilio-incoming-sms` (Twilio webhook). All existing SMS-send paths (`supabase/functions/_shared/sms.ts`) gate on `sms_opt_out`. | **Web's SMS-send paths must also gate on `sms_opt_out`**. The Twilio inbound webhook is shared (one endpoint serves both). Mobile team will register the URL in Twilio console. | ☐ |
| **3b — Self-service data export (PIPEDA/Law 25)** | New `supabase/functions/export-my-data/index.ts` gathers all user_id rows from canonical tables, produces JSON, uploads to Supabase Storage (24h TTL), emails the link via Resend. New `app/(customer)/profile/privacy/download-data.tsx` button. | Uses existing tables; signed Storage URLs (TTL 24h). | New fn `export-my-data`. Rate-limited 1/24h via `_shared/cenaiva-limits.ts`. | **Add "Download my data" button to your web profile/privacy page** that calls the same edge fn. Same email-link UX. | ☐ |
| **3c — In-app refund request** | New `app/(customer)/profile/bookings/[id]/request-refund.tsx` form (reason picker + free text). New `supabase/functions/request-refund/index.ts` posts to new `refund_requests` table + queues support@cenaiva.com email. Auto-issue for duplicate-PI cases via existing `refund-payment-intent`. | New table `refund_requests` (id, user_id, reservation_id, payment_intent_id, reason_code, reason_text, status, created_at). | New fn `request-refund`. Reuses existing `refund-payment-intent` for auto-cases. | **Add refund-request form to web booking pages** that posts to the same fn. Same reason picker / free-text shape. | ☐ |
| **3d — Profile-tags review UI** | New `app/(customer)/profile/privacy/profile-tags.tsx` shows diner's auto-tags + no-show risk + LTV (empty until scoring engine ships per §6.4). Correction-request form posts to support queue. | Reads existing `lifetime_value_score`, `no_show_risk_score` columns. | New fn `get-my-profile-tags` (returns the row for the authenticated user only). | **Mirror the privacy page** showing the user their own tags. | ☐ |
| **3e — PostHog SDK** | `npm install posthog-react-native` + init in `app/_layout.tsx`. Gate on Profile > Privacy "Allow analytics" toggle. | none | none | **If web doesn't already use PostHog**, install `posthog-js` and init with the SAME PostHog project ID + same event taxonomy. Coordinate event names before either side ships. **If web already uses PostHog**, share the project ID + send mobile team the event taxonomy. | ☐ |
| **3f — Diner referrals** | New `app/(customer)/profile/referrals.tsx` showing diner's referral code + share link. Server-side reward issuance on first booking by referred user. | New table `referrals` (referrer_user_id, referred_user_id, code, status, rewarded_at). Migration `<ts>_referrals_table.sql`. | Extend `register-restaurant-owner`-style hook on signup to record referral code if present. Reward issuance fn. | **Add referrals page + share-link generator to web profile**. Same code format. | ☐ |
| **3g — Loyalty + Snap Rewards** | Flip `lib/config/loyaltyFeature.ts:isLoyaltyEnabled()` to true after building. Build tier definitions (already in `lib/loyalty/tiers.ts`), points ledger, qualifying-action events, tier-change push notifications, rewards catalog, redemption flow. Snap Rewards: award points for posting a Snap (rate-limited). | New tables `loyalty_points_ledger`, `loyalty_rewards`, etc. Migration <ts>_loyalty_*. | New fns for tier qualification, reward issuance, redemption. | **Web mirrors tier badge, points ledger UI, rewards redemption flow**. Multi-week build — coordinate sprints with web team. | ☐ |
| **3h — Events & Ticketing** | New `events` + `event_tickets` schemas. Customer browse + buy flow (Stripe Connect destination charge to restaurant). Restaurant event-create UI. | New tables `events` (id, restaurant_id, name, starts_at, ends_at, price_cents, capacity, status), `event_tickets` (id, event_id, user_id, status, stripe_pi_id). | New fns: `create-event` (restaurant), `purchase-event-ticket` (diner). | **Web adds events browse + buy + restaurant create UI**. Per user note: mock event data getting removed from mobile soon — coordinate before either side launches. | ☐ |

---

## Mismatch fixes (mobile shipped, web should verify)

| Mismatch | Mobile fix | Web action |
|---|---|---|
| §10.1 generic "Tax" label | Added `canadianTaxLabel()` (2b above) | Mirror — same util |
| §10.1 unused "per-booking + pre-order fees" mention | Confirmed these don't exist as diner-facing charges; trimmed from ToS pricing-transparency list | Mirror ToS edit |
| §14 always-on location | Removed from `app.json` (2a above) | Verify web doesn't request persistent geolocation |
| §10.3 refund SLA | Added 5-business-day disclosure on cancel screen (2c above) | Mirror — same wording |
| §4.5 / §6.4 empty scoring columns | Reworded ToS to "preparing — not yet active" | Mirror ToS edit; engine TBD as Phase 3g/3d work |

---

## Files mobile created or changed

| File | Change |
|---|---|
| `app/(customer)/profile/legal/terms.tsx` | Replaced stub → full 39-section ToS |
| `app.json` | Removed `locationAlwaysAndWhenInUsePermission` |
| `lib/billing/canadianTax.ts` | NEW — province → tax label mapper |
| `app/booking/[restaurantId]/step6-payment.tsx` | Wired `canadianTaxLabel()`, added `taxProvince` state |
| `app/(customer)/bookings/[id].tsx` | Refund disclosure on cancel Alert |
| `docs/TOS_COVERAGE.md` | NEW — canonical ToS-section → implementation map |
| `docs/UNHARDCODE_CHECKLIST.md` | Phase K entry |
| `docs/WEB_APP_HANDOFF.md` | THIS DOC |

---

## Out of scope for this handoff

- **Privacy Policy** at `cenaiva.com/privacy` — web team owns; same audit recommended in parallel.
- **French ToS translation** — needs Quebec-certified translator (per ToS §34 Quebec requires FR-first availability). Web team coordinates with legal.
- **Restaurant Partner Agreement** — separate document. Mobile didn't audit; web/legal team owns.
- **External legal review of §27 limitation of liability** under Quebec CPA. Recommend external counsel sign-off before next mobile or web push.
- **Mock data removal for Events** — user noted this is happening separately. Coordinate timing before Build 3h launches.
- **App Store review compliance** for new in-app refund + data-export flows (Apple sometimes requires specific receipts).

---

## Sign-off

Web team lead, please check each row's sign-off box when your side ships. Drop a note in #cenaiva-legal-coverage Slack channel (or your equivalent) when Phase 1 mirroring is complete and Phase 2 fixes are deployed. Phase 3 sequencing is up to product priority.
