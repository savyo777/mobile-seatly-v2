// Canadian Revenue Agency HST/GST business number validation.
// Format: 9 digits + 'RT' + 4-digit account suffix (e.g. 123456789RT0001).
//
// When expansion to non-CA markets is on the roadmap, wrap this with a
// country-aware dispatch — `isValidBusinessTaxId(country, value)` — and
// add per-country regex modules (USA EIN, UK VAT, EU VAT, etc.).

export const CANADA_HST_REGEX = /^\d{9}RT\d{4}$/i;

export function normalizeCanadianHst(value: string): string {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function isValidCanadianHst(value: string): boolean {
  return CANADA_HST_REGEX.test(normalizeCanadianHst(value));
}
