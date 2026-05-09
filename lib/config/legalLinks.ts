// Legal/marketing URLs for the Cenaiva product. All point at the cenaiva.com
// brand domain by default; each can be overridden via EXPO_PUBLIC_* env at
// build time.

const DEFAULT_BRAND_DOMAIN = 'cenaiva.com';
const DEFAULT_TERMS_URL = `https://${DEFAULT_BRAND_DOMAIN}/terms`;
const DEFAULT_PRIVACY_URL = `https://${DEFAULT_BRAND_DOMAIN}/privacy`;
const DEFAULT_LICENSES_URL = `https://${DEFAULT_BRAND_DOMAIN}/licenses`;
const DEFAULT_ACK_URL = `https://${DEFAULT_BRAND_DOMAIN}/ack`;

function envValue(key: string, fallback: string): string {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const trimmed = raw.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

export const BRAND_DOMAIN = envValue('EXPO_PUBLIC_BRAND_DOMAIN', DEFAULT_BRAND_DOMAIN);
export const TERMS_URL = envValue('EXPO_PUBLIC_TERMS_URL', DEFAULT_TERMS_URL);
export const PRIVACY_URL = envValue('EXPO_PUBLIC_PRIVACY_URL', DEFAULT_PRIVACY_URL);
export const LICENSES_URL = envValue('EXPO_PUBLIC_LICENSES_URL', DEFAULT_LICENSES_URL);
export const ACK_URL = envValue('EXPO_PUBLIC_ACK_URL', DEFAULT_ACK_URL);
