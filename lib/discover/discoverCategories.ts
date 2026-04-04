import type { Restaurant } from '@/lib/mock/restaurants';

export const DISCOVER_CATEGORY_SLUGS = [
  'trending',
  'date-night',
  'outdoor-seating',
  'available-now',
  'taste',
] as const;

export type DiscoverCategorySlug = (typeof DISCOVER_CATEGORY_SLUGS)[number];

export function isDiscoverCategorySlug(s: string): s is DiscoverCategorySlug {
  return (DISCOVER_CATEGORY_SLUGS as readonly string[]).includes(s);
}

export function restaurantsForDiscoverCategory(
  slug: DiscoverCategorySlug,
  pool: Restaurant[],
): Restaurant[] {
  switch (slug) {
    case 'trending':
      return pool.filter((r) => r.featuredIn.includes('popular-near-you'));
    case 'date-night':
      return pool.filter((r) => r.featuredIn.includes('date-night-picks'));
    case 'outdoor-seating':
      return pool.filter((r) => r.featuredIn.includes('outdoor-seating'));
    case 'available-now':
      return pool.filter((r) => r.availability === 'Available Tonight');
    case 'taste':
      return pool.filter((r) => r.featuredIn.includes('recommended'));
    default:
      return [];
  }
}

export const DISCOVER_CATEGORY_TITLE_KEYS: Record<DiscoverCategorySlug, string> = {
  trending: 'discover.sectionTrending',
  'date-night': 'discover.sectionDateNight',
  'outdoor-seating': 'discover.sectionOutdoor',
  'available-now': 'discover.sectionAvailableNow',
  taste: 'discover.sectionTaste',
};
