# BIG_SAV_TESTING.md

**Session date**: 2026-05-10
**Repo**: `mobile-seatly-v2-15` (brand: Cenaiva, package: `mobile-cenaiva-v2`)
**Branch**: `main` (all work committed and pushed)
**Status**: All four code-compliance phases shipped; **paused at computer-use end-to-end smoke testing — blocked on macOS Screen Recording + Accessibility permissions for the terminal host.**

---

## 1. What this session set out to do

The user added `DINER_MOBILE_GUIDE.md` (a 1,418-line spec, v1.1, 2026-05-09) at the repo root. It is the contract for any mobile diner-side surface that mirrors the Cenaiva web app, with one carve-out: **the Hey Cenaiva voice pipeline is explicitly out of scope** for mobile (no wake word, no `cenaiva-orchestrate`, no ElevenLabs TTS, no Deepgram STT, no `/account/voice` route, no `cenaiva_tts_voice` column reads/writes).

The user said "I need you to do what the md file says" → "leave hey cenaiva alone, make a plan." → approved a scoped plan covering Phases 1–4 (modify flow, push tokens, calendar `restaurant_available_dates` integration, realtime registry + notifications wiring) and explicitly **deferred** Phases 5 (Discover auto-roll + slot pills) and 6 (Deals tab refactor) to a future round.

The full plan file lives at `/Users/savyoyaqoop/.claude/plans/make-a-plan-but-silly-nest.md` and was saved during the plan-mode workflow.

---

## 2. Compliance audit results (pre-implementation)

A subagent sweep checked the mobile codebase against the spec's 13 normative rules. Findings:

| # | Rule | Result |
|---|---|---|
| 1 | No direct writes to `reservations` / `tables` / `shifts` / `restaurants` / `guests` | **VIOLATION** — `lib/mock/reservations.ts:220` did `.from('reservations').update({status:'cancelled'})` for real UUIDs (fixed mid-session, see §3.0) |
| 2 | Booking writes go through edge functions | OK (`create-public-booking` was wrapped) |
| 3 | No voice-assistant code | Voice screens exist (intentionally per user; left untouched) |
| 4 | Price meter derived from menu items, not `restaurants.price_range` | OK |
| 5 | `status='no_show'` hidden from diner list | OK |
| 6 | Multiplexed realtime registry | Inconclusive (no realtime in mobile pre-fix; **resolved Phase 3**) |
| 7 | `excludeReservationId` plumbing in modify flow | Inconclusive — modify flow didn't exist (**resolved Phase 1**) |
| 8 | `get_available_slots_cached` as calendar source | OK (via `get-availability` edge function) |
| 9 | Push token registration | Missing — `expo_push_token` never written (**resolved Phase 2**) |
| 10 | `useCurrentUserId()` is canonical | OK |
| 11 | Demo-mode gating | OK (spot-checked Discover, Activity, Notifications) |
| 12 | No writes to `guests` table | OK |
| 13 | `restaurant_available_dates` empty-set vs null distinction | RPC was never called (**resolved Phase 4**) |

---

## 3. Code changes shipped this session

### 3.0 Pre-plan hot fix — Cancel bypass

Even before the plan was approved, an obvious contract violation got fixed:

- `lib/mock/reservations.ts` — `cancelReservationByIdAsync` no longer writes `status='cancelled'` straight to `reservations` for real UUIDs. It now calls a new typed `cancelReservation` HTTP wrapper added to `lib/booking/publicBookingApi.ts`, which POSTs to the `/functions/v1/cancel-reservation` edge function. This makes `release_reservation_tables`, `cancellation_reason`, `cancelled_at`, the SMS/email send, the past-reservation 400 guard, and the rate limit (10/min) all run.

This hot-fix landed inline rather than as a separate commit; it was bundled into the Phase 1 commit (see §4 below).

### 3.1 Phase 1 — Modify-reservation flow (spec §6.7)

**Approach (user choice)**: reuse the existing 7-step booking wizard's `step2-time.tsx` with a new `mode=modify` branch. No new screen; leverage `BookingCalendarModal`, `PartySizeWheel`, `TimeSlotWheel` as-is.

