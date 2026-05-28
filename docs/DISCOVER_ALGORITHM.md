# Discover Page Algorithm — Mobile ↔ Web Parity Spec

Single source of truth for the Discover home tab's ranking, filtering, and
section logic. The web app must mirror this exactly so a diner who switches
devices sees the same restaurants in the same order under the same conditions.

All mobile code references below are paths in `mobile-seatly-v2-5` (this
repo). The web app should re-implement the same pure functions; the section
specs in particular are weight-tuned to produce distinct orderings across
sections — keep the weights identical or the parity breaks.

---

## 0. High-level data flow

```
fetchRestaurantsFromSupabase()  ──►  raw Restaurant[]
                                       │
                                       ▼
              applyDistancesToRestaurants(rest, userLatLng)
                                       │
                                       ▼
                              baseRestaurants
                                       │
                       (cuisine chip + quickFilter + search query)
                                       │
                                       ▼
                              filteredRestaurants
                                       │
              ┌────────────────────────┴──────────────────────┐
              ▼                                               ▼
       pickFeaturedRestaurant()                excludeById(filtered, featured.id)
              │                                               │
              ▼                                               ▼
        DiscoverHeroFeatured                            withoutFeatured
                                                              │
                          ┌───────────────┬───────────────────┼───────────────┬───────────────┬───────────────┐
                          ▼               ▼                   ▼               ▼               ▼               ▼
                       trending       dateNight            outdoor          taste        mostSnapped       nearby
                  applySectionSpec  applySectionSpec  applySectionSpec  applySectionSpec  applySectionSpec  applySectionSpec
```

Six horizontal carousels render in this exact order under the hero card.

---

## 1. Required data shapes

### 1.1 `Restaurant` (every section consumes this)

Mirror these fields in your web type. Names + nullability matter.

| Field | Type | Used by |
|---|---|---|
| `id` | `string` | tie-break, dedup, navigation |
| `name` | `string` | display + search |
| `cuisineType` | `string` | cuisine chip filter, cuisine score, dietary penalty |
| `businessType` | `string \| null` | cuisine score (secondary), taste section, dietary penalty |
| `description` | `string` | search |
| `area` | `string` | search |
| `tags` | `string[]` | search, vibe score, dietary penalty, regex matchers (date-night, outdoor) |
| `ambiance` | `string` | search, vibe score, dietary penalty, regex matchers |
| `lat` | `number \| null` | distance calc |
| `lng` | `number \| null` | distance calc |
| `avgRating` | `number \| null` (0–5) | ratingScore, hero pick |
| `totalReviews` | `number` | popularityScore, hero tiebreak, mostSnapped qualifier |
| `priceRange` | `1–4` | quickFilter `cheapEats` (≤2) |
| `availability` | `'Available Tonight' \| 'Popular' \| 'Top Rated'` | trending qualifier, quickFilter `availableNow`, urgency copy |
| `featuredIn` | `DiscoverSectionKey[]` | section qualifiers (see §3) |
| `distanceKm` | `number \| null` | km label (display only); set by `applyDistancesToRestaurants` |
| `isActive` | `boolean` | row hard filter — never include `false` |

`DiscoverSectionKey` is one of: `'recommended' | 'popular-near-you' | 'date-night-picks' | 'outdoor-seating'` (extensible).

### 1.2 `UserSignals` (drives personalization)

Composed from: profile preferences, recent bookings, recent reviews, live
geolocation. See `lib/discover/useUserSignals.ts:23-31`.

```ts
type UserSignals = {
  preferredCuisines: string[];       // from user_profiles.preferredCuisines
  diningVibes: string[];             // from user_profiles.diningVibes
  dietaryRestrictions: string[];     // from user_profiles.dietaryRestrictions
  recentBookings: { restaurantId: string; whenIso: string; status: string }[];
  recentReviews:  { restaurantId: string; createdAt: string; rating: number | null }[];
  userLocation: { lat: number; lng: number } | null;
  isLoading: boolean;
}
```

