import type { TFunction } from 'i18next';
import type { Restaurant } from '@/lib/mock/restaurants';

export type DiscoverBadgeKind = 'top_rated' | 'popular' | 'available_now';

/** Best match: highest rated in current result set */
export function pickFeaturedRestaurant(restaurants: Restaurant[]): Restaurant | null {
  if (!restaurants.length) return null;
  return [...restaurants].sort((a, b) => b.avgRating - a.avgRating || b.totalReviews - a.totalReviews)[0];
}

const SLOT_TIMES = ['6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM'];

/** Deterministic urgency copy for conversion UI */
export function getUrgencyCopy(r: Restaurant, t: TFunction): { line: string; sub?: string } {
  const n = parseInt(r.id.replace(/\D/g, '') || '3', 10);
  const tables = 1 + (n % 5);
  const slot = SLOT_TIMES[n % SLOT_TIMES.length];
  const sub = t('discover.nextSlot', { time: slot });

  if (r.availability === 'Available Tonight') {
    if (tables <= 3) {
      return {
        line:
          tables === 1
            ? t('discover.urgencyOneTableLeft')
            : t('discover.urgencyTablesLeft', { count: tables }),
        sub,
      };
    }
    return { line: t('discover.urgencyAvailableNow'), sub };
  }
  return { line: t('discover.urgencyLimitedTonight'), sub };
}

export function getDiscoverBadges(r: Restaurant): DiscoverBadgeKind[] {
  const out: DiscoverBadgeKind[] = [];
  if (r.avgRating >= 4.7) out.push('top_rated');
  if (r.featuredIn.includes('popular-near-you')) out.push('popular');
  if (r.availability === 'Available Tonight') out.push('available_now');
  return out.slice(0, 2);
}

export function shortTagLine(r: Restaurant): string {
  if (r.ambiance.length <= 28) return r.ambiance;
  const tag = r.tags[0];
  return tag ?? r.ambiance.slice(0, 26) + '…';
}