**`lib/booking/publicBookingApi.ts`** — new exports:
- `modifyReservation(payload)` — POSTs to `/functions/v1/modify-reservation`. Maps every `unavailable_reason` per spec §10 (`slot_taken`, `no_table`, `over_cover_cap`, `not_modifiable`, `diner_double_book`, `past_shift_close`, `rate_limited`, `closed`, `no_floor_capacity`) to friendly user messages. Requires JWT or `confirmation_code`.
- `fetchActiveReservationWindows({ userProfileId, excludeReservationId, lookbackHours })` — selects the diner's reservations with `status IN ('pending','confirmed','seated')` from the last N hours, optionally excluding one id, returns `{ start, end }[]` time ranges using `duration_minutes`.
- `slotConflictsWithWindows(slot, windows)` — pure helper, returns true if `[slot.date_time, slot.date_time + duration_minutes)` overlaps any window.
- Plus types: `ConflictWindow`, `ModifyReservationPayload`, `ModifyReservationResponse`.

**`app/booking/[restaurantId]/step2-time.tsx`** — modify-mode wiring:
- Added optional params: `mode` (`'modify' | undefined`), `reservationId`, `excludeRid`, `prefillParty`.
- Initial party size honors `prefillParty` (parses, clamps to ≥1, defaults 2).
- New `useEffect` resolves the current user's `user_profiles.id` from `auth_user_id` and calls `fetchActiveReservationWindows` with `excludeRid`.
- Slot pills compute `conflict = slotConflictsWithWindows(slot, conflictWindows)`. Conflict pills are visually disabled (existing `slotPillUnavailable` style) and tapping shows a "Reservation conflict" alert.
- `handleNext` branches on `isModifyMode`: builds local `YYYY-MM-DD` + `HH:MM`, calls `modifyReservation` for real UUIDs, calls `modifyMockReservation` for demo (non-UUID) ids. On success: `router.replace('/(customer)/bookings/' + reservationId)` + success haptic. Errors render via `Alert.alert`.
- Header subtitle reads "Update your reservation" in modify mode.
- Footer button label switches to "Update reservation" / "Updating…" with submitting state.

**`app/(customer)/bookings/[id].tsx`** — Modify button now functional:
- New `isModifiableReservation` predicate (status ∈ pending/confirmed AND future).
- New `handleModify` builds the route URL and calls `router.push`.
- Modify button only renders when `canModify`; Cancel button still gated by `showActions` (the broader "upcoming" predicate, since spec §7.3 allows cancel-while-seated but not modify-while-seated).

**`lib/mock/reservations.ts`** — new helper:
- `modifyMockReservation(id, patch)` — applies `Partial<Pick<Reservation, 'reservedAt' | 'partySize' | 'specialRequest'>>` to the in-memory mock store; bumps `mockReservationsVersion`.

### 3.2 Phase 2 — Push token registration (spec §6.10)

**`lib/notifications/pushToken.ts`** — new file:
- `registerPushTokenForCurrentUser()` — async, fire-and-forget, idempotent (single inflight promise).
- Steps: bail on simulators (`Device.isDevice === false`); ensure permission via `expo-notifications`'s `getPermissionsAsync` / `requestPermissionsAsync`; read `Constants.expoConfig?.extra?.eas?.projectId`; call `Notifications.getExpoPushTokenAsync({ projectId })`; resolve current `auth.uid()` from supabase session; PATCH `user_profiles.expo_push_token` keyed on `auth_user_id`. Android: register `default` channel once with vibration pattern + gold accent color.
- All steps wrapped — failures cannot crash the app or block sign-in.
- Uses dynamic `require('expo-notifications')` and `require('expo-device')` so the app still boots if those native modules aren't linked.

**`lib/auth/AuthContext.tsx`** — hook into `onAuthStateChange`:
- On `SIGNED_IN` and `INITIAL_SESSION` events with a non-null session, fire-and-forget `registerPushTokenForCurrentUser()`. One hook covers first-launch session restore and every fresh login.

### 3.3 Phase 4 — `restaurant_available_dates` → calendar (spec §4.3, §6.5)

