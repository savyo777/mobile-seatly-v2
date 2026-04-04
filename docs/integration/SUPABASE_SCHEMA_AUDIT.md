# Supabase schema vs mobile mock models

Source of truth for SQL: [StevenGeorgy/Seatly `supabase/migrations`](https://github.com/StevenGeorgy/Seatly/tree/main/supabase/migrations).  
Mobile types: [`lib/mock/restaurants.ts`](../../lib/mock/restaurants.ts), [`lib/mock/reservations.ts`](../../lib/mock/reservations.ts), [`lib/mock/orders.ts`](../../lib/mock/orders.ts).

## restaurants

| Mobile `Restaurant` | Postgres `restaurants` | Notes |
|--------------------|--------------------------|--------|
| `id: string` | `id uuid` | Same as stringified UUID in app |
| `name`, `slug`, `cuisineType`, `description`, `address`, `city`, `province`, `phone` | `name`, `slug`, `cuisine_type`, `description`, `address`, `city`, `province`, `phone` | DB uses snake_case |
| `coverPhotoUrl`, `logoUrl` | `cover_photo_url`, `logo_url` | |
| `hoursJson` | `hours_json jsonb` | |
| `taxRate`, `currency` | `tax_rate`, `currency` | |
| `isActive` | `is_active` | |
| `lat`, `lng` | **not in base migration** | Use `settings_json` (e.g. `lat`, `lng`) or add a future migration; mapper defaults safely |
| `area` | **no column** | Derive from neighbourhood in `settings_json` or default `""` |
| `avgRating`, `totalReviews` | **no columns** | Analytics may live elsewhere; mapper defaults `0` until wired |
| `priceRange` | **no column** | Infer from `plan` / `business_type` or default `2` |
| `distanceKm` | **no column** | Compute client-side from user location vs lat/lng when present |
| `availability` | **no column** | Default e.g. `'Popular'` or derive from ops |
| `ambiance`, `tags`, `featuredIn` | **no columns** | Default `featuredIn: []` until marketing JSON exists |

**RLS gap (critical):** Current policies allow `SELECT` on `restaurants` only for **owner** of that restaurant or **admin** — not for anonymous customer discovery. Customer apps need a policy such as public read for `is_active = true` rows. See [`supabase-public-restaurants-policy.sql`](./supabase-public-restaurants-policy.sql).

## reservations

| Mobile `Reservation` | Postgres `reservations` | Notes |
|---------------------|--------------------------|--------|
| `id` | `id uuid` | |
| `restaurantId` | `restaurant_id` | |
| `guestId` | **DB uses `guest_id` → `guests.id`** | Mobile mock uses synthetic `g1`; production maps `guests` row linked to `user_profiles` |
| `tableId` | `table_id` | |
| `partySize`, `reservedAt`, `status`, `source` | same | |
| `confirmationCode` | **no column in migration** | Store in app layer or add column / use `id` short code |
| `specialRequest`, `occasion` | `special_request`, `occasion` | |
| `guestName` | on **`guests`** (`full_name`), not on reservation | Join guests |
| `preorderOrderId` | link via **`orders`** | |
| `depositAmount` | `deposit_amount` | |
| — | `shift_id` **NOT NULL** | Mobile flow must resolve a shift when creating reservations |
| — | timestamps `confirmed_at`, `seated_at`, etc. | Richer than mobile enum-only |

## orders

| Mobile `Order` | Postgres `orders` | Notes |
|----------------|-------------------|--------|
| `id`, `restaurantId`, `status`, subtotals | matching columns | snake_case in DB |
| `reservationId` | `reservation_id` **NOT NULL** | Mobile treats optional; DB requires reservation |
| — | `guest_id` **NOT NULL** | |
| `isPreorder` | `is_preorder` | |
| `items[]` | **separate `order_items` table** (see bible; may be added in later migrations) | Mobile embeds line items; app must join `order_items` when live |

## Shared types package

Database-aligned row types live in [`packages/types`](../../packages/types) (`@seatly/types`). App-facing `Restaurant` in `lib/mock/restaurants.ts` remains the UI model; [`lib/supabase/mapRestaurantRow.ts`](../../lib/supabase/mapRestaurantRow.ts) maps rows to that shape.
