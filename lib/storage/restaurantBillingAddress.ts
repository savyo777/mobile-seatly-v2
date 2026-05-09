import AsyncStorage from '@react-native-async-storage/async-storage';
import { key } from '@/lib/storage/keys';

export type RestaurantBillingAddress = {
  line1: string;
  line2: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

const STORAGE_KEY = key('restaurant-billing-address-v1');

// Default ISO-3166 country code for owner billing addresses. CA covers the
// launch market; non-CA builds set EXPO_PUBLIC_DEFAULT_COUNTRY to avoid
// pre-filling the wrong country in the registration form.
const DEFAULT_BILLING_COUNTRY = (
  process.env.EXPO_PUBLIC_DEFAULT_COUNTRY?.trim() || 'CA'
).toUpperCase();

export const EMPTY_BILLING_ADDRESS: RestaurantBillingAddress = {
  line1: '',
  line2: '',
  city: '',
  region: '',
  postalCode: '',
  country: DEFAULT_BILLING_COUNTRY,
};

export async function getStoredBillingAddress(): Promise<RestaurantBillingAddress> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return EMPTY_BILLING_ADDRESS;
  try {
    const parsed = JSON.parse(raw) as Partial<RestaurantBillingAddress> | null;
    if (!parsed || typeof parsed !== 'object') return EMPTY_BILLING_ADDRESS;
    return { ...EMPTY_BILLING_ADDRESS, ...parsed };
  } catch {
    return EMPTY_BILLING_ADDRESS;
  }
}

export async function saveBillingAddress(address: RestaurantBillingAddress): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(address));
}

export function isBillingAddressComplete(address: RestaurantBillingAddress): boolean {
  return Boolean(
    address.line1.trim() &&
      address.city.trim() &&
      address.region.trim() &&
      address.postalCode.trim() &&
      address.country.trim(),
  );
}

export function formatBillingAddressOneLine(address: RestaurantBillingAddress): string {
  if (!isBillingAddressComplete(address)) return '';
  const parts = [
    address.line1.trim(),
    address.line2.trim(),
    [address.city.trim(), address.region.trim()].filter(Boolean).join(', '),
    [address.postalCode.trim(), address.country.trim()].filter(Boolean).join(' '),
  ].filter(Boolean);
  return parts.join(' · ');
}
