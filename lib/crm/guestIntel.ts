import type { CrmGuest } from '@/lib/mock/ownerApp';

export type CrmFilterId = 'all' | 'vip' | 'high_spenders' | 'frequent' | 'at_risk' | 'new' | 'upcoming';

export type CrmSortId = 'highest_spend' | 'most_visits' | 'churn_risk' | 'upcoming_res';

/** Single-filter predicate (excludes `all`). */
export function matchesFilterRule(g: CrmGuest, f: Exclude<CrmFilterId, 'all'>): boolean {
  switch (f) {
    case 'vip':
      return g.isVIP === true;
    case 'high_spenders':
      return g.avgSpend > 120;
    case 'frequent':
      return g.visitFrequency >= 2;
    case 'at_risk':
      return g.churnRisk > 40;
    case 'new':
      return g.totalVisits <= 2;
    case 'upcoming':
      return g.hasUpcomingReservation === true;
    default:
      return true;
  }
}

/** Multi-filter: guest must match every selected rule (AND). */
export function matchesMultiFilters(g: CrmGuest, filters: Set<Exclude<CrmFilterId, 'all'>>): boolean {
  if (filters.size === 0) return true;
  for (const f of filters) {
    if (!matchesFilterRule(g, f)) return false;
  }
  return true;
}

/** Single active filter chip. */
export function matchesSingleFilter(g: CrmGuest, f: CrmFilterId): boolean {
  if (f === 'all') return true;
  return matchesFilterRule(g, f);
}

export function sortGuests(list: CrmGuest[], sort: CrmSortId): CrmGuest[] {
  const out = [...list];
  switch (sort) {
    case 'highest_spend':
      return out.sort((a, b) => b.avgSpend - a.avgSpend);
    case 'most_visits':
      return out.sort((a, b) => b.totalVisits - a.totalVisits);
    case 'churn_risk':
      return out.sort((a, b) => b.churnRisk - a.churnRisk);
    case 'upcoming_res':
      return out.sort((a, b) => {
        const au = a.hasUpcomingReservation ? 1 : 0;
        const bu = b.hasUpcomingReservation ? 1 : 0;
        if (bu !== au) return bu - au;
        return (b.predictedSpendTonight ?? 0) - (a.predictedSpendTonight ?? 0);
      });
    default:
      return out;
  }
}

export function daysSinceLastVisit(isoDate: string): number | null {
  const t = Date.parse(isoDate);
  if (Number.isNaN(t)) return null;
  const diff = Date.now() - t;
  return Math.floor(diff / 86400000);
}

export function searchMatchesGuest(g: CrmGuest, q: string): boolean {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  const hay = [g.name, g.preference, g.preferencesShort, g.notes, g.aiLine, g.nextBestAction]
    .join(' ')
    .toLowerCase();
  return hay.includes(s);
}
