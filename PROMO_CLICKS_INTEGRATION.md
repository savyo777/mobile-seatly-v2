# Promotion clicks — mobile → web integration handoff

**Date shipped on mobile:** 2026-05-16
**Mobile commits:** `e8b4686` (backend) · `d398982` (owner-side cleanup) · `c0f9bcb` (diner-side wiring)
**Supabase project:** `exbjodmnpdiayfzrdyux` (`ca-central-1`)
**Web repo target:** `github.com/StevenGeorgy/Seatly`

Hand this doc to whoever (or whatever) implements the matching feature on the web app. The goal is a **single shared click counter** — a click registered on the web shows up on mobile and vice versa.

---

## 1. TL;DR — what this feature is

Each promotion has a `clicks` integer counter that increments by 1 every time a **diner** views the promo from a customer-facing surface. Owners see the running total on their Promos overview alongside the existing `current_uses` (redemptions) number. The counter is intentionally NOT incremented when an owner taps their own promo on the restaurant-side dashboard — that would inflate the analytics.

Why this is cross-app automatically: **both apps point at the same Supabase project**. The `clicks` column lives on one row per promotion in the shared DB; the mobile app increments it via an RPC; the web app should call the same RPC. The first time a diner clicks a promo on the web app, the count appears on the mobile owner dashboard, and the first time a diner clicks on mobile, the count appears on the web owner dashboard.

---

## 2. What's already done (you don't need to redo this)

### 2.1 Database

The migration `supabase/migrations/20260516000000_add_promotion_clicks.sql` in the **mobile** repo was applied to the shared Supabase project on 2026-05-16. It did three things:

1. **New column:**
   ```sql
   alter table public.promotions
     add column if not exists clicks integer not null default 0;
   ```
   Backfills all existing rows to 0.

2. **New RPC** — anon-callable, SECURITY DEFINER, atomic UPDATE:
   ```sql
   create or replace function public.increment_promotion_clicks(p_promotion_id uuid)
   returns void
   language plpgsql
   security definer
   set search_path = public
   as $$
   begin
     update public.promotions
     set clicks = clicks + 1
     where id = p_promotion_id;
   end;
   $$;
   ```

3. **Grants** — anon and authenticated can both execute the RPC; nobody has direct UPDATE rights on the row except via the function:
   ```sql
   revoke all on function public.increment_promotion_clicks(uuid) from public;
   grant execute on function public.increment_promotion_clicks(uuid) to anon, authenticated;
   ```

**Verification SQL** the web agent can run in the Supabase SQL editor before starting work:

```sql
-- Column exists?
select column_name
from information_schema.columns
where table_schema = 'public'
  and table_name   = 'promotions'
  and column_name  = 'clicks';
-- Expect: one row "clicks"

-- RPC exists?
select routine_name
from information_schema.routines
where routine_schema = 'public'
  and routine_name   = 'increment_promotion_clicks';
-- Expect: one row "increment_promotion_clicks"

-- Smoke test (replace the UUID with a real promotion id from your DB):
select id, title, clicks from public.promotions where id = '<promo-id>';
select public.increment_promotion_clicks('<promo-id>'::uuid);
select id, title, clicks from public.promotions where id = '<promo-id>';
-- Expect: second SELECT shows clicks +1
```

If all three pass, the DB is ready. **No web-side DB work is needed.** If any fail, re-run the migration from `supabase/migrations/20260516000000_add_promotion_clicks.sql`.

### 2.2 Mobile-side reference implementation

The web agent should mirror this architecture exactly. Files in the mobile repo:

| Path | Role | LOC |
|---|---|---|
| `lib/promotions/getPromotions.ts` | Existing fetcher. Now includes `clicks` in the SELECT field list and in `PromotionRow` type. | ~75 |
| `lib/promotions/incrementPromotionClicks.ts` | Fire-and-forget RPC wrapper. Never throws. | ~30 |
| `app/(customer)/profile/promotions.tsx` | Diner's "My Promotions" inbox. Wraps each promo card in a Pressable that fires the increment, deduped per-mount. | ~90 |
| `app/(customer)/events/index.tsx` | Diner's Events feed (merges events + promos). Fires increment only for `type: 'promotion'` cards. | (modified) |
| `components/events/EventCard.tsx` | Card component. Added optional `onPressed?: (event) => void` side-effect prop. | (modified) |
| `app/(staff)/promotions/index.tsx` | Owner-side Promos overview. Reads `clicks` from the DB and displays it. **Not tappable** — owner taps must not count. | (modified) |