**Recency windows** (`useUserSignals.ts:43-44`):
- Bookings: **90 days** lookback. Exclude `status === 'no_show'` and `status === 'cancelled'`.
- Reviews: **180 days** lookback.

**Cold start.** Unauthenticated user → all arrays empty, `userLocation = null` (unless permission granted). Sections still render — cold-start scores collapse to rating + popularity, which is what `mostSnapped` and `nearby` are already weighted for.

**Demo signals** (`DEMO_SIGNALS` constant): `preferredCuisines: ['Italian', 'Japanese']`, `diningVibes: ['Date night', 'Patio']`. Only used when `EXPO_PUBLIC_CENAIVA_DEMO_MODE === 'true'` (the web app probably doesn't have an equivalent — skip).

**userLocation** is non-null **only when** `location.locationReady === true` AND `location.source === 'live'`. A geo permission denial or fallback-to-Toronto-center returns `null` so cold/denied users aren't compared to nonsense.

---

## 2. Filtering pipeline (runs before sectioning)

Source: `app/(customer)/discover/index.tsx:387-423`.

### 2.1 Base filter — applied to every section

```
list = baseRestaurants
  .filter(cuisineMatchesFilter(r, filter))    // cuisine chip — see 2.2
  .filter(r => r.isActive)                    // never show deactivated rows
```

### 2.2 Cuisine chip (top-level filter; All / Italian / Japanese / French / Seafood)

```ts
function cuisineMatchesFilter(restaurant, filter) {
  if (filter === 'all') return true;
  const c = restaurant.cuisineType.toLowerCase();
  switch (filter) {
    case 'italian':  return c.includes('italian');
    case 'japanese': return c.includes('japanese');
    case 'french':   return c.includes('french');
    case 'seafood':  return c.includes('seafood') || c.includes('fish');
  }
}
```

Substring match against `cuisineType` only — not `businessType` or tags.

### 2.3 Quick-filter chip (mutually exclusive with each other AND with search query)

| Chip | Effect |
|---|---|
| `dateNight`     | keep only `r.featuredIn.includes('date-night-picks')` |
| `availableNow`  | keep only `r.availability === 'Available Tonight'` |
| `cheapEats`     | keep only `r.priceRange <= 2` |
| `nearMe`        | **does not filter** — re-sorts ascending by `distanceKm` (null → `Infinity`, i.e. sort to end) |

Tapping a quick-filter chip clears the search query.
Typing in the search bar clears the quick-filter.

### 2.4 Search query (post-quickFilter)

After sanitization (`sanitizeSearchInput`), trim + lowercase. If non-empty, keep rows where the lowercase blob

```
`${name} ${cuisineType} ${description} ${tags.join(' ')} ${area} ${ambiance}`
```

contains the query string.

### 2.5 Output → `filteredRestaurants` feeds the hero pick + every section.

---

## 3. Featured restaurant (hero card)

Source: `lib/mock/discoverPresentation.ts:7-12`.

```ts
function pickFeaturedRestaurant(restaurants) {
  if (!restaurants.length) return null;
  return [...restaurants].sort(
    (a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0)
           || b.totalReviews - a.totalReviews
  )[0];
}
```

Highest `avgRating`; ties broken by `totalReviews` desc. The hero restaurant is **excluded from all section lists** below (`excludeById`) so it never appears twice.

---

## 4. Sections — qualify + score + sort

All six sections route through `applySectionSpec(pool, spec, signals, limit)`
which executes this exact pipeline:

```
1. candidates = pool.filter(spec.qualifies)
2. if candidates.empty AND !spec.strictPool → candidates = pool   // fallback
3. if candidates.empty → return []                                // no fallback
4. scored = candidates.map(r => ({ r, score: spec.score(r, signals), tie: sectionTieBreak(r.id, spec.key) }))
5. scored.sort((a,b) => (b.score - a.score) || (b.tie - a.tie))
6. return scored.slice(0, limit).map(x => x.r)
```

Default `limit = 12`. The `nearby` section overrides to `8`.

`sectionTieBreak(id, sectionKey)` is a deterministic 0..1 hash of `"${sectionKey}::${id}"` — same restaurant gets a **different** tie-break value in different sections, so equally-scored rows shuffle per section instead of producing identical sequences.

### 4.1 Personalization flag

Personalization is enabled when `lib/config/discoverPersonalization.ts → isPersonalizedDiscoverEnabled()` returns `true`. **It is hardcoded `true` in production.** When flipped off, each section drops back to a simple `featuredIn`-array filter with the same 12-row slice — the *legacy* behavior, kept only as a kill switch.

The web app should default to **personalized = true** (no flag needed unless you want the same kill switch).

### 4.2 Section specs

All section specs use the same set of scoring primitives (§5). The weights are tuned per section so the orderings differ even when the qualifying pools overlap.

#### 4.2.1 `trending` — "Trending tonight"
- **Qualifies:** `r.availability === 'Available Tonight'` OR `r.availability === 'Popular'` OR `r.featuredIn.includes('popular-near-you')`
- **strictPool:** false (falls back to full pool if zero qualify)
- **Score:**
  ```
  0.40 * recentVisitScore(r.id, signals.recentBookings)
+ 0.30 * popularityScore(r)
+ 0.20 * distanceScore(r, signals.userLocation)
+ 0.10 * ratingScore(r)
+        dietaryPenalty(r, signals.dietaryRestrictions)
  ```
- **Limit:** 12

#### 4.2.2 `dateNight` — "Perfect for date night"
- **Qualifies:** `r.featuredIn.includes('date-night-picks')` OR ambiance/tags match regex `/(date|romantic|intimate|candle|chef|tasting|wine\s*pair)/i`
- **strictPool: TRUE** — if no row qualifies, section renders empty (never falls back to the universal pool, so users never see a "date night" section full of non-date-night restaurants).
- **Score:**
  ```
  const userDateVibes =
      (signals.diningVibes.length ? signals.diningVibes : DATE_NIGHT_VIBES)
        .filter (or substitute) intersecting DATE_NIGHT_VIBES
  
  0.40 * vibeMatchScore(r, userDateVibes)
+ 0.30 * ratingScore(r)
+ 0.20 * cuisineMatchScore(r, signals.preferredCuisines)
+ 0.10 * distanceScore(r, signals.userLocation)
+        dietaryPenalty(r, signals.dietaryRestrictions)
  ```
- `DATE_NIGHT_VIBES = ['date night', 'romantic', 'celebration', "chef's tasting"]`
- **Limit:** 12

#### 4.2.3 `outdoor` — "Outdoor seating"
- **Qualifies:** `r.featuredIn.includes('outdoor-seating')` OR ambiance/tags match regex `/(patio|rooftop|terrace|outdoor|garden|alfresco|sidewalk)/i`
- **strictPool: TRUE**
- **Score:**
  ```
  const userOutdoorVibes =
      (signals.diningVibes.length ? signals.diningVibes : OUTDOOR_VIBES)
        filter intersecting OUTDOOR_VIBES
  
  0.50 * distanceScore(r, signals.userLocation)
+ 0.30 * ratingScore(r)
+ 0.20 * vibeMatchScore(r, userOutdoorVibes)
+        dietaryPenalty(r, signals.dietaryRestrictions)
  ```
- `OUTDOOR_VIBES = ['patio', 'rooftop']`
- **Limit:** 12

#### 4.2.4 `taste` — "Based on your taste"
- **Qualifies:** always (entire pool eligible)
- **strictPool:** false
- **Score:**
  ```
  0.50 * cuisineMatchScore(r, signals.preferredCuisines)
+ 0.20 * vibeMatchScore(r, signals.diningVibes)
+ 0.20 * ratingScore(r)
+ 0.10 * recentVisitScore(r.id, signals.recentBookings)
+        dietaryPenalty(r, signals.dietaryRestrictions)
  ```
- **Limit:** 12
- **Non-personalized fallback** (when `isPersonalizedDiscoverEnabled() === false`): intersect with `user.preferredBusinessTypes` (from `fetchCurrentUserProfile`); else legacy `featuredIn.includes('recommended')`.

#### 4.2.5 `mostSnapped` — "Most snapped this week"
- **Qualifies:** `(r.totalReviews ?? 0) > 0`
- **strictPool:** false
- **Score:**
  ```
  0.50 * popularityScore(r)
+ 0.30 * ratingScore(r)
+ 0.20 * recentVisitScore(r.id, signals.recentBookings)
+        dietaryPenalty(r, signals.dietaryRestrictions)
  ```
- **Limit:** 12 (legacy non-personalized path slices to 10 from `listTrendingRestaurants(7)` — demo only; live build uses the 12 from spec)

#### 4.2.6 `nearby` — "Trending in your area"
- **Qualifies:** always
- **strictPool:** false
- **Score:**
  ```
  0.40 * distanceScore(r, signals.userLocation)
+ 0.30 * popularityScore(r)
+ 0.20 * ratingScore(r)
+ 0.10 * recentVisitScore(r.id, signals.recentBookings)
+        dietaryPenalty(r, signals.dietaryRestrictions)
  ```
- **Limit:** **8** (override — not 12)
- Source pool: `baseRestaurants` (not `withoutFeatured`) — the hero CAN reappear here. This is intentional: nearby is the "closest to me" rail and the hero may genuinely be the closest.

---

## 5. Scoring primitives

All pure functions, no side effects. Source: `lib/discover/scoreRestaurant.ts`. Each returns a value in `[0, 1]` except `dietaryPenalty` (returns `-0.3` or `0`).

### 5.1 `cuisineMatchScore(restaurant, preferred[])`
```
returns 1.0  if any preferred string exact-matches restaurant.cuisineType OR businessType (case-insensitive)
returns 0.5  if any preferred string is a substring of either (or vice versa)
returns 0    otherwise (or when preferred[] is empty)
```

### 5.2 `vibeMatchScore(restaurant, preferredVibes[])`
```
haystack = `${ambiance} | ${tags.join(' | ')}` (lowercased)
score = 0
for each vibe: if haystack.includes(vibe.toLowerCase().trim()) score += 0.5
return min(1, score)
```

### 5.3 `distanceScore(restaurant, userLocation)`
```
if userLocation == null OR restaurant.lat == null OR restaurant.lng == null: return 0
meters = haversine(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng)
km     = meters / 1000
return clamp(0, 1, exp(-km / 5))
```
Approx: 1.0 at 0 km, 0.82 at 1 km, 0.37 at 5 km, 0.14 at 10 km, ~0 at 20+ km.

### 5.4 `recentVisitScore(restaurantId, recentBookings[], nowMs = Date.now())`
For each booking matching this restaurant:
```
daysAgo = max(0, (nowMs - Date.parse(whenIso)) / 86_400_000)
score   = daysAgo <= 7 ? 1.0 : max(0, exp(-(daysAgo - 7) / 30))
```
Return the **highest** score across all matching bookings. Returns 0 when no booking matches.

### 5.5 `ratingScore(restaurant)`
```
return clamp(0, 1, (restaurant.avgRating ?? 0) / 5)
```

### 5.6 `popularityScore(restaurant)`
```
total = max(0, restaurant.totalReviews ?? 0)
if total === 0: return 0
return min(1, log10(total + 1) / 3)
```
Approx: 0.33 at 9 reviews, 0.5 at 30, 0.67 at 99, 1.0 at 1000+.

### 5.7 `dietaryPenalty(restaurant, dietaryRestrictions[])`
Substring-match the user's restrictions against the lowercased haystack of `cuisineType + businessType + ambiance + tags`. If any restriction's keyword set hits, return **-0.3**; else 0.

Keyword sets (`DIETARY_CONFLICT_KEYWORDS` in `scoreRestaurant.ts:115-124`):
```ts
{
  vegan:           ['steakhouse','bbq','grill','butcher','seafood','sushi','meat','chop'],
  vegetarian:      ['steakhouse','bbq','butcher','meat','chop'],
  pescatarian:     ['steakhouse','bbq','butcher','meat','chop'],
  halal:           ['pork','bbq','wine','cocktail','bar','cantina'],
  kosher:          ['pork','shellfish','sushi','seafood','bbq','butcher'],
  'gluten-free':   ['pizzeria','noodle','ramen','pasta','bakery'],
  'shellfish-free':['seafood','sushi','oyster'],
  'no alcohol':    ['wine','cocktail','bar','speakeasy','pub','brewery'],
}
```
Soft by design — a vegan user's steakhouse still appears, just sinks ~30%.

### 5.8 `sectionTieBreak(restaurantId, sectionKey)`
Deterministic 32-bit hash of `"${sectionKey}::${restaurantId}"`, normalized to `[0, 1)`:
```js
function sectionTieBreak(id, key) {
  const input = `${key}::${id}`;
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return (h >>> 0) / 0xffffffff;
}
```
**Must match exactly** — this is what guarantees the same row gets a different tie-break in different sections, producing the visual section-distinctness the user can perceive.

---

## 6. Distance computation (`applyDistancesToRestaurants`)

Source: `lib/supabase/fetchRestaurants.ts → applyDistancesToRestaurants`.

```ts
function applyDistancesToRestaurants(restaurants, userLocation) {
  if (!userLocation) return restaurants;   // no live geo → leave distanceKm as-is (null)
  return restaurants.map(r => {
    if (r.lat == null || r.lng == null) return r;
    return { ...r, distanceKm: haversineKm(userLocation.lat, userLocation.lng, r.lat, r.lng) };
  });
}
```

`distanceKm` is **`number | null`**. The cards render the "X km" label **only when non-null** — never fabricate a number. iOS verified live distances: 0.2 / 0.4 / 1.3 / 11.8 km from a Toronto downtown user location.

Haversine implementation (must match):
```js
const EARTH_RADIUS_KM = 6371;
const toRad = d => d * Math.PI / 180;

function haversineKm(lat1, lng1, lat2, lng2) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
          * Math.sin(dLng/2)**2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return EARTH_RADIUS_KM * c;
}
```

---

## 7. Greeting (header copy above the cuisine chips)

Source: `lib/discover/torontoTime.ts`.

```
hour = current hour in America/Toronto (24h)
period = hour < 12  ? 'morning'
       : hour < 17  ? 'afternoon'
       : 'evening'
```

Copy:
```
Line 1: "Good {period}, {firstName} —"
Line 2: "this morning's picks are ready."
        "this afternoon's picks are ready."
        "tonight's picks are ready."
```

For unauthenticated visitors, `firstName` resolves to `"User"` via `resolveAuthDisplayProfile`.

---

## 8. Card UI conditionals (must mirror exactly)

### 8.1 km label
Render only when `restaurant.distanceKm != null`. Format: `distanceKm.toFixed(1) + " km"`.

### 8.2 Badges (`getDiscoverBadges`)
Up to 2 badges per card, in this priority order:
1. `top_rated` — shown when `avgRating >= 4.7`
2. `popular` — shown when `featuredIn.includes('popular-near-you')`
3. `available_now` — shown when `availability === 'Available Tonight'`

Slice to max 2.

### 8.3 Urgency copy (deterministic per restaurant id, see `getUrgencyCopy`)
```
n      = parseInt(id.replace(/\D/g, '') || '3', 10)
tables = 1 + (n % 5)
slot   = ['6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM'][n % 6]

if availability === 'Available Tonight':
  if tables == 1: "1 table left tonight"
  elif tables <= 3: "{tables} tables left tonight"
  else: "Available now"
  subtext: "Next slot: {slot}"
else:
  line:    "Limited tables tonight"
  subtext: "Next slot: {slot}"
```

These are deterministic from the id — same restaurant always shows the same urgency text. The web app should reproduce the same numeric extraction + modulo logic for parity.

### 8.4 Short tagline
```
if ambiance.length <= 28: return ambiance
elif tags[0]: return tags[0]
else: return ambiance.slice(0, 26) + '…'
```

---

## 9. "See all" / category drilldown

Each section's "See all" chevron routes to `/(customer)/discover/category/{slug}`. The category screen filters the full pool by:

| Slug | Filter |
|---|---|
| `trending` | `featuredIn.includes('popular-near-you')` |
| `date-night` | `featuredIn.includes('date-night-picks')` |
| `outdoor-seating` | `featuredIn.includes('outdoor-seating')` |
| `available-now` | `availability === 'Available Tonight'` |
| `taste` | `featuredIn.includes('recommended')` |

The hero card's "See all" / `mostSnapped`'s "See all" instead routes to `/(customer)/discover/explore`.

---

## 10. Auth gating (per-action) — do this on web too

The discover page itself is **public** (no login required) per Apple guideline 5.1.1(v). Login is requested only when the user taps an account-based action:

- **Reserve now / Book a Table** → if `!isAuthenticated`, push to login with `returnTo=/discover/{id}`; otherwise route to the booking flow at `/booking/{id}/step2-time`.
- **Save / Favorite** → same gate.
- **Post Review** → same gate.
- **Profile / Bookings / Wallet tabs** → bounce to login.

Web should use the same returnTo pattern so post-signin lands the user back on the restaurant they were trying to book.

---

## 11. Data fetch contract

Mobile uses two Supabase calls:

1. **`fetchRestaurantsFromSupabase()`** — `SELECT * FROM restaurants WHERE is_active = true` via the PostgREST anon key. The anon role has `SELECT` grants on `restaurants`, `menu_items`, `menu_categories`, `restaurant_reviews`, `visit_photos`, `events`, `promotions` (migration `grant_anon_select_for_unauth_browsing`).
2. **`applyMenuDerivedPriceRanges`** — `SELECT restaurant_id, price FROM menu_items WHERE is_active AND is_available` to derive the `priceRange` band when `restaurants.price_range` is null. Web should do the same so the `cheapEats` quick-filter behaves consistently.

Distances are computed **client-side** on mobile via `applyDistancesToRestaurants`, not by the server. Web should do the same (browser `navigator.geolocation` → pipe through the helper).

---

## 12. Parity checklist for the web rewrite

- [ ] Port `lib/discover/scoreRestaurant.ts` 1:1 (all 8 helpers, same constants)
- [ ] Port `lib/discover/sectionSpecs.ts` 1:1 (all weights, regex patterns, vibe constants)
- [ ] Port `lib/discover/applySectionSpec.ts` 1:1 (pipeline + tie-break + try/catch defensiveness)
- [ ] Port `lib/discover/useUserSignals.ts` shape + recency windows (90d bookings, 180d reviews; exclude no_show + cancelled)
- [ ] Port `lib/discover/torontoTime.ts` greeting (America/Toronto, 12/17 cutoffs)
- [ ] Port `lib/mock/discoverPresentation.ts` for `pickFeaturedRestaurant`, `getDiscoverBadges`, `getUrgencyCopy`, `shortTagLine`
- [ ] Distance: client-side haversine, label hidden when null
- [ ] Section order: hero → trending → dateNight → outdoor → taste → mostSnapped → nearby
- [ ] Section limits: 12 / 12 / 12 / 12 / 12 / **8** (nearby)
- [ ] `dateNight` and `outdoor` have `strictPool: true` — never fall back when empty
- [ ] `nearby` sources from `baseRestaurants` (not `withoutFeatured`)
- [ ] Quick-filter chips clear search; search clears quick-filter
- [ ] Cuisine chip is independent of quick-filter (both can be active)
- [ ] `cheapEats` is `priceRange <= 2`, not `< 2`
- [ ] `availableNow` is exact-match `'Available Tonight'`, not substring
- [ ] Hero pick excluded from sections 1–5; included in `nearby`
- [ ] `isActive === false` rows are silently dropped at every layer

If a section ordering differs between mobile and web after these are mirrored, the most likely culprits are: (a) different `sectionTieBreak` hash, (b) drift in the weight constants, (c) `recentBookings`/`recentReviews` recency windows out of sync, (d) `dietaryPenalty` keyword map drift.
