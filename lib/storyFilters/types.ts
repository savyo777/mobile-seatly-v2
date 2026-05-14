/**
 * Cenaiva Story Filters — type system.
 *
 * Cenaiva story overlays across 5 categories.
 *
 * Render contract:
 *   - <StoryFilterFrame photo={uri} filter={filterId} />
 *     The frame draws the photo, applies subtle grain + vignette, then
 *     mounts the chosen filter component which positions all decorative
 *     bits absolutely over the photo.
 *   - Every filter component MUST place a <StoryWatermark /> "by Cenaiva"
 *     in the corner the reference specifies (TR or BL).
 */
import type { ComponentType } from 'react';

export type StoryFilterCategory =
  | 'cute'      // 01 / Girls Night — pink, pearls, bows, sparkles
  | 'playful'   // 02 / Funny one-liners — hand-written tags, tickets
  | 'fancy'     // 03 / Date Night — gold, velvet, glow
  | 'food'      // 04 / By the dish — doodles, stamps
  | 'location'; // 05 / Booked & Dined — pins, confirms, polaroid

export type StoryFilterCategoryMeta = {
  id: StoryFilterCategory;
  /** "01 / CUTE" */
  num: string;
  /** "Girls Night" */
  title: string;
  /** Short caption shown beside the title in the picker. */
  subtitle: string;
};

export const STORY_CATEGORIES: StoryFilterCategoryMeta[] = [
  { id: 'cute',     num: '01 / CUTE',     title: 'Girls Night',         subtitle: 'Pink, pearls, bows.' },
  { id: 'playful',  num: '02 / PLAYFUL',  title: 'Funny one-liners',    subtitle: 'Tags & tickets.' },
  { id: 'fancy',    num: '03 / FANCY',    title: 'Date Night',          subtitle: 'Gold, velvet, glow.' },
  { id: 'food',     num: '04 / FOOD',     title: 'By the dish',         subtitle: 'Doodles & stamps.' },
  { id: 'location', num: '05 / LOCATION', title: 'Booked & Dined',      subtitle: 'Pins & confirms.' },
];

/** All filter ids — keep this in sync with the registry. */
export type StoryFilterId =
  // 01 · CUTE
  | 'pink-bow-dinner'
  | 'coquette-dinner'
  | 'martini-girls-night'
  | 'lip-gloss-night'
  | 'birthday-princess'
  | 'butterfly-glow'
  // 02 · PLAYFUL
  | 'no-crumbs-left'
  | 'shes-expensive'
  | 'main-character-meal'
  | 'pretty-food-only'
  | 'dinner-was-the-plot'
  | 'pov-best-table'
  // 03 · FANCY
  | 'date-night-verified'
  | 'champagne-glow'
  | 'golden-hour-dinner'
  | 'hidden-gem'
  | 'velvet-night'
  | 'black-card-dinner'
  // 04 · FOOD
  | 'pasta-night'
  | 'sushi-date'
  | 'dessert-first'
  | 'pizza-date'
  | 'cocktail-hour'
  // 05 · LOCATION
  | 'dined-at-restaurant'
  | 'restaurant-location-stamp'
  | 'dined-in-toronto'
  | 'booked-on-cenaiva'
  | 'table-for-two'
  | 'tonights-spot'
  | 'best-seat-in-the-house';

export type StoryFilterMeta = {
  id: StoryFilterId;
  name: string;
  category: StoryFilterCategory;
  /** Short label shown beside the chip in the carousel. */
  shortLabel: string;
  /** Where the watermark sits. The reference fixes this per filter. */
  watermark: 'tr' | 'bl';
};

/** Props every filter component receives. */
export type StoryFilterProps = {
  /** Frame width — used to scale interior decorations responsively. */
  width: number;
  /** Frame height — used to scale interior decorations responsively. */
  height: number;
  /** Original capture timestamp in milliseconds since epoch. */
  capturedAt?: number;
  restaurantName?: string;
  city?: string;
  area?: string;
};

/** A registry entry: metadata + the component that renders the overlay. */
export type StoryFilterEntry = StoryFilterMeta & {
  Component: ComponentType<StoryFilterProps>;
};
