# Deep linking: web vs mobile

## Identifiers

- **Primary id:** Restaurant UUID from Supabase `restaurants.id` — use this in API calls and mobile routes that already expect `r1`-style mocks in dev; production data uses UUIDs from the database.
- **Slug:** `restaurants.slug` (unique) — stable for SEO and human-readable URLs on web (e.g. `la-maison` in [Seatly seed](https://github.com/StevenGeorgy/Seatly/blob/main/supabase/migrations/20250317000013_seed_data.sql)).

Always treat **slug** as the cross-platform public handle; **UUID** as the canonical id when the app reads from Supabase.

## Mobile (Expo)

Configured in [`app.json`](../../app.json):

- **URL scheme:** `seatly` — e.g. `seatly:///(customer)/discover/<id>`
- **iOS bundle id:** `com.seatly.app`
- **Android package:** `com.seatly.app`

### Suggested app paths (Expo Router)

| Screen | Path pattern |
|--------|----------------|
| Discover | `/(customer)/discover` |
| Restaurant detail | `/(customer)/discover/[id]` — `[id]` is `restaurants.id` (UUID or legacy mock id) |
| Booking | `/booking/[restaurantId]/step1-date` |

Build universal links in a follow-up by setting:

- `expo.ios.associatedDomains` — e.g. `applinks:seatly.app`
- `expo.android.intentFilters` — HTTPS host matching your marketing/web domain

Host `assetlinks.json` / Apple App Site Association on the **same domain** as the web app.

## Web (Vite)

Routes live under [`apps/web/src/routes`](https://github.com/StevenGeorgy/Seatly/tree/main/apps/web/src/routes) in the monorepo. Public restaurant URLs should use **slug** in the path for shareability, e.g. `/discover/:slug` or `/r/:slug` — align with your deployed router table.

## Cross-linking rule

1. **Web → app:** Link `https://<domain>/r/<slug>`; app universal link resolves slug → UUID via Supabase `restaurants` where `slug = ?`, then navigate to `/(customer)/discover/<uuid>`.
2. **App → web:** Open `https://<domain>/r/<slug>` using `restaurant.slug` from the catalog.

Until universal links are configured, use the custom scheme:  
`seatly:///(customer)/discover/<id>` for internal QA.
