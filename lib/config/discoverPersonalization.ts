/**
 * Discover personalization flag.
 *
 * When true, each horizontal section on the Discover home tab runs through
 * lib/discover/applySectionSpec — sections render distinct, score-ranked
 * lists tailored to the current user's preferred cuisines, dining vibes,
 * recent bookings, snap/review history, and geolocation. Cold-start users
 * (no signals) still see a polished, section-distinct feed driven by rating
 * and popularity.
 *
 * When false, the screen falls back to the prior data-derivation logic
 * (sections may collapse to the same 12 restaurants when DB rows lack
 * featured_in tags — the original behavior).
 *
 * Independent of the discoverDensity and discoverFullBleed flags. Flip the
 * single constant below and hot-reload to revert.
 */
const PERSONALIZED_DISCOVER = true;

export function isPersonalizedDiscoverEnabled(): boolean {
  return PERSONALIZED_DISCOVER;
}
