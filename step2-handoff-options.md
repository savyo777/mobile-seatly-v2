# Step 2 finish — handoff options (detailed)

> Companion to [`jolly-prancing-clover.md`](./jolly-prancing-clover.md).
> Status going in: Steps 0a, 1, 3, 4, 5, 6, 7, 10 shipped. Step 2 has 2 of 5 helpers ported (`confirmationIntent`, `simplePromptIntent` — full source was inline in the plan doc itself).
> Remaining for Step 2: `recommendationIntent.ts`, `filterRestaurants.ts`, `localBookingCollector.ts` + matching Vitest ports.
> This doc takes the plan and grounds it in what the *actual files in this checkout* look like, then lays out four options for packaging the source for the web port.

---

## Table of contents

1. [The headline finding — adaptation is smaller than the plan suggested](#1-the-headline-finding--adaptation-is-smaller-than-the-plan-suggested)
2. [Per-helper adaptation matrix (concrete)](#2-per-helper-adaptation-matrix-concrete)
3. [Per-test adaptation matrix (concrete)](#3-per-test-adaptation-matrix-concrete)
4. [The four options, in detail](#4-the-four-options-in-detail)
5. [Failure modes per option](#5-failure-modes-per-option)
6. [Decision tree](#6-decision-tree)
7. [Recommendation](#7-recommendation)
8. [What I need from you to start](#8-what-i-need-from-you-to-start)
9. [Appendix — verbatim import lines from this checkout](#9-appendix--verbatim-import-lines-from-this-checkout)

---

## 1. The headline finding — adaptation is smaller than the plan suggested

The plan doc (`jolly-prancing-clover.md` §6 / Step 2) describes adaptation as ranging from "none" to "medium (largest, depends on web's restaurant catalog)". I read each file in this checkout end-to-end before writing this doc. The reality:

| Helper | Plan doc said | This checkout actually shows | Net adaptation |
|---|---|---|---|
| `recommendationIntent.ts` (~297 lines) | "low" | Sole import is `@cenaiva/assistant` types | **0 lines** |
| `filterRestaurants.ts` (~127 lines) | "medium (Restaurant type differs)" | Imports `@cenaiva/assistant` + `@/lib/mock/restaurants` for `Restaurant` type | **1 import line** (+ field-access verification) |
| `localBookingCollector.ts` (~1,210 lines) | "medium (largest, depends on web's restaurant catalog)" | Imports `@cenaiva/assistant` + `@/lib/cenaiva/simplePromptIntent` only. **No restaurant data lookup anywhere in the file.** | **0 lines** (web has `simplePromptIntent` already; package import resolves identically) |

That `localBookingCollector` finding is the big one. The helper is a pure parser + state-machine over `BookingState` and `CenaivaAvailabilityRequest` — it doesn't read mobile's `lib/mock/restaurants.ts`, doesn't call any catalog lookup function, doesn't reference the `Restaurant` type. The plan doc was being conservative.

**Implication:** the only file in Step 2 that needs anything more than verbatim copy is `filterRestaurants.ts`, and even there the change is one import line plus a 7-field shape check. The previously-feared "engineer hand-adapts 1,210 lines for catalog differences" risk does not exist.

This shifts the option ranking. Option D (pre-adapted source) becomes nearly trivial; Option C (pointers-only) becomes very thin because there's almost nothing to pre-document. Option A's "fat doc" downside (size) is unchanged.

---

## 2. Per-helper adaptation matrix (concrete)

### 2.1 `recommendationIntent.ts`

**Local source:** `/Users/savyoyaqoop/mobile-seatly-v2-15/lib/cenaiva/recommendationIntent.ts` (11,095 B, ~297 lines).

**Imports (verbatim, lines 1–6):**
```ts
import type {
  AssistantMemory,
  AssistantResponseType,
  DiscoverySortMode,
  UIActionType,
} from '@cenaiva/assistant';
```

**Web adaptation:** none. `@cenaiva/assistant` is a workspace package; web already has it (Step 1 was schema parity).

**Exported symbols (port them all):**
- `type CenaivaRecommendationMode = 'single' | 'list'`
- `getCenaivaRecommendationMode(transcript): CenaivaRecommendationMode | null`
- `isSingleRestaurantRecommendationIntent(transcript): boolean`
- `capSingleRecommendationSpokenText(spokenText): string`
- `normalizeSingleRestaurantRecommendationResponse(response, transcript): AssistantResponseType`
- `applyClientDiscoveryMemory(response, transcript, opts): AssistantResponseType`

**Web call sites that will use this** (per plan doc §5 row 4 and Step 8):
- `AssistantProvider.sendTranscript` — call `getCenaivaRecommendationMode(transcript)` and pass result as `recommendation_mode` on the orchestrator request body.
- `AssistantProvider.sendTranscript` — call `applyClientDiscoveryMemory(...)` after orchestrator response, before APPLY_RESPONSE.

**Risk of porting wrong:** none. Literal copy.

---

### 2.2 `filterRestaurants.ts`

**Local source:** `/Users/savyoyaqoop/mobile-seatly-v2-15/lib/cenaiva/filterRestaurants.ts` (3,272 B, ~127 lines).

**Imports (verbatim, lines 1–2):**
```ts
import type { FiltersDelta } from '@cenaiva/assistant';
import type { Restaurant } from '@/lib/mock/restaurants';
```

**Web adaptation:**
1. **Replace** the second import with web's `Restaurant` type. Per the plan doc this is likely `apps/web/src/types/restaurants.ts` — the engineer must confirm the actual web path.
2. **Verify** the seven field accesses still resolve. The helper reads `restaurant.{id, name, cuisineType, description, city, area, tags}`. If the web `Restaurant` uses snake_case (`cuisine_type`) or omits any field, adapt accesses. Cuisine-group constants (`CUISINE_GROUPS`, etc.) stay as-is.

**Field-by-field check** the engineer needs to run on the web type:

| Mobile field | Type | Used as | If web differs |
|---|---|---|---|
| `id` | `string` | identity / dedup | — |
| `name` | `string` | matching | — |
| `cuisineType` | `string` | cuisine group lookup | rename access if `cuisine_type` |
| `description` | `string` | text-match scoring | tolerate `null`/missing |
| `city` | `string` | city filter | tolerate `null` |
| `area` | `string \| undefined` | area filter | tolerate `null`/missing |
| `tags` | `string[] \| undefined` | tag-match scoring | tolerate `null`/missing |

**Exported symbol:** `filterCenaivaRestaurants(restaurants, filters): Restaurant[]`.

**Web call sites:** the orchestrator response can include a `filters` block (`FiltersDelta`); web's discovery rendering uses this helper to apply it client-side, same as mobile.

**Risk of porting wrong:** low. If a field is missing on web's type, TS catches it at build time.

---

### 2.3 `localBookingCollector.ts`

**Local source:** `/Users/savyoyaqoop/mobile-seatly-v2-15/lib/cenaiva/localBookingCollector.ts` (43,133 B, ~1,210 lines).

**Imports (full — lines 1–6):**
```ts
import type {
  AssistantResponseType,
  BookingState,
  UIActionType,
} from '@cenaiva/assistant';
import { isCenaivaProcessPrompt } from '@/lib/cenaiva/simplePromptIntent';
```

**Web adaptation:** none. Both imports resolve on web (the package, and the already-ported `simplePromptIntent` from earlier in Step 2).

**Confirmed: no restaurant catalog dependency.** I grepped the file for `mock/restaurants`, `RESTAURANTS`, `catalog`, `getRestaurant`, `findRestaurant`. The only match was a regex literal containing the word "restaurants" inside a pattern string. The helper's surface is `BookingState` + parsed transcript fragments → `LocalBookingDecision` — no restaurant data is read.

**Exported symbols (port them all):**
- `type CenaivaAvailabilityRequest`
- `type CenaivaAvailabilityOption`
- `type CenaivaAvailabilityResponse`
- `type LocalBookingDecision = ...`
- `parseLocalPartySize(raw): number | null`
- `parseLocalDate(raw, timezone='America/Toronto'): string | null`
- `parseLocalWeekday(raw): number | null`
- `parseLocalTime(raw, opts): string | null`
- `planLocalBookingTurn(ctx): LocalBookingDecision`  ← the one that matters most for Stage 1
- `buildLocalAvailabilityResponse({...}): AssistantResponseType`

**Web call sites** (per plan doc Step 8):
- `AssistantProvider.sendTranscript` — Stage 1 of the four-stage pipeline. Call `planLocalBookingTurn(...)` with current `bookingState`, and branch on `decision.kind` (`local_response` / `check_availability` / `pass`).
- After Stage 2 (availability fast-path) — call `buildLocalAvailabilityResponse(...)` to convert the raw availability HTTP response into an `AssistantResponseType` with the right `spoken_text` and `ui_actions`.

**Risk of porting wrong:** low *if* you port verbatim. The 1,210-line surface is intimidating but every line is mechanical — regexes, `BookingState` field reads, `LocalBookingDecision` returns. There's nothing the engineer needs to "rethink" for web.

---

## 3. Per-test adaptation matrix (concrete)

I checked all three tests for Jest-specific APIs that wouldn't run under Vitest. **None of them use `jest.fn`, `jest.useFakeTimers`, `jest.mock`, `jest.spyOn`, or any timer mocking.** They are pure `describe` / `it` / `expect`. Vitest accepts those identically.

### 3.1 `recommendationIntent.test.ts`

- Local: `/Users/savyoyaqoop/mobile-seatly-v2-15/__tests__/cenaiva/recommendationIntent.test.ts` (5,616 B, 140 lines)
- Imports: `@cenaiva/assistant` types only + `@/lib/cenaiva/recommendationIntent`.
- **Adaptation: zero.** Drop into `apps/web/src/lib/cenaiva/__tests__/recommendationIntent.test.ts` and run.

### 3.2 `filterRestaurants.test.ts`

- Local: `/Users/savyoyaqoop/mobile-seatly-v2-15/__tests__/cenaiva/filterRestaurants.test.ts` (2,504 B, 73 lines)
- Imports: `@/lib/cenaiva/filterRestaurants` + `@/lib/mock/restaurants` for the `Restaurant` type.
- The test constructs a `baseRestaurant: Restaurant` fixture inline with ~18 fields (`id, name, slug, cuisineType, description, address, city, province, area, lat, lng, phone, coverPhotoUrl, logoUrl, avgRating, totalReviews, ...`). On web, this fixture needs to satisfy web's `Restaurant` shape — likely a different superset/subset.
- **Adaptation:** swap the `Restaurant` import (same change as the helper) and prune/add fixture fields to satisfy web's type. TS catches mismatches at compile time. ~5 minutes of mechanical fixing.

### 3.3 `localBookingCollector.test.ts`

- Local: `/Users/savyoyaqoop/mobile-seatly-v2-15/__tests__/cenaiva/localBookingCollector.test.ts` (17,516 B, 544 lines)
- Imports: `@cenaiva/assistant` `BookingState` + `@/lib/cenaiva/localBookingCollector`.
- The test constructs `BookingState` fixtures via a `booking(patch)` helper. `BookingState` is defined in the shared `@cenaiva/assistant` package, so the fixture works identically on web.
- **Adaptation: zero.** Drop in and run.

### 3.4 What the engineer should do *after* tests run

The mobile tests cover the *planner* and *parser* layers but not the integration into `AssistantProvider`. After the unit tests pass, the engineer should also verify the Step 2 → Step 8 wire-up:

- `getCenaivaRecommendationMode("show me italian restaurants")` returns `'list'` and that value lands on the orchestrator request.
- `planLocalBookingTurn({ bookingState: { ..., status: 'collecting_party_size' }, transcript: "for 4" })` returns a `local_response` with `spoken_text: "Got it. What date?"` (or whatever the helper yields) and the web provider speaks it without hitting the network.
- See plan doc §8 for the full smoke-test list.

---

## 4. The four options, in detail

Each option below answers four questions:
1. **Artifact:** what gets created on disk in this repo.
2. **Engineer workflow at port-time:** what they do in the web repo to consume it.
3. **Time estimate (for me, in this session):** how long until the artifact is ready.
4. **When this option is best.**

---

### Option A — Single fat handoff doc (verbatim source inline)

**Artifact:** one markdown file at `step2-source-handoff.md` (~75 KB) containing:
- A header section with adaptation notes (essentially §2 + §3 of this doc, condensed).
- Three large `### Helper N` sections, each with the full source of one helper inside a fenced TS block, immediately followed by its full test source.
- A closing "wire-up checklist" pointing at the Step 8 call sites.

**Engineer workflow at port-time:**
1. Open `step2-source-handoff.md` in the web repo (or clone of this repo).
2. For each helper: copy the fenced source block → paste into the corresponding `apps/web/src/lib/cenaiva/<helper>.ts` → if the helper is `filterRestaurants`, swap one import.
3. Same for tests — paste into `apps/web/src/lib/cenaiva/__tests__/`, swap the `Restaurant` import in the `filterRestaurants` test.
4. `npm run typecheck && npm run test --workspace=apps/web` until green.
5. Move on to Step 8.

**Time estimate (mine):** ~6 minutes — read each file, paste into the doc with light prose around it.

**Best when:** the engineer wants one self-contained artifact they can open offline (on a flight, on a different machine) and execute against. Survives losing access to this checkout.

---

### Option B — Three separate handoff docs (one per helper)

**Artifact:** three markdown files in this repo root:
- `step2-recommendationIntent.md` (~13 KB: source + test + notes)
- `step2-filterRestaurants.md` (~7 KB: source + test + notes + the field-mapping table)
- `step2-localBookingCollector.md` (~62 KB: source + test + notes — the largest by far)

Each file is independently sufficient for porting just that helper.

**Engineer workflow at port-time:**
1. Start with the smallest (`recommendationIntent`) — paste, typecheck, test, commit to the web repo.
2. Then `filterRestaurants` — paste, do the one import swap, fixture-prune in the test, typecheck, test, commit.
3. Finally `localBookingCollector` — paste, typecheck, run the 544-line test, commit.
4. Move on to Step 8 with three small green commits already in.

**Time estimate (mine):** ~8 minutes (three doc preambles take longer than one).

**Best when:** the web port is being done by a human in three review-sized commits. Each helper lands and goes green in isolation, which keeps the eventual Step 8 PR diff focused on the wire-up rather than the bulk source.

---

### Option C — Pointers-only doc (no inline source)

**Artifact:** one short markdown file at `step2-source-pointers.md` (~3 KB) containing:
- The three local paths (helpers + tests).
- The adaptation matrix from §2 and §3 of this doc, condensed to one table per helper.
- A `Read` recipe for a future Claude session: "Open `/Users/savyoyaqoop/mobile-seatly-v2-15/lib/cenaiva/<file>.ts` directly; the source is canonical there."

No verbatim source. The web-repo session reads the live files via filesystem.

**Engineer workflow at port-time (human):**
1. In the web repo, open the corresponding source/test files in this checkout in another tab.
2. Copy from there, paste into web, adapt the one `filterRestaurants` import.
3. Typecheck, test, commit.

**Engineer workflow at port-time (Claude session in web repo):**
1. The session reads `/Users/savyoyaqoop/mobile-seatly-v2-15/lib/cenaiva/recommendationIntent.ts` directly via the `Read` tool.
2. Writes the file to `apps/web/src/lib/cenaiva/recommendationIntent.ts` via `Write`.
3. Same for the other two + tests.
4. The pointers doc is its only adaptation cheatsheet.

**Time estimate (mine):** ~3 minutes.

**Best when:** the next phase of work is going to be done by a future Claude session that has filesystem access to this checkout. Avoids duplicating ~75 KB of source into a doc just for it to be re-read by a tool that could read it directly. Also avoids the staleness risk of a doc copy that might drift from the live source.

**Worst when:** the engineer or session is on a different machine without `/Users/savyoyaqoop/mobile-seatly-v2-15/` mounted.

---

### Option D — Pre-adapted source doc (web-shaped, paste-ready)

**Artifact:** one markdown file at `step2-source-handoff-webshaped.md` containing all three helpers + tests, with the **`filterRestaurants` Restaurant import already swapped** to the web path you specify, and the test fixture already pruned to web's `Restaurant` shape.

Given the §1 finding (the only adaptation is one import + one fixture), Option D is barely more work than Option A. But it requires me to know two things about web that I don't know from this checkout:
1. **The exact path** for web's `Restaurant` type (likely `@/types/restaurants` or `apps/web/src/types/restaurants.ts`, but not confirmed).
2. **The exact shape** of web's `Restaurant` (which fields exist, casing, optionality) so the test fixture compiles.

**Engineer workflow at port-time:**
1. Paste each helper. Pasted import for `filterRestaurants` is already correct.
2. Paste each test. Pasted fixture is already correct.
3. Typecheck, test, commit. The "import swap + fixture prune" steps from Options A/B are gone.

**Time estimate (mine):** ~10 minutes once you provide the two pieces of info above. Without them, I'd be guessing — see "Failure modes."

**Best when:** the engineer wants the lowest-friction port and can paste me the web `Restaurant` type definition (or grant me a way to read the web repo) up front.

---

## 5. Failure modes per option

| Option | Most likely failure | Detection | Recovery cost |
|---|---|---|---|
| A | Doc is large; engineer accidentally skips a section while scrolling | typecheck (missing export) or runtime "function not found" | low (re-paste from doc) |
| B | Engineer commits helper N before its test passes, then breaks it during Step 8 wire-up | Step 8 tests fail | medium (retest helper N, sometimes hard to distinguish wire-up from helper bug) |
| C | Future session loses access to this checkout (different machine, archived, deleted) | Pointers go to non-existent paths | high (re-extract source manually from git or backup) |
| C | Live source mutates here after the pointers doc is written, web gets a different version than the doc described | silent — no signal | medium (cross-check by hash if you remember to) |
| D | I guessed wrong on web's `Restaurant` shape. Pasted code doesn't compile | typecheck fails immediately on paste | low if engineer can fix on the spot, medium if they bounce back to me |
| D | I correctly adapted to a `Restaurant` shape that has since changed on web | typecheck fails on paste | low (engineer fixes locally) |
| All | The mobile source itself diverges from what the plan doc anticipated (e.g. a function got renamed last week) | Step 8 wire-up doesn't compile because the symbol the plan doc named doesn't exist | medium — engineer reads the live mobile source and adapts |

---

## 6. Decision tree

```
Are you (the user) doing the port yourself, by hand, in the web repo?
├── Yes
│   │
│   ├── Will you have this checkout mounted while you work?
│   │   ├── Yes → Option C (pointers-only) is fine, but B is friendlier
│   │   └── No  → Option A (fat doc, offline-capable) or B
│   │
│   └── Do you know the web `Restaurant` type's exact shape and import path?
│       ├── Yes → Option D becomes attractive (lowest paste-time friction)
│       └── No  → Stick with A or B; D will misfire
│
└── No, a future Claude session will do the port from the web repo
    │
    ├── Will that session have filesystem access to this checkout?
    │   ├── Yes → Option C is the natural fit (no duplication)
    │   └── No  → Option A (one self-contained file the session can ingest)
```

---

## 7. Recommendation

**Default: Option B (three separate handoff docs).** Reasons:
- The §1 finding means each doc is small enough to be useful (the worst is `localBookingCollector` at ~62 KB; the other two are <15 KB each).
- Three commits on the web side give a clean review trail: one per helper, each green before the next starts. Step 8's eventual diff is then *just* the wire-up.
- Surviving loss of this checkout is a real concern over the lifespan of the migration; B and A both give that property, B with finer-grained commits.

**If the next phase is a Claude session in the web repo with filesystem access to here:** switch to Option C. Re-encoding 1,210 lines of source into markdown only for it to be `Read`-tool-decoded again is wasteful and adds a staleness vector for no gain.

**If you can paste me the web `Restaurant` type right now:** Option D becomes the cheapest at port-time. The §1 finding made D nearly free for me to produce — the only work I'd skip without web's type info is one fixture prune in the `filterRestaurants` test.

---

## 8. What I need from you to start

Pick A / B / C / D, plus:

| If you pick | Tell me |
|---|---|
| A | (nothing — defaults are fine) |
| B | (nothing — defaults are fine) |
| C | confirm the engineer / future Claude session will have read access to `/Users/savyoyaqoop/mobile-seatly-v2-15/` |
| D | paste the web `Restaurant` type definition (or its file path, if I should fetch it from a path you specify) |

Default output location for any doc artifact: this repo root, alongside `jolly-prancing-clover.md`.

I will produce the artifact and stop. No code in this repo gets touched. No commits get made. This is a packaging task, not a porting task.

---

## 9. Appendix — verbatim import lines from this checkout

For the engineer's reference, here is exactly what the top of each file looks like in the canonical mobile source as of this commit:

```
$ head -7 lib/cenaiva/recommendationIntent.ts
import type {
  AssistantMemory,
  AssistantResponseType,
  DiscoverySortMode,
  UIActionType,
} from '@cenaiva/assistant';
```

```
$ head -3 lib/cenaiva/filterRestaurants.ts
import type { FiltersDelta } from '@cenaiva/assistant';
import type { Restaurant } from '@/lib/mock/restaurants';   // ← only line that changes for web
```

```
$ head -7 lib/cenaiva/localBookingCollector.ts
import type {
  AssistantResponseType,
  BookingState,
  UIActionType,
} from '@cenaiva/assistant';
import { isCenaivaProcessPrompt } from '@/lib/cenaiva/simplePromptIntent';
```

```
$ head -2 __tests__/cenaiva/recommendationIntent.test.ts
import type { AssistantResponseType } from '@cenaiva/assistant';
import {
```

```
$ head -2 __tests__/cenaiva/filterRestaurants.test.ts
import { filterCenaivaRestaurants } from '@/lib/cenaiva/filterRestaurants';
import type { Restaurant } from '@/lib/mock/restaurants';   // ← also changes for web
```

```
$ head -9 __tests__/cenaiva/localBookingCollector.test.ts
import {
  buildLocalAvailabilityResponse,
  parseLocalDate,
  parseLocalPartySize,
  parseLocalTime,
  planLocalBookingTurn,
  type CenaivaAvailabilityResponse,
} from '@/lib/cenaiva/localBookingCollector';
import type { BookingState } from '@cenaiva/assistant';
```

That's the entire adaptation surface. Two import lines (one in `filterRestaurants.ts`, one in its test). Everything else is verbatim copy.
