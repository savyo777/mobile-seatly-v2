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

  // Wrap the entire scoring pipeline so a bad spec entry, a malformed
  // restaurant row, or an unexpected signal shape can never take down the
  // tab — the Discover screen is eagerly mounted by the Tabs navigator,
  // so a render error here would surface across the whole app even when
  // the user is on a different tab.
  try {
    let candidates = pool.filter((r) => {
      try {
        return spec.qualifies(r);
      } catch {
        return false;
      }
    });
    if (candidates.length === 0 && !spec.strictPool) {
      candidates = pool;
    }
    if (candidates.length === 0) return [];

    const scored = candidates.map((r) => {
      let score = 0;
      try {
        score = spec.score(r, signals);
      } catch {
        score = 0;
      }
      return { r, score, tie: sectionTieBreak(r.id, spec.key) };
    });

    scored.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.tie - a.tie;
    });

    return scored.slice(0, limit).map((x) => x.r);
  } catch {
    return [];
  }
}
