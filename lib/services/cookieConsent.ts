import AsyncStorage from '@react-native-async-storage/async-storage';

export type CookieConsent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decidedAt: string;
};

export const COOKIE_CONSENT_STORAGE_KEY = '@cenaiva/cookie_consent:v1';

export async function loadCookieConsent(): Promise<CookieConsent | null> {
  try {
    const raw = await AsyncStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (typeof parsed?.decidedAt !== 'string') return null;
    return {
      essential: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export async function saveCookieConsent(input: {
  analytics: boolean;
  marketing: boolean;
}): Promise<CookieConsent> {
  const value: CookieConsent = {
    essential: true,
    analytics: input.analytics,
    marketing: input.marketing,
    decidedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(value));
  return value;
}

export async function clearCookieConsent(): Promise<void> {
  await AsyncStorage.removeItem(COOKIE_CONSENT_STORAGE_KEY);
}