---

## 3. What the web agent must do

Three concrete tasks plus one optional. All scoped to `apps/web/`.

### Task 1 — Add the increment helper

**Where:** `apps/web/src/lib/promotions/incrementPromotionClicks.ts` (or wherever the web repo organises Supabase RPC helpers — match the existing convention).

**File contents (copy verbatim, adapt the supabase import):**

```ts
import { supabase } from '@/lib/supabaseClient'; // ← adjust to the existing web supabase singleton

/**
 * Fire-and-forget increment of `promotions.clicks` via the
 * `increment_promotion_clicks(uuid)` RPC. Never throws — diner-side tap
 * handlers don't want try/catch.
 *
 * Server-side this is granted to anon + authenticated and runs as
 * SECURITY DEFINER. Updates a single row's `clicks` column by 1.
 *
 * MUST only be called from diner-facing surfaces. The owner Promos page
 * displays the count but never increments it (so owner self-views don't
 * inflate the analytics).
 *
 * Mirror file on mobile: lib/promotions/incrementPromotionClicks.ts in
 * the mobile-seatly-v2 repo. Keep the two implementations behaviourally
 * identical so cross-app counts stay coherent.
 */
export async function incrementPromotionClicks(promotionId: string): Promise<void> {
  if (!promotionId) return;
  try {
    const { error } = await supabase.rpc('increment_promotion_clicks', {
      p_promotion_id: promotionId,
    });
    if (error && import.meta.env.DEV) {
      console.warn('[promotions] increment_promotion_clicks RPC failed', error);
    }
  } catch (err) {
    if (import.meta.env.DEV) {
      console.warn('[promotions] increment_promotion_clicks threw', err);
    }
  }
}
```

**Notes:**
- Vite uses `import.meta.env.DEV`; React Native uses `__DEV__`. That's the only intentional code-level difference between the two implementations.
- Don't add an HTTP fallback or retry logic. The helper is best-effort.
- Don't add a Sentry capture call here — the function fires on every diner tap; analytic errors would be noisy.

### Task 2 — Wire it onto every diner-facing surface that shows a promo

Find every web page where a diner sees a promotion card. Likely candidates (mirror the mobile structure):

| Mobile surface | Web equivalent to find |
|---|---|
| `app/(customer)/profile/promotions.tsx` (diner inbox) | A "My Promotions" or "Offers" page under the customer's account or profile area |
| `app/(customer)/events/index.tsx` (events feed that merges promos) | An events/discover page that lists promotional offers next to regular events |
| Anywhere else a diner sees a promo card | e.g. restaurant detail page if it surfaces active promos for that restaurant |

For each surface, wire the tap to the helper using **the per-mount dedupe pattern below**.

#### 2.a Per-mount dedupe pattern (React)

A diner scrolling back and forth must not pump the counter. A fresh navigation TO the page (component re-mount) should count again — that's a genuine new view. The mobile implementation uses a `useRef<Set<string>>`. Mirror it on web:

```tsx
import { useRef } from 'react';
import { incrementPromotionClicks } from '@/lib/promotions/incrementPromotionClicks';

function PromotionsList({ promotions }: { promotions: Promotion[] }) {
  // Set lives for the life of this component mount. Survives re-renders
  // (useRef is stable). A route change that unmounts and remounts the
  // component resets it — that's intentional, it counts as a fresh visit.
  const countedRef = useRef<Set<string>>(new Set());

  const handleView = (promotionId: string) => {
    if (countedRef.current.has(promotionId)) return;
    countedRef.current.add(promotionId);
    void incrementPromotionClicks(promotionId);
  };

  return (
    <ul>
      {promotions.map((p) => (
        <li key={p.id} onClick={() => handleView(p.id)}>
          <PromotionCard promotion={p} />
        </li>
      ))}
    </ul>
  );
}
```

#### 2.b Tap target rules

