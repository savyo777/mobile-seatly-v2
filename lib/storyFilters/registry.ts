/**
 * Story-filter registry.
 *
 * The single source of truth the camera screen + the carousel both read.
 * Add a new filter by:
 *   1. Building its component under `components/storyFilters/filters/`.
 *   2. Adding its id to `StoryFilterId` in ./types.ts.
 *   3. Registering it here.
 *
 * Order matters — the carousel renders filters in this exact order.
 */
import type { StoryFilterEntry, StoryFilterId } from './types';
import { PinkBowDinner } from '@/components/storyFilters/filters/PinkBowDinner';
import { CoquetteDinner } from '@/components/storyFilters/filters/CoquetteDinner';
import { MartiniGirlsNight } from '@/components/storyFilters/filters/MartiniGirlsNight';
import { LipGlossNight } from '@/components/storyFilters/filters/LipGlossNight';
import { BirthdayPrincess } from '@/components/storyFilters/filters/BirthdayPrincess';
import { ButterflyGlow } from '@/components/storyFilters/filters/ButterflyGlow';
import { NoCrumbsLeft } from '@/components/storyFilters/filters/NoCrumbsLeft';
import { ShesExpensive } from '@/components/storyFilters/filters/ShesExpensive';
import { MainCharacterMeal } from '@/components/storyFilters/filters/MainCharacterMeal';
import { PrettyFoodOnly } from '@/components/storyFilters/filters/PrettyFoodOnly';
import { DinnerWasThePlot } from '@/components/storyFilters/filters/DinnerWasThePlot';
import { POVBestTable } from '@/components/storyFilters/filters/POVBestTable';
import { DateNightVerified } from '@/components/storyFilters/filters/DateNightVerified';
import { ChampagneGlow } from '@/components/storyFilters/filters/ChampagneGlow';
import { GoldenHourDinner } from '@/components/storyFilters/filters/GoldenHourDinner';
import { HiddenGem } from '@/components/storyFilters/filters/HiddenGem';
import { VelvetNight } from '@/components/storyFilters/filters/VelvetNight';
import { BlackCardDinner } from '@/components/storyFilters/filters/BlackCardDinner';
import { PastaNight } from '@/components/storyFilters/filters/PastaNight';
import { SushiDate } from '@/components/storyFilters/filters/SushiDate';
import { DessertFirst } from '@/components/storyFilters/filters/DessertFirst';
import { PizzaDate } from '@/components/storyFilters/filters/PizzaDate';
import { CocktailHour } from '@/components/storyFilters/filters/CocktailHour';
import { DinedAtRestaurant } from '@/components/storyFilters/filters/DinedAtRestaurant';
import { RestaurantLocationStamp } from '@/components/storyFilters/filters/RestaurantLocationStamp';
import { DinedInToronto } from '@/components/storyFilters/filters/DinedInToronto';
import { BookedOnCenaiva } from '@/components/storyFilters/filters/BookedOnCenaiva';
import { TableForTwo } from '@/components/storyFilters/filters/TableForTwo';
import { TonightsSpot } from '@/components/storyFilters/filters/TonightsSpot';
import { BestSeatInTheHouse } from '@/components/storyFilters/filters/BestSeatInTheHouse';

