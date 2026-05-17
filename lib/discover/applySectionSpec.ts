/**
 * Runner that turns a Restaurant pool + SectionSpec + UserSignals into an
 * ordered list of restaurants for a single Discover section.
 *
 *   1. Filter pool by spec.qualifies.
 *   2. If qualified set is empty AND the spec isn't strict (date-night,
 *      outdoor), fall back to the full pool — guarantees no section ever
 *      renders empty in production.
 *   3. Score each restaurant.
 *   4. Sort by score descending; tie-break with a deterministic per-section
 *      hash so identical-score restaurants land in different orders across
 *      sections.
 *   5. Slice to `limit` (default 12).
 */

import type { Restaurant } from '@/lib/mock/restaurants';
import { sectionTieBreak } from '@/lib/discover/scoreRestaurant';
import type { SectionSpec } from '@/lib/discover/sectionSpecs';
import type { UserSignals } from '@/lib/discover/useUserSignals';

export function applySectionSpec(
  pool: Restaurant[],
  spec: SectionSpec,
  signals: UserSignals,
  limit = 12,
): Restaurant[] {
  if (!pool.length) return [];
  // Defensive: a stale Metro hot-reload bundle can briefly hold a
  // section-spec import binding that no longer exists after a rename.
  // Crashing the whole Discover screen on render is worse than rendering
  // an empty section while the dev reloads.
  if (!spec || typeof spec.qualifies !== 'function' || typeof spec.score !== 'function') {
    return [];
  }

  let candidates = pool.filter(spec.qualifies);
  if (candidates.length === 0 && !spec.strictPool) {
    candidates = pool;
  }
  if (candidates.length === 0) return [];

  const scored = candidates.map((r) => ({
    r,
    score: spec.score(r, signals),
    tie: sectionTieBreak(r.id, spec.key),
  }));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.tie - a.tie;
  });

  return scored.slice(0, limit).map((x) => x.r);
}
