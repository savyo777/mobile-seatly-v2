// Owner subscription pricing — single source of truth.
//
// Was scattered across register-restaurant-card-entry (hardcoded $200),
// subscription-plan (env-driven, defaulted to 0 when unset), settings
// (same env-driven 0 fallback), and the server-side owner-notifications
// templates. Three places to drift in three different ways.
//
// Canonical value: $199.99 CAD/month. Override via the
// EXPO_PUBLIC_OWNER_MONTHLY_SUB_DOLLARS env var if the price ever moves.

const FALLBACK_OWNER_MONTHLY_SUB_DOLLARS = 199.99;

function readEnvPrice(): number | null {
  const raw = process.env.EXPO_PUBLIC_OWNER_MONTHLY_SUB_DOLLARS;
  if (typeof raw !== 'string' || raw.trim().length === 0) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

export const OWNER_MONTHLY_SUB_DOLLARS: number =
  readEnvPrice() ?? FALLBACK_OWNER_MONTHLY_SUB_DOLLARS;

const CAD_FORMATTER = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** "$199.99 / mo" — full form used on receipts and confirmation modals. */
export function ownerMonthlyPriceLabel(): string {
  return `${CAD_FORMATTER.format(OWNER_MONTHLY_SUB_DOLLARS)} / mo`;
}

/** "$199.99" — short form for headlines. Never rounds to $200 (would be misleading). */
export function ownerMonthlyPriceShort(): string {
  return CAD_FORMATTER.format(OWNER_MONTHLY_SUB_DOLLARS);
}
