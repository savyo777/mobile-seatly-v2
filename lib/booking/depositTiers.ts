export type DepositTier = {
  min_party_size: number;
  amount_per_person_cents: number;
};

export function readDepositTiers(raw: unknown): DepositTier[] {
  if (!Array.isArray(raw)) return [];
  const out: DepositTier[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const e = entry as Record<string, unknown>;
    const minPartySize = typeof e.min_party_size === 'number' ? e.min_party_size : Number(e.min_party_size);
    const amountPerPersonCents = typeof e.amount_per_person_cents === 'number'
      ? e.amount_per_person_cents
      : Number(e.amount_per_person_cents);
    if (!Number.isFinite(minPartySize) || !Number.isFinite(amountPerPersonCents)) continue;
    if (minPartySize < 1 || amountPerPersonCents < 0) continue;
    out.push({
      min_party_size: Math.floor(minPartySize),
      amount_per_person_cents: Math.floor(amountPerPersonCents),
    });
  }
  return out;
}

export function previewDepositCents(
  tiers: DepositTier[] | null | undefined,
  partySize: number,
): number {
  const list = Array.isArray(tiers) ? tiers : [];
  if (list.length === 0 || partySize < 1) return 0;
  const applicable = list
    .filter((t) => partySize >= t.min_party_size)
    .sort((a, b) => b.min_party_size - a.min_party_size)[0];
  return applicable ? applicable.amount_per_person_cents * partySize : 0;
}