export const STORY_FILTERS: StoryFilterEntry[] = [
  {
    id: 'pink-bow-dinner',
    name: 'Pink Bow Dinner',
    shortLabel: 'Pink Bow',
    category: 'cute',
    watermark: 'tr',
    Component: PinkBowDinner,
  },
  {
    id: 'coquette-dinner',
    name: 'Coquette Dinner',
    shortLabel: 'Coquette',
    category: 'cute',
    watermark: 'tr',
    Component: CoquetteDinner,
  },
  {
    id: 'martini-girls-night',
    name: 'Martini Girls Night',
    shortLabel: 'Martini',
    category: 'cute',
    watermark: 'tr',
    Component: MartiniGirlsNight,
  },
  {
    id: 'lip-gloss-night',
    name: 'Lip Gloss Night',
    shortLabel: 'Lip Gloss',
    category: 'cute',
    watermark: 'tr',
    Component: LipGlossNight,
  },
  {
    id: 'birthday-princess',
    name: 'Birthday Princess',
    shortLabel: 'Birthday',
    category: 'cute',
    watermark: 'tr',
    Component: BirthdayPrincess,
  },
  {
    id: 'butterfly-glow',
    name: 'Butterfly Glow',
    shortLabel: 'Butterfly',
    category: 'cute',
    watermark: 'tr',
    Component: ButterflyGlow,
  },
  {
    id: 'no-crumbs-left',
    name: 'No Crumbs Left',
    shortLabel: 'Crumbs',
    category: 'playful',
    watermark: 'tr',
    Component: NoCrumbsLeft,
  },
  {
    id: 'shes-expensive',
    name: "She's Expensive",
    shortLabel: 'Expensive',
    category: 'playful',
    watermark: 'tr',
    Component: ShesExpensive,
  },
  {
    id: 'main-character-meal',
    name: 'Main Character Meal',
    shortLabel: 'Main Meal',
    category: 'playful',
    watermark: 'tr',
    Component: MainCharacterMeal,
  },
  {
    id: 'pretty-food-only',
    name: 'Pretty Food Only',
    shortLabel: 'Pretty',
    category: 'playful',
    watermark: 'bl',
    Component: PrettyFoodOnly,
  },
  {
    id: 'dinner-was-the-plot',
    name: 'Dinner Was the Plot',
    shortLabel: 'Plot',
    category: 'playful',
    watermark: 'tr',
    Component: DinnerWasThePlot,
  },
  {
    id: 'pov-best-table',
    name: 'POV: Best Table',
    shortLabel: 'POV',
    category: 'playful',
    watermark: 'bl',
    Component: POVBestTable,
  },
  {
    id: 'date-night-verified',
    name: 'Date Night Verified',
    shortLabel: 'Verified',
    category: 'fancy',
    watermark: 'tr',
    Component: DateNightVerified,
  },
  {
    id: 'champagne-glow',
    name: 'Champagne Glow',
    shortLabel: 'Champagne',
    category: 'fancy',
    watermark: 'tr',
    Component: ChampagneGlow,
  },
  {
    id: 'golden-hour-dinner',
    name: 'Golden Hour Dinner',
    shortLabel: 'Golden',
    category: 'fancy',
    watermark: 'tr',
    Component: GoldenHourDinner,
  },
  {
    id: 'hidden-gem',
    name: 'Hidden Gem',
    shortLabel: 'Gem',
    category: 'fancy',
    watermark: 'bl',
    Component: HiddenGem,
  },
  {
    id: 'velvet-night',
    name: 'Velvet Night',
    shortLabel: 'Velvet',
    category: 'fancy',
    watermark: 'tr',
    Component: VelvetNight,
  },
  {
    id: 'black-card-dinner',
    name: 'Black Card Dinner',
    shortLabel: 'Black Card',
    category: 'fancy',
    watermark: 'tr',
    Component: BlackCardDinner,
  },
  {
    id: 'pasta-night',
    name: 'Pasta Night',
    shortLabel: 'Pasta',
    category: 'food',
    watermark: 'tr',
    Component: PastaNight,
  },
  {
    id: 'sushi-date',
    name: 'Sushi Date',
    shortLabel: 'Sushi',
    category: 'food',
    watermark: 'tr',
    Component: SushiDate,
  },
  {
    id: 'dessert-first',
    name: 'Dessert First',
    shortLabel: 'Dessert',
    category: 'food',
    watermark: 'tr',
    Component: DessertFirst,
  },
  {
    id: 'pizza-date',
    name: 'Pizza Date',
    shortLabel: 'Pizza',
    category: 'food',
    watermark: 'tr',
    Component: PizzaDate,
  },
  {
    id: 'cocktail-hour',
    name: 'Cocktail Hour',
    shortLabel: 'Cocktail',
    category: 'food',
    watermark: 'tr',
    Component: CocktailHour,
  },
  {
    id: 'dined-at-restaurant',
    name: 'Dined at Restaurant',
    shortLabel: 'Dined At',
    category: 'location',
    watermark: 'tr',
    Component: DinedAtRestaurant,
  },
  {
    id: 'restaurant-location-stamp',
    name: 'Restaurant Location Stamp',
    shortLabel: 'Where Dined',
    category: 'location',
    watermark: 'tr',
    Component: RestaurantLocationStamp,
  },
  {
    id: 'dined-in-toronto',
    name: 'Dined in City',
    shortLabel: 'City',
    category: 'location',
    watermark: 'tr',
    Component: DinedInToronto,
  },
  {
    id: 'booked-on-cenaiva',
    name: 'Booked on Cenaiva',
    shortLabel: 'Booked',
    category: 'location',
    watermark: 'tr',
    Component: BookedOnCenaiva,
  },
  {
    id: 'table-for-two',
    name: 'Table for Two',
    shortLabel: 'Table',
    category: 'location',
    watermark: 'tr',
    Component: TableForTwo,
  },
  {
    id: 'tonights-spot',
    name: "Tonight's Spot",
    shortLabel: 'Spot',
    category: 'location',
    watermark: 'tr',
    Component: TonightsSpot,
  },
  {
    id: 'best-seat-in-the-house',
    name: 'Best Seat in the House',
    shortLabel: 'Best Seat',
    category: 'location',
    watermark: 'bl',
    Component: BestSeatInTheHouse,
  },
];

export function getStoryFilterById(id: StoryFilterId): StoryFilterEntry | null {
  return STORY_FILTERS.find((f) => f.id === id) ?? null;
}

/** Quick metadata lookup without re-importing the component map. */
export function listStoryFilterIds(): StoryFilterId[] {
  return STORY_FILTERS.map((f) => f.id);
}
