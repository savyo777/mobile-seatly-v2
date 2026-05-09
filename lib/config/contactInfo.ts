// Customer/owner contact addresses. Single source of truth so we never ship
// a divergent privacy or support address. All env-overridable.

const DEFAULT_SUPPORT_EMAIL = 'help@cenaiva.com';
const DEFAULT_PRIVACY_EMAIL = 'privacy@cenaiva.com';
const DEFAULT_LEGAL_EMAIL = 'legal@cenaiva.com';

function envValue(key: string, fallback: string): string {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export const SUPPORT_EMAIL = envValue('EXPO_PUBLIC_SUPPORT_EMAIL', DEFAULT_SUPPORT_EMAIL);
export const PRIVACY_EMAIL = envValue('EXPO_PUBLIC_PRIVACY_EMAIL', DEFAULT_PRIVACY_EMAIL);
export const LEGAL_EMAIL = envValue('EXPO_PUBLIC_LEGAL_EMAIL', DEFAULT_LEGAL_EMAIL);

export function mailtoUrl(email: string, subject?: string): string {
  if (!subject) return `mailto:${email}`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`;
}
