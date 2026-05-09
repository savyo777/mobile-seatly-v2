// Loyalty tier definitions — single source of truth shared by every screen
// that renders a tier badge or computes "points to next tier". Previously
// duplicated across loyalty.tsx (GOLD_THRESHOLD = 2000) and settings.tsx
// (Gold = 1500), which produced inconsistent tier labels for the same user.

export type LoyaltyTier = {
  name: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  min: number;
  color: string;
};

export const LOYALTY_TIERS: readonly LoyaltyTier[] = [
  { name: 'Bronze',   min: 0,    color: '#CD7F32' },
  { name: 'Silver',   min: 500,  color: '#A8A8B8' },
  { name: 'Gold',     min: 1500, color: '#C9A84C' },
  { name: 'Platinum', min: 3000, color: '#E2E2F0' },
] as const;

export function getLoyaltyTier(points: number): LoyaltyTier {
  let current: LoyaltyTier = LOYALTY_TIERS[0];
  for (const tier of LOYALTY_TIERS) {
    if (points >= tier.min) current = tier;
  }
  return current;
}

export function getNextLoyaltyTier(points: number): LoyaltyTier | null {
  for (const tier of LOYALTY_TIERS) {
    if (points < tier.min) return tier;
  }
  return null;
}

export function pointsToNextLoyaltyTier(points: number): number {
  const next = getNextLoyaltyTier(points);
  return next ? Math.max(0, next.min - points) : 0;
}

// Progress (0..1) toward the next tier. When the user is already at the
// highest tier, returns 1.
export function loyaltyTierProgress(points: number): number {
  const current = getLoyaltyTier(points);
  const next = getNextLoyaltyTier(points);
  if (!next) return 1;
  const span = next.min - current.min;
  if (span <= 0) return 1;
  return Math.min(1, Math.max(0, (points - current.min) / span));
}
