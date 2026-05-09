// Diner tier (engagement) — separate from the points-based loyalty tiers.
// Tracks how many completed dines a customer has logged.

export type DinerTier = {
  name: 'Regular' | 'Insider' | 'Elite';
  min: number;
};

export const DINER_TIERS: readonly DinerTier[] = [
  { name: 'Regular', min: 0 },
  { name: 'Insider', min: 16 },
  { name: 'Elite',   min: 32 },
] as const;

export function getDinerTier(dinners: number): DinerTier {
  let current = DINER_TIERS[0];
  for (const tier of DINER_TIERS) {
    if (dinners >= tier.min) current = tier;
  }
  return current;
}

export function getNextDinerTier(dinners: number): DinerTier | null {
  for (const tier of DINER_TIERS) {
    if (dinners < tier.min) return tier;
  }
  return null;
}

export function dinersToNextTier(dinners: number): number {
  const next = getNextDinerTier(dinners);
  return next ? Math.max(0, next.min - dinners) : 0;
}