**`lib/booking/publicBookingApi.ts`** — new `getAvailableDates({ restaurantId, partySize, startDate, endDate })`:
- Calls `supabase.rpc('restaurant_available_dates', { p_restaurant_id, p_party_size, p_start_date, p_end_date })` directly (the web doesn't wrap this in an edge function either).
- Returns `string[] | null`. **Critical contract** per spec §4.3:
  - `[]` → all dates closed (caller greys everything).
  - `null` → unknown / fetch hasn't completed (caller stays permissive).
  - `string[]` (non-empty) → only those dates are available.
- 60-second TTL cache keyed on `${restaurantId}|${partySize}|${startDate}|${endDate}` to avoid spamming the RPC every calendar open.

**`components/booking/BookingCalendarModal.tsx`** — accept disabled-dates prop:
- New prop `availableDates?: string[] | null` with documented null-vs-empty semantics.
- Per cell: `fullyBookedByRpc = availableDatesSet !== null && c.dateKey != null && !availableDatesSet.has(c.dateKey)`.
- Combined: `disabled = !c.selectable || fullyBookedByRpc`. The `closed` flag also picks up RPC-determined closures so the visual styling matches.
- `onPress` gates on the combined `disabled`, not the original `c.selectable`.

**`app/booking/[restaurantId]/step2-time.tsx`** — wire calendar fetch:
- New `useEffect` keyed on `[rid, partySize, partySizeError, partySizeInput]` calls `getAvailableDates` for the next 60 days; pipes result into `BookingCalendarModal`'s `availableDates` prop.

### 3.4 Phase 3 — Realtime registry + notifications wiring (spec §9, §6.10)

**`lib/realtime/availabilityRegistry.ts`** — new file:
- `subscribeToAvailability(restaurantId, callback): () => void`
- Multiplexed pattern: module-level `Map<restaurantId, { channel, callbacks: Set<()=>void> }>`. First subscriber opens one `postgres_changes` channel filtered by `restaurant_id=eq.${id}`; subsequent subscribers add to the Set; last unsubscribe calls `supabase.removeChannel(channel)` and removes the Map entry.
- Per spec §9.1 — exactly one channel per unique restaurant id, never one per visible card.

**`lib/realtime/notificationsRegistry.ts`** — new file:
- `subscribeToNotifications(userProfileId, callback): () => void`
- Same multiplexed pattern, keyed by `userProfileId`, filter `user_id=eq.${userProfileId}` on `notifications`.

**`app/booking/[restaurantId]/step2-time.tsx`** — invalidate slots on remote changes:
- New `useEffect` calls `subscribeToAvailability(rid, () => setAvailabilityRefresh(v => v + 1))`. The slot list re-fetches whenever any reservation row in the same restaurant changes.

**`app/(customer)/notifications.tsx`** — real notifications + realtime + mark-read:
- New helpers: `mapSupabaseType` (booking_confirmed → 'booking_confirmed'; booking_modified → 'booking_confirmed'; booking_cancelled → 'cancelled'; booking_reminder split into reminder_2h vs reminder_24h via `data.hours_until ≤ 3`; review_request → 'review_request'; promotion_alert / event_alert → 'waitlist_ready'; system / default → 'loyalty_milestone'), `mapSupabaseRow`, `fetchSupabaseNotifications(authUserId)`.
- For signed-in users: fetches last 50 rows from `notifications` table keyed on `user_profiles.id` (resolved via `auth_user_id`). Merges with post-turn review/photo prompts and demo-mode mocks (still gated behind `isDemoModeEnabled()`).
- `useFocusEffect` triggers re-fetch on focus AND on a `refreshTick` state bump.
- `useEffect` calls `subscribeToNotifications(userProfileId, () => setRefreshTick(t => t + 1))` so the list auto-refreshes on insert/update/delete.
- `markSupabaseRead(id)` issues `update({ is_read: true }).eq('id', id)` and optimistically updates local state.
- `handlePress` for non-post-turn rows with UUID-shaped ids calls `markSupabaseRead` then navigates to `/(customer)/bookings/${reservationId}` if a reservation_id is present.

---

## 4. Commits landed (pushed to `origin/main`)

```
b85223c Notifications: pull from Supabase + live updates via realtime channel
69abb1b Auth: register Expo push token on sign-in
7931c1c Bookings: route cancel/modify through edge functions, grey out closed dates, live-invalidate on realtime
edba6a9 Diner mobile guide: add v1.1 spec for diner-side mirror
```

Push: `533b448..b85223c  main -> main`

After-the-fact verification: `npx tsc --noEmit 2>&1 | grep -v "mobile-seatly-v2-2"` returns empty. Typecheck clean.

---

## 5. Server-side state verified (live, no changes needed)

Used the Supabase MCP against project ref `exbjodmnpdiayfzrdyux` (ca-central-1).

### 5.1 Edge functions (all deployed, all `ACTIVE`)

| Slug | Version | verify_jwt | Used by mobile |
|---|---|---|---|
| `create-public-booking` | v31 | false | yes — `createPublicBooking` |
| `cancel-reservation` | v10 | false | yes — `cancelReservation` (added this session) |
| `modify-reservation` | v14 | false | yes — `modifyReservation` (added this session) |
| `get-availability` | v66 | false | yes — `getAvailability` |
| `send-booking-reminder` | v8 | — | server cron |
| `prepare-phone-login` | v15 | false | not currently |
| `stripe-setup-intent`, `stripe-list-methods`, `stripe-charge-order` | v35 | false | preorder checkout |
| `delete-account` | v23 | true | account flow |

### 5.2 Database RPCs (booking-relevant, all present with spec-matching signatures)

- `book_reservation(...)` — full 17-param signature
- `modify_reservation_slot(p_reservation_id, p_restaurant_id, p_shift_id, p_new_reserved_at, p_new_party_size, p_turn_minutes)`
- `release_reservation_tables(p_reservation_id)`
- `find_available_table_group(p_restaurant_id, p_reserved_at, p_party_size, p_turn_minutes, p_exclude_reservation_id, p_adjacency_distance)` — **note**: `p_exclude_reservation_id` is supported here, used by `modify_reservation_slot`
- `get_available_slots(p_restaurant_id, p_date, p_party_size)`
- `get_available_slots_cached(p_restaurant_id, p_date, p_party_size)`
- `get_available_slots_for_restaurants(p_restaurant_ids, p_date, p_party_size)`
- `get_available_slots_for_restaurants_compact(p_restaurant_ids, p_date, p_party_size, p_target_time)` — **note**: extra `p_target_time` param vs the spec; harmless for mobile
- `restaurant_available_dates(p_restaurant_id, p_party_size, p_start_date, p_end_date)` — used by Phase 4
- `restaurant_floor_capacity(p_restaurant_id)`, `restaurant_turn_time_minutes(p_restaurant_id, p_shift_id)`
- `canonical_guest_id(p_restaurant_id, p_user_profile_id, p_email, p_phone)`
- Plus: `lookup_reservation_by_code`, `assign_reservation_tables`, `mark_reservation_tables_seated`, `submit_reservation_review`, `create_staff_reservation`, etc.

### 5.3 Verdict

Web app is using all of these. Mobile can use them directly. **No DB migrations, no edge function deploys required for the four phases shipped this session.**

---

## 6. Where we left off — and how to resume next session

### 6.1 The blocker

User asked: "use computer use to attempt to book, modify and cancel a restaurant and come back to me with your findings."

Computer-use tools loaded successfully via ToolSearch. `request_access(["Simulator", "iPhone Mirroring", "Finder"])` was called twice. Both returned:

> macOS Accessibility and Screen Recording permission(s) not yet granted. The permission panel has been shown. Once the user grants the missing permission(s), call request_access again.

The user is closing the terminal to grant permissions and then will restart this session.

### 6.2 What to do at the start of the next session

1. **Verify permissions are granted**:
   - System Settings → Privacy & Security → **Screen & System Audio Recording** → enable the Claude Code host app (Terminal / iTerm2 / Cursor / VS Code / Claude.app — whichever the user uses)
   - System Settings → Privacy & Security → **Accessibility** → enable the same host app
   - The host app must be **fully quit and relaunched** after toggling.
2. **Re-load the computer-use tools** if they're not in the deferred list — `ToolSearch({ query: "computer-use", max_results: 30 })`.
3. **Call `request_access`** again with `["Simulator", "iPhone Mirroring", "Finder"]` and a short reason like "Exercise the Cenaiva mobile app's booking flows end-to-end."
4. Once granted, **screenshot to see what's running**. Likely paths:
   - Expo dev server already running and a Simulator open with the app loaded → click around directly.
   - Nothing running → open Terminal and ask the user to run `npx expo start` themselves (Terminal is tier "click", I can't type into it). Then `i` for iOS simulator or `a` for Android, then drive Simulator.
   - iPhone Mirroring with the device + app already open → drive that.

### 6.3 What to test (the original ask)

Three flows, in order, against the **live Supabase project** (this is real data — be careful):

1. **Book a reservation**
   - Sign in (or use demo mode).
   - Discover → tap a restaurant → tap a slot pill → fill guest contact form → confirm.
   - Verify: confirmation screen shows a real `confirmation_code` (8 hex chars, e.g. `ABC12DEF`); booking appears in `/(customer)/bookings/`.
   - Cross-check: query `notifications` for a `booking_confirmed` row for this user, query `reservations` for the new row.
2. **Modify the reservation**
   - From the booking detail page, tap the **Modify** button (this is the new wiring from this session — currently a no-op pre-fix).
   - The booking wizard's `step2-time` should open in modify mode (header reads "Update your reservation"; party size prefilled; date prefilled).
   - Pick a new slot (verify conflict-window pills are disabled — the user's own current slot may render disabled because `get-availability` doesn't accept `exclude_reservation_id`; the user is expected to pick a different time).
   - Tap **Update reservation**. Should call `/functions/v1/modify-reservation` and route back to the detail.
   - Verify: detail page reflects new date/time/party.
3. **Cancel the reservation**
   - From the booking detail page, tap **Cancel**.
   - Confirm the dialog.
   - Verify: status flips to `cancelled`, the row disappears from "Upcoming" and shows in "Cancelled" bucket. SMS/email arrives if account has channels configured.
   - **Audit**: confirm `release_reservation_tables` ran by querying `reservation_tables` — `released_at` should be set to a recent timestamp.

### 6.4 Known limitations to watch for during testing

- **Voice screens still exist** at `app/(customer)/ai-chat.tsx`, `app/(customer)/map.tsx`, `app/(customer)/profile/cenaiva-voice.tsx`. The user explicitly asked to leave these alone — don't touch them, don't remove them, don't refactor them. They should keep working.
- **`get-availability` edge function does not accept `exclude_reservation_id`**. Mobile's modify flow handles this by checking conflict windows client-side via `fetchActiveReservationWindows` + `slotConflictsWithWindows` — but the SLOT itself may render unavailable in modify mode if the user's current booking holds the only table at that time. This is a server-side change tracked separately from this session.
- **Push token registration fires on `SIGNED_IN` / `INITIAL_SESSION`**. On a real device, the OS will show a "Allow notifications?" prompt the first time the user opens the app. Tap **Allow**, then check `user_profiles.expo_push_token` for the user — should be a string starting with `ExponentPushToken[`. On a simulator, `Device.isDevice === false` so the registration silently bails (expected).
- **Realtime subscriptions** are now active on the booking screen and notifications screen. If you create or cancel a reservation in another tab while step2-time is open, the slot list should refresh automatically.
- **Calendar greying** depends on `restaurant_available_dates` returning sane data. For party_size > any restaurant's `max_party_size`, expect every date to grey out (RPC returns `[]`).

### 6.5 Files to remember

| Concern | Path |
|---|---|
| The spec | `DINER_MOBILE_GUIDE.md` (root) |
| This summary | `BIG_SAV_TESTING.md` (root) |
| Approved plan | `~/.claude/plans/make-a-plan-but-silly-nest.md` |
| Edge function HTTP wrappers | `lib/booking/publicBookingApi.ts` |
| Booking wizard step (modify mode lives here) | `app/booking/[restaurantId]/step2-time.tsx` |
| Booking detail (Modify button wiring) | `app/(customer)/bookings/[id].tsx` |
| Mock reservation cancel + modify | `lib/mock/reservations.ts` |
| Auth listener + push hook | `lib/auth/AuthContext.tsx` |
| Push registration | `lib/notifications/pushToken.ts` |
| Notifications screen | `app/(customer)/notifications.tsx` |
| Calendar modal | `components/booking/BookingCalendarModal.tsx` |
| Availability realtime registry | `lib/realtime/availabilityRegistry.ts` |
| Notifications realtime registry | `lib/realtime/notificationsRegistry.ts` |
| Auth canonical user-id hook | `lib/auth/currentUserId.ts` |
| Demo mode helper | `lib/config/demoMode.ts` |

### 6.6 Out-of-scope items remaining (not part of this session's plan)

These were deferred per the user's "core compliance only" scope choice. Spec sections still uncovered:

- **Spec §6.1.4** — Discover auto-roll (when zero cards have slots on the default date, increment offset and re-fetch up to 14 days; reset on user date pick / filter). Not yet implemented.
- **Spec §6.1** — Slot pills on Discover restaurant cards via `get_available_slots_for_restaurants_compact`. Discover currently fetches no slot data per card.
- **Spec §6.2** — Deals page. Mobile has an Events tab today; spec says Deals should merge events + active promotions. User's preference recorded: rename Events → Deals and merge promotions in. Not yet implemented.
- **Hey Cenaiva voice** — explicitly excluded by user; do not touch.

---

## 7. Quick resume command

When permissions are granted and the host app is relaunched:

```
"Resume the BIG_SAV_TESTING session. Permissions are granted; please retry request_access for Simulator + iPhone Mirroring + Finder, then drive book → modify → cancel against the live project per §6.3."
```

That's enough context for the next session to pick up the testing exactly where this one stopped.
