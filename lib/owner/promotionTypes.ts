// Promotion type catalog shared between staff promotion creation and
// customer-side rendering. Keep in sync with the `EventType` union in
// lib/mock/events.ts; if you add a new promotion type both places must
// recognize it.

export const PROMOTION_TYPES = [
  { key: 'promotion',    label: 'Promotion' },
  { key: 'happy_hour',   label: 'Happy hour' },
  { key: 'tasting_menu', label: 'Tasting menu' },
  { key: 'event',        label: 'Event' },
] as const;

export type PromotionTypeKey = typeof PROMOTION_TYPES[number]['key'];