- **Wrap whichever element the diner clicks** to view the promo — a `<button>`, `<Link>`, `<div role="button" onClick={...}>`, etc. If the existing card has inner action buttons (e.g. "Claim offer"), the click on those buttons should ALSO fire `handleView` first — easiest by putting `onClick` on the outer wrapper and letting events bubble (default React behaviour).
- **Don't add a visual press state** to the wrapper. The inner action buttons own their own affordance. The wrapper is a transparent capture layer.
- **No spinner, no toast on success.** The diner doesn't need to know we counted a click. Silent.
- **Don't await the RPC.** Use `void` so the UI doesn't block on network. The mobile version reliably feels instantaneous.

#### 2.c Single-card surface variant

If you have a route like `/promotions/[id]` that shows ONE promo (a detail page), increment on mount instead of on click — the page itself is the "view":

```tsx
import { useEffect } from 'react';

function PromotionDetailPage({ promotionId }: { promotionId: string }) {
  useEffect(() => {
    void incrementPromotionClicks(promotionId);
    // No dedupe ref here — the dedupe scope is the entire mount. A second
    // visit (back/forward, hard refresh) is a different mount and counts
    // again, matching the list-surface behaviour.
  }, [promotionId]);

  // ...rest of the page
}
```

### Task 3 — Show `clicks` on the owner side of the web app

Find the web's owner Promos overview (mirrors `app/(staff)/promotions/index.tsx` in mobile). Two changes:

#### 3.a Include `clicks` in the SELECT

Wherever the web fetches promotions for the owner view, add `clicks` to the column list. If using supabase-js:

```ts
const { data, error } = await supabase
  .from('promotions')
  .select(
    'id, title, current_uses, clicks, /* ... existing columns ... */'
  )
  .eq('restaurant_id', restaurantId);
```

Add `clicks: number | null` to whatever TS type represents a promotion row.

#### 3.b Render Used + Clicks side-by-side on each owner card

The mobile pattern (adapt to your card layout):

```tsx
<div className="performance-card">
  <div className="performance-col">
    <div className="performance-value">{promotion.current_uses ?? 0}</div>
    <div className="performance-sub">Used</div>
  </div>
  <div className="performance-col">
    <div className="performance-value">{promotion.clicks ?? 0}</div>
    <div className="performance-sub">Clicks</div>
  </div>
</div>
```

**Critical:** the owner card must **NOT** be wrapped in a tap handler that fires `incrementPromotionClicks`. Read-only display. The mobile implementation explicitly reverted that — see commit `c0f9bcb`.

### Task 4 (optional) — Hide fabricated analytics

This is what the mobile cleanup also did. If the web app currently shows owner-side metrics like "guest mix", "best time", "estimated lift", or "revenue generated" on the Promos overview and those numbers are computed client-side from non-existent DB columns, **hide that UI until the data exists**. Don't show fake numbers to real owners.

Mobile removed those sections in commit `d398982`. Same call on web: better to render a clean card with just Used + Clicks than to fabricate guest-mix percentages.

---

## 4. Design rules — must match mobile exactly

These keep the analytics coherent between the two apps. Any divergence and the cross-app shared count starts feeling weird.

| Rule | Mobile enforcement | Web enforcement |
|---|---|---|
| **Diner-only.** Owner taps never increment. | Owner Promos card is a plain `<View>`, no `onPress`. | Owner Promos card has no `onClick` that fires `incrementPromotionClicks`. |
| **Per-mount dedupe.** Repeat-scroll same session counts once. New mount counts again. | `useRef<Set<string>>` in the diner screens. | Same `useRef<Set<string>>` pattern (Task 2.a above). |
| **Fire-and-forget.** Never block UI on the RPC. | `void incrementPromotionClicks(id)` everywhere. | Same. |
| **No try/catch in the call-site.** Helper handles its own errors. | Yes. | Yes. |
| **Same RPC name + signature.** | `supabase.rpc('increment_promotion_clicks', { p_promotion_id })`. | Identical. |
| **Helper signature stays `(id: string) => Promise<void>`.** | Yes. | Yes — don't return a count or wrap in a result type. |
| **Visual feedback comes from the underlying nav, not the analytics call.** | Tap → navigate → DB write happens async. | Same. |

