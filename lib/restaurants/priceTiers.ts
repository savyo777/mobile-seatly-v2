// Price tier display options ($, $$, $$$, $$$$). Used by the restaurant
// edit form and (transitively) by anywhere that renders the price tier.

export const PRICE_TIER_OPTIONS = ['$', '$$', '$$$', '$$$$'] as const;
export type PriceTier = typeof PRICE_TIER_OPTIONS[number];
