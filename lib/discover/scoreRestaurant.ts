/**
 * Pure scoring primitives for the Discover personalization layer.
 *
 * Each helper returns a normalized 0..1 score (higher = better fit) except
 * dietaryPenalty, which returns a small negative number when the user's
 * dietary restrictions conflict with the restaurant's cuisine. Scores are
 * intentionally simple and explainable — section specs combine them with
 * weights to produce per-section rankings.
 *
 * All helpers are pure: same inputs always produce the same output, no
 * external state, no exceptions. Cold-start users (no signal) get 0 from
 * every signal-dependent helper, so section specs that lean on rating +
 * popularity (which are always available) still produce sensible orderings.
 */

import type { Restaurant } from '@/lib/mock/restaurants';
import { haversineMeters } from '@/lib/map/geo';

/** 1.0 strong match, 0.5 partial substring match, 0 otherwise. */
export function cuisineMatchScore(restaurant: Restaurant, preferred: string[]): number {
  if (!preferred.length) return 0;
  const restaurantCuisine = restaurant.cuisineType.toLowerCase();
  const businessType = (restaurant.businessType ?? '').toLowerCase();
  let best = 0;
  for (const pref of preferred) {
    const p = pref.toLowerCase().trim();
    if (!p) continue;
    if (restaurantCuisine === p || businessType === p) return 1;
    if (restaurantCuisine.includes(p) || p.includes(restaurantCuisine) || businessType.includes(p)) {
      best = Math.max(best, 0.5);
    }
  }
  return best;
}

/**
 * Match preferred vibes (e.g. "Date night", "Patio", "Quiet table") against
 * restaurant.ambiance + restaurant.tags. Each hit adds to the score, capped
 * at 1.0.
 */
export function vibeMatchScore(restaurant: Restaurant, preferredVibes: string[]): number {
  if (!preferredVibes.length) return 0;
  const haystack = [restaurant.ambiance, ...(restaurant.tags ?? [])]
    .map((s) => (s ?? '').toLowerCase())
    .join(' | ');
  let score = 0;
  for (const vibe of preferredVibes) {
    const v = vibe.toLowerCase().trim();
    if (!v) continue;
    if (haystack.includes(v)) score += 0.5;
  }
  return Math.min(1, score);
}

/**
 * Exponential decay from the user's current location to the restaurant.
 * ~1.0 within 500m, 0.5 at ~5km, near 0 by 20km. Returns 0 when either
 * coordinate is missing so cold-start users without geo aren't penalized
 * relative to each other.
 */
export function distanceScore(
  restaurant: Restaurant,
  userLocation: { lat: number; lng: number } | null,
): number {
  if (!userLocation || restaurant.lat == null || restaurant.lng == null) return 0;
  const meters = haversineMeters(userLocation.lat, userLocation.lng, restaurant.lat, restaurant.lng);
  const km = meters / 1000;
  return Math.max(0, Math.min(1, Math.exp(-km / 5)));
}

/**
 * Boost restaurants the user visited recently. 1.0 if a booking is <=7 days
 * old, decaying to ~0.1 at 90 days, 0 beyond. Returns 0 when there's no
 * booking for this restaurant in the recent window.
 */
export function recentVisitScore(
  restaurantId: string,
  recentBookings: { restaurantId: string; whenIso: string }[],
  nowMs: number = Date.now(),
): number {
  let bestScore = 0;
  for (const b of recentBookings) {
    if (b.restaurantId !== restaurantId) continue;
    const t = Date.parse(b.whenIso);
    if (!Number.isFinite(t)) continue;
    const daysAgo = Math.max(0, (nowMs - t) / 86_400_000);
    const score = daysAgo <= 7 ? 1 : Math.max(0, Math.exp(-(daysAgo - 7) / 30));
    if (score > bestScore) bestScore = score;
  }
  return bestScore;
}

/** Simple linear normalization of avgRating from 0..5 to 0..1. */
export function ratingScore(restaurant: Restaurant): number {
  const r = restaurant.avgRating ?? 0;
  return Math.max(0, Math.min(1, r / 5));
}

/** Log-scaled total reviews. 1.0 ~ 1000+ reviews, 0.5 ~ 30 reviews, 0 if none. */
export function popularityScore(restaurant: Restaurant): number {
  const total = Math.max(0, restaurant.totalReviews ?? 0);
  if (total === 0) return 0;
  return Math.min(1, Math.log10(total + 1) / 3);
}

/**
 * Soft penalty (returns a negative number to subtract from the section
 * score) when the user's dietary restrictions are likely to conflict with
 * the restaurant. Detection is heuristic — substring match against the
 * restaurant's cuisine + tags. Returns 0 when no conflict.
 *
 * Soft by design: a vegan user's steakhouse results sink in every section
 * but aren't hidden, preserving discovery breadth.
 */
const DIETARY_CONFLICT_KEYWORDS: Record<string, string[]> = {
  vegan: ['steakhouse', 'bbq', 'grill', 'butcher', 'seafood', 'sushi', 'meat', 'chop'],
  vegetarian: ['steakhouse', 'bbq', 'butcher', 'meat', 'chop'],
  pescatarian: ['steakhouse', 'bbq', 'butcher', 'meat', 'chop'],
  halal: ['pork', 'bbq', 'wine', 'cocktail', 'bar', 'cantina'],
  kosher: ['pork', 'shellfish', 'sushi', 'seafood', 'bbq', 'butcher'],
  'gluten-free': ['pizzeria', 'noodle', 'ramen', 'pasta', 'bakery'],
  'shellfish-free': ['seafood', 'sushi', 'oyster'],
  'no alcohol': ['wine', 'cocktail', 'bar', 'speakeasy', 'pub', 'brewery'],
};

export function dietaryPenalty(restaurant: Restaurant, dietaryRestrictions: string[]): number {
  if (!dietaryRestrictions.length) return 0;
  const haystack = [
    restaurant.cuisineType,
    restaurant.businessType ?? '',
    restaurant.ambiance,
    ...(restaurant.tags ?? []),
  ]
    .map((s) => s.toLowerCase())
    .join(' | ');
  for (const restriction of dietaryRestrictions) {
    const keywords = DIETARY_CONFLICT_KEYWORDS[restriction.toLowerCase().trim()];
    if (!keywords) continue;
    if (keywords.some((kw) => haystack.includes(kw))) {
      return -0.3;
    }
  }
  return 0;
}

/**
 * Deterministic tie-break value derived from restaurantId + sectionKey.
 * Same restaurant gets a DIFFERENT tie-break value in different sections,
 * so when several restaurants score equally the per-section ordering varies
 * — protecting the user from seeing identical sequences when scores collide.
 */
export function sectionTieBreak(restaurantId: string, sectionKey: string): number {
  const input = `${sectionKey}::${restaurantId}`;
  let h = 0;
  for (let i = 0; i < input.length; i += 1) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return (h >>> 0) / 0xffffffff;
}
