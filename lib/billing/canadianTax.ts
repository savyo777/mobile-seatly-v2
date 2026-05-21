/**
 * Canadian provincial / territorial tax label mapper.
 *
 * Used to surface the correct tax type on the checkout breakdown
 * (e.g. "HST (13%)" for Ontario vs "GST + PST (5% + 7%)" for BC)
 * rather than a generic "Tax" label. The Cenaiva consumer ToS
 * promises "GST/HST/QST/PST as indicated at checkout" — this is
 * the shared source of truth used by both mobile + web sister repo.
 *
 * Rates here are the headline values as of 2026. Restaurants store
 * their actual numeric tax rate on `restaurant.taxRate` and Cenaiva
 * uses that for the math; this map is only for the LABEL.
 */

export type CanadianProvinceCode =
  | 'AB' | 'BC' | 'MB' | 'NB' | 'NL' | 'NS' | 'NT'
  | 'NU' | 'ON' | 'PE' | 'QC' | 'SK' | 'YT';

export type TaxLabelKind = 'HST' | 'GST' | 'GST_PST' | 'GST_QST';

interface ProvinceTaxConfig {
  kind: TaxLabelKind;
  /** Human-readable label, e.g. "HST" or "GST + PST". */
  label: string;
  /** Combined headline rate, displayed as a hint when needed. */
  headlineRatePercent: number;
}

const PROVINCE_TAX: Record<CanadianProvinceCode, ProvinceTaxConfig> = {
  // HST provinces — single combined rate
  ON: { kind: 'HST', label: 'HST', headlineRatePercent: 13 },
  NB: { kind: 'HST', label: 'HST', headlineRatePercent: 15 },
  NL: { kind: 'HST', label: 'HST', headlineRatePercent: 15 },
  NS: { kind: 'HST', label: 'HST', headlineRatePercent: 15 },
  PE: { kind: 'HST', label: 'HST', headlineRatePercent: 15 },
  // GST + PST provinces
  BC: { kind: 'GST_PST', label: 'GST + PST', headlineRatePercent: 12 },
  SK: { kind: 'GST_PST', label: 'GST + PST', headlineRatePercent: 11 },
  MB: { kind: 'GST_PST', label: 'GST + PST', headlineRatePercent: 12 },
  // Quebec
  QC: { kind: 'GST_QST', label: 'GST + QST', headlineRatePercent: 14.975 },
  // GST-only provinces / territories
  AB: { kind: 'GST', label: 'GST', headlineRatePercent: 5 },
  NT: { kind: 'GST', label: 'GST', headlineRatePercent: 5 },
  NU: { kind: 'GST', label: 'GST', headlineRatePercent: 5 },
  YT: { kind: 'GST', label: 'GST', headlineRatePercent: 5 },
};

/**
 * Render the tax label for a checkout breakdown. Falls back to
 * generic "Tax" if the province isn't a recognized Canadian code
 * (e.g. mock data, future international restaurants).
 *
 * @param province - the restaurant's province code (e.g. "ON")
 * @param actualRate - the numeric rate from restaurant.taxRate
 *   (0.13 for 13%). Used to compute the display percentage instead
 *   of the headline (so a restaurant configured with a non-standard
 *   rate still shows accurate numbers).
 */
export function canadianTaxLabel(
  province: string | null | undefined,
  actualRate: number,
): string {
  const cfg = province ? PROVINCE_TAX[province.toUpperCase() as CanadianProvinceCode] : undefined;
  const percent = Math.round(actualRate * 1000) / 10; // 13.0 not 13.000001
  if (!cfg) return `Tax (${percent}%)`;
  return `${cfg.label} (${percent}%)`;
}
