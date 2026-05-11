// Canonical list of restaurant types ("business_type"). Kept in sync with the
// CHECK constraint on public.restaurants.business_type and the values stored
// in public.user_profiles.preferred_business_types.
//
// Adding or renaming an entry here requires a matching DB migration that
// updates the CHECK constraint — the constraint is the source of truth.

export const BUSINESS_TYPES = [
  'Cafe',
  'Casual dining',
  'Fast casual',
  'Fine dining',
  'Bistro',
  'Steakhouse',
  'Bar',
  'Cocktail bar / Lounge',
  'Wine bar',
  'Sports bar',
  'Pub',
  'Brewery',
  'Bakery',
  'Brunch spot',
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];
