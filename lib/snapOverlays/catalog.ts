import type { SnapOverlayCategoryId, SnapOverlayDefinition } from './types';

export const SNAP_OVERLAY_NONE_ID = 'none';

export const SNAP_OVERLAY_CATEGORIES: {
  id: SnapOverlayCategoryId;
  title: string;
}[] = [
  { id: 'branded', title: 'Cenaiva Branded' },
  { id: 'location', title: 'Location' },
  { id: 'occasion', title: 'Occasion' },
  { id: 'food', title: 'Food' },
  { id: 'vibe', title: 'Vibe' },
  { id: 'review', title: 'Review' },
];

export const SNAP_OVERLAYS: SnapOverlayDefinition[] = [
  // Cenaiva Branded
  { id: 'branded.dined-by-cenaiva', categoryId: 'branded', label: 'Dined by Cenaiva' },
  { id: 'branded.booked-on-cenaiva', categoryId: 'branded', label: 'Booked on Cenaiva' },
  { id: 'branded.night-out-cenaiva', categoryId: 'branded', label: 'Cenaiva Night Out' },
  { id: 'branded.pick-cenaiva', categoryId: 'branded', label: 'Cenaiva Pick' },
  { id: 'branded.hidden-gem-cenaiva', categoryId: 'branded', label: 'Hidden Gem · Cenaiva' },
  { id: 'branded.date-night-cenaiva', categoryId: 'branded', label: 'Date Night · Cenaiva' },
  { id: 'branded.a-cenaiva-find', categoryId: 'branded', label: 'A Cenaiva Find' },
  // Location (labels match in-app sticker descriptions)
  { id: 'loc.dinner-at', categoryId: 'location', label: 'Dinner at …' },
  { id: 'loc.name-city', categoryId: 'location', label: '{Name} · {City}' },
  { id: 'loc.booked-for-time', categoryId: 'location', label: 'Booked for {Time}' },
  { id: 'loc.table-for-party', categoryId: 'location', label: 'Table for {Party}' },
  { id: 'loc.tonight-at', categoryId: 'location', label: 'Tonight at …' },
  // Occasion
  { id: 'occ.birthday', categoryId: 'occasion', label: 'Birthday Dinner' },
  { id: 'occ.date-night', categoryId: 'occasion', label: 'Date Night' },
  { id: 'occ.anniversary', categoryId: 'occasion', label: 'Anniversary' },
  { id: 'occ.family', categoryId: 'occasion', label: 'Family Dinner' },
  { id: 'occ.girls-night', categoryId: 'occasion', label: 'Girls Night' },
  { id: 'occ.boys-night', categoryId: 'occasion', label: 'Boys Night' },
  { id: 'occ.business', categoryId: 'occasion', label: 'Business Dinner' },
  { id: 'occ.late-night', categoryId: 'occasion', label: 'Late Night Eats' },
  // Food
  { id: 'food.pizza-night', categoryId: 'food', label: 'Pizza Night' },
  { id: 'food.omakase', categoryId: 'food', label: 'Omakase' },
  { id: 'food.pasta-bar', categoryId: 'food', label: 'Pasta Bar' },
  { id: 'food.burger-run', categoryId: 'food', label: 'Burger Run' },
  { id: 'food.sweet-bite', categoryId: 'food', label: 'Sweet Bite' },
  { id: 'food.coffee-break', categoryId: 'food', label: 'Coffee Break' },
  { id: 'food.spicy', categoryId: 'food', label: 'Spicy' },
  { id: 'food.brunch', categoryId: 'food', label: 'Brunch' },
  { id: 'food.first-bite', categoryId: 'food', label: 'First Bite' },
  { id: 'food.must-try', categoryId: 'food', label: 'Must Try' },
  // Vibe
  { id: 'vibe.palm-patio', categoryId: 'vibe', label: 'Palm Patio' },
  { id: 'vibe.golden-sunset', categoryId: 'vibe', label: 'Golden Sunset' },
  { id: 'vibe.rooftop-lights', categoryId: 'vibe', label: 'Rooftop Lights' },
  { id: 'vibe.out-tonight', categoryId: 'vibe', label: 'Out Tonight' },
  { id: 'vibe.luxury-frame', categoryId: 'vibe', label: 'Luxury Frame' },
  { id: 'vibe.flash', categoryId: 'vibe', label: 'Flash' },
  // Review
  { id: 'rev.worth-it', categoryId: 'review', label: 'Worth it?' },
  { id: 'rev.best-dish', categoryId: 'review', label: 'Best dish of the night' },
  { id: 'rev.come-back', categoryId: 'review', label: 'Would you come back?' },
  { id: 'rev.rate-bite', categoryId: 'review', label: 'Rate the bite' },
  { id: 'rev.cenaiva-score', categoryId: 'review', label: 'Cenaiva Score' },
  { id: 'rev.hidden-or-hyped', categoryId: 'review', label: 'Hidden gem or overhyped?' },
  { id: 'rev.my-order', categoryId: 'review', label: 'My order' },
  { id: 'rev.the-vibe', categoryId: 'review', label: 'The vibe' },
  { id: 'rev.the-food', categoryId: 'review', label: 'The food' },
  { id: 'rev.the-service', categoryId: 'review', label: 'The service' },
];

export function overlaysForCategory(categoryId: SnapOverlayCategoryId): SnapOverlayDefinition[] {
  return SNAP_OVERLAYS.filter((o) => o.categoryId === categoryId);
}