---

## 5. Cross-app shared-count verification plan

After the web changes ship, run this end-to-end smoke test to prove both apps are writing to the same row:

1. **Pick a real promo.** Note its id — call it `<P>`. Note the current `clicks` value via SQL:
   ```sql
   select id, title, clicks from public.promotions where id = '<P>';
   ```
   Call the starting value `C0`.

2. **On the web app:** sign in as a diner (or browse anonymously if your promo list is public). Open the diner Promotions page, click promo `<P>`. Don't reload.

3. **Verify via SQL:** the same query should now show `clicks = C0 + 1`.

4. **On the mobile app:** open the staff Promos tab as the owner of that promo's restaurant. Pull-to-refresh. The "Clicks" number on the card for `<P>` should display `C0 + 1`.

5. **Reverse direction:** on the mobile app, switch to the customer side. Open the diner Promotions inbox. Tap promo `<P>`.

6. **Verify via SQL:** clicks should now be `C0 + 2`.

7. **On the web app:** reload the owner-side Promos page. The Clicks number on `<P>` should be `C0 + 2`.

If all six steps pass, the integration is mirrored correctly.

### Dedupe verification (optional)

8. On either app, with the diner promotions page mounted, click promo `<P>` three times in a row without navigating away.
9. SQL: clicks should increase by **exactly 1**, not 3 (per-mount dedupe).
10. Navigate away and back. Click `<P>` once. SQL: clicks +1 more (fresh mount = fresh count).

---

## 6. Edge cases and gotchas

### 6.a RLS won't block the increment

The RPC is `SECURITY DEFINER`. The diner doesn't need any direct UPDATE rights on `promotions`. As long as the JWT (or anon key) reaches the function, the increment succeeds. If you see RLS errors in the dev console, double-check that the `grant execute` line from the migration was actually applied:

```sql
select grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and routine_name = 'increment_promotion_clicks';
-- Expect rows for both anon and authenticated with EXECUTE.
```

### 6.b Promos that the diner never sees

If a promo is `is_private = true` and the diner isn't on the invite list, they won't see the card and can't click it. No special handling needed — the count just doesn't grow for private-and-invisible promos. Owner SQL on those rows shows `clicks = 0` correctly.

### 6.c Promos that are paused / expired

`fetchActivePromotions()` on mobile filters by `is_active = true` and `ends_at >= now`. Paused/expired promos don't appear on diner surfaces, so clicks naturally stop. The column stays at whatever it was when the promo went inactive. That's correct historical data.

### 6.d Web SSR concerns

