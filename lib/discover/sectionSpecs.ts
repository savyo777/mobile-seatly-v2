/**
 * Section specs for the personalized Discover home tab.
 *
 * Each section is a pair of pure functions:
 *   - qualifies(r):  does this restaurant belong in this section?
 *   - score(r, s):   how strongly should it rank for THIS user?
 *
 * Different score weights across sections guarantee different orderings
 * even when the qualifying pools overlap — solving the user's main
 * complaint that every section showed the same 12 restaurants.
 *
 * The keyword constants at the top of this file are the levers — tweak
 * KEYWORDS_DATE_NIGHT, KEYWORDS_OUTDOOR, etc. to widen / narrow what
 * counts for each section.
 */

import type { Restaurant } from '@/lib/mock/restaurants';
import {
  cuisineMatchScore,
  distanceScore,
  dietaryPenalty,
  popularityScore,
  ratingScore,
  recentVisitScore,
  vibeMatchScore,
} from '@/lib/discover/scoreRestaurant';
import type { UserSignals } from '@/lib/discover/useUserSignals';

export type SectionKey =
  | 'trending'
  | 'dateNight'
  | 'outdoor'
  | 'taste'
  | 'mostSnapped'
  | 'nearby';

export type SectionSpec = {
  key: SectionKey;
  qualifies: (r: Restaurant) => boolean;
  score: (r: Restaurant, s: UserSignals) => number;
  /** When true the section never falls back to the universal pool. */
  strictPool?: boolean;
};

const KEYWORDS_DATE_NIGHT = /(date|romantic|intimate|candle|chef|tasting|wine\s*pair)/i;
const KEYWORDS_OUTDOOR = /(patio|rooftop|terrace|outdoor|garden|alfresco|sidewalk)/i;
const DATE_NIGHT_VIBES = ['date night', 'romantic', 'celebration', "chef's tasting"];
const OUTDOOR_VIBES = ['patio', 'rooftop'];

function matchesPattern(restaurant: Restaurant, pattern: RegExp): boolean {
  const haystack = [restaurant.ambiance, ...(restaurant.tags ?? [])].join(' | ');
  return pattern.test(haystack);
}

function trendingQualifies(r: Restaurant): boolean {
  return (
    r.availability === 'Available Tonight' ||
    r.availability === 'Popular' ||
    r.featuredIn.includes('popular-near-you')
  );
}

function dateNightQualifies(r: Restaurant): boolean {
  return r.featuredIn.includes('date-night-picks') || matchesPattern(r, KEYWORDS_DATE_NIGHT);
}

function outdoorQualifies(r: Restaurant): boolean {
  return r.featuredIn.includes('outdoor-seating') || matchesPattern(r, KEYWORDS_OUTDOOR);
}

function mostSnappedQualifies(r: Restaurant): boolean {
  return (r.totalReviews ?? 0) > 0;
}

function alwaysQualifies(): boolean {
  return true;
}

export const SECTION_SPECS: Record<SectionKey, SectionSpec> = {
  trending: {
    key: 'trending',
    qualifies: trendingQualifies,
    score: (r, s) =>
      0.40 * recentVisitScore(r.id, s.recentBookings) +
      0.30 * popularityScore(r) +
      0.20 * distanceScore(r, s.userLocation) +
      0.10 * ratingScore(r) +
      dietaryPenalty(r, s.dietaryRestrictions),
  },
  dateNight: {
    key: 'dateNight',
    qualifies: dateNightQualifies,
    strictPool: true,
    score: (r, s) => {
      const userDateVibes = s.diningVibes.length
        ? s.diningVibes.filter((v) => DATE_NIGHT_VIBES.some((d) => v.toLowerCase().includes(d)))
        : DATE_NIGHT_VIBES;
      return (
        0.40 * vibeMatchScore(r, userDateVibes) +
        0.30 * ratingScore(r) +
        0.20 * cuisineMatchScore(r, s.preferredCuisines) +
        0.10 * distanceScore(r, s.userLocation) +
        dietaryPenalty(r, s.dietaryRestrictions)
      );
    },
  },
  outdoor: {
    key: 'outdoor',
    qualifies: outdoorQualifies,
    strictPool: true,
    score: (r, s) => {
      const userOutdoorVibes = s.diningVibes.length
        ? s.diningVibes.filter((v) => OUTDOOR_VIBES.some((d) => v.toLowerCase().includes(d)))
        : OUTDOOR_VIBES;
      return (
        0.50 * distanceScore(r, s.userLocation) +
        0.30 * ratingScore(r) +
        0.20 * vibeMatchScore(r, userOutdoorVibes) +
        dietaryPenalty(r, s.dietaryRestrictions)
      );
    },
  },
  taste: {
    key: 'taste',
    qualifies: alwaysQualifies,
    score: (r, s) =>
      0.50 * cuisineMatchScore(r, s.preferredCuisines) +
      0.20 * vibeMatchScore(r, s.diningVibes) +
      0.20 * ratingScore(r) +
      0.10 * recentVisitScore(r.id, s.recentBookings) +
      dietaryPenalty(r, s.dietaryRestrictions),
  },
  mostSnapped: {
    key: 'mostSnapped',
    qualifies: mostSnappedQualifies,
    score: (r, s) =>
      0.50 * popularityScore(r) +
      0.30 * ratingScore(r) +
      0.20 * recentVisitScore(r.id, s.recentBookings) +
      dietaryPenalty(r, s.dietaryRestrictions),
  },
  nearby: {
    // "Trending in your area." Weighted toward distance so the list is
    // bookable for the current user; falls back gracefully to popularity
    // + rating when location permission isn't granted (distanceScore
    // returns 0 for everyone, so the other terms dominate).
    key: 'nearby',
    qualifies: alwaysQualifies,
    score: (r, s) =>
      0.40 * distanceScore(r, s.userLocation) +
      0.30 * popularityScore(r) +
      0.20 * ratingScore(r) +
      0.10 * recentVisitScore(r.id, s.recentBookings) +
      dietaryPenalty(r, s.dietaryRestrictions),
  },
};