If a section of the web app server-renders the diner promotions list (e.g. a Next.js SSR page), be careful where you put the tap handler:
- The increment must happen in **client-side** code (`'use client'` in Next.js, or anywhere there's `useRef` / `onClick`).
- Server-rendering the list is fine; the click happens in the browser after hydration.

### 6.e Don't double-count via event bubbling

If the diner taps an inner button (e.g. "Claim offer") that's nested inside the wrapper with `onClick={() => handleView(p.id)}`, React's bubbling will fire the wrapper's `onClick` too — which is **what we want**. The dedupe set prevents double-counting from that same tap. Don't add `e.stopPropagation()` on the inner button — that would break the click count.

---

## 7. Mirror file map (mobile ↔ web)

When the web work is done, this map should look symmetric:

| Concern | Mobile path | Web path (target) |
|---|---|---|
| RPC helper | `lib/promotions/incrementPromotionClicks.ts` | `apps/web/src/lib/promotions/incrementPromotionClicks.ts` |
| Promotion fetcher (`clicks` in SELECT) | `lib/promotions/getPromotions.ts` | `apps/web/src/lib/promotions/getPromotions.ts` (or existing equivalent) |
| Diner promotions list | `app/(customer)/profile/promotions.tsx` | The owner's `apps/web/src/pages/customer/PromotionsPage.tsx` (or equivalent) |
| Diner events/promos merged feed | `app/(customer)/events/index.tsx` | `apps/web/src/pages/customer/EventsPage.tsx` (or equivalent) |
| Owner Promos overview | `app/(staff)/promotions/index.tsx` | `apps/web/src/pages/dashboard/PromotionsPage.tsx` (or equivalent) |
| Migration | `supabase/migrations/20260516000000_add_promotion_clicks.sql` | Already applied — same Supabase project. **Don't re-create the migration on the web side.** |

---

## 8. Rollback

The feature is additive. To revert on the web app, delete the helper file and remove the tap-handler wrappers. The DB column + RPC stay (the mobile app still uses them). The count just stops growing from web-side visits; mobile-side visits continue to count normally.

If you need to revert the entire feature (mobile + web), the migration's reverse is:

```sql
revoke execute on function public.increment_promotion_clicks(uuid) from anon, authenticated;
drop function if exists public.increment_promotion_clicks(uuid);
alter table public.promotions drop column if exists clicks;
```

Then remove the helper + tap handlers from both repos. Order matters: drop the column **after** removing all callers of the RPC, otherwise live diners get RPC errors during the gap.

---

## 9. Out of scope (don't build these)

- **Per-user click attribution.** The current design counts aggregate taps only. There's no `promotion_clicks` event table tracking who clicked when. If we ever want that, it's a separate migration + a different RPC.
- **Owner-side "Reset clicks" button.** Don't add it — clicks are historical, not editable.
- **Excluding owner self-clicks via RPC.** Today we just don't wire owners to the helper. If the design ever needs RPC-level enforcement, the function would need to check `auth.uid()` against `user_restaurant_roles`. Not required while the call sites stay clean.
- **Click attribution to a specific session / device.** Use of dedupe-per-mount is intentional simplicity. If you ever want device/session-unique clicks, switch to an event table (see above).

---

## 10. Appendix — full mobile diff for reference

If the web agent wants to read the actual code that ships on mobile, the three commits are:

- **`e8b4686`** — *"Add a real clicks counter to promotions."* Migration + fetcher + helper. (3 files, 78 insertions.)
- **`d398982`** — *"Drop mock fallbacks + fabricated analytics from the Promos tab."* Cleaned the owner Promos overview to only show real Used + Clicks. (2 files, 62 insertions / 85 deletions.)
- **`c0f9bcb`** — *"Move promotion click tracking off the owner side to the diner side."* Moved the tap handler from owner Promos to the diner inbox + events feed. Added optional `onPressed` prop on `EventCard`. (4 files, 58 insertions / 26 deletions.)

Repo: `github.com/savyo777/mobile-seatly-v2`, branch `main`.

---

## 11. Questions the web agent will likely have

**Q: Do I need to run the migration myself?**
No. It already ran against the shared Supabase project on 2026-05-16. The verification SQL in §2.1 confirms this.

**Q: Can I add my own dedupe (e.g. localStorage-based, per-day)?**
Not without coordinating with mobile. The two apps must agree on what a "click" means or counts will skew. If you want a different dedupe strategy, propose it as a follow-up that updates both apps together.

**Q: Should the increment be debounced?**
No. Per-mount dedupe via `useRef<Set>` is the only de-duplication. Debouncing introduces latency without changing the analytics shape.

**Q: What if I'm on Next.js App Router and the page is a Server Component?**
Make the promotions list a Client Component (`'use client'` directive). Client side is required for the `useRef` + `onClick` handler.

**Q: Can I A/B test by routing some clicks through a different RPC?**
Don't. The single column is the source of truth; forking writes will diverge.

**Q: What if the existing web promotions list has more than one tap target per card (e.g. share button, claim button, etc.)?**
Put `onClick` on the outer wrapper. React event bubbling means every inner-button tap also fires the wrapper handler. The dedupe set guarantees only one count per mount regardless. Don't `stopPropagation`.

**Q: Where is the DB schema source of truth?**
The web team owns it. The mobile migration at `supabase/migrations/20260516000000_add_promotion_clicks.sql` was applied directly to the shared project; the web repo should mirror that SQL into its own migrations folder (without re-running it) so future migrations stay in sequence.

---

**Last updated:** 2026-05-16. If the mobile implementation drifts from this doc, the mobile codebase wins — re-read `lib/promotions/incrementPromotionClicks.ts` and `app/(customer)/profile/promotions.tsx` first.
