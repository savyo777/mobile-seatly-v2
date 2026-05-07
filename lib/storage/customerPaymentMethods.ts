import AsyncStorage from '@react-native-async-storage/async-storage';

export type CustomerPaymentMethod = {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'card';
  last4: string;
  expiry: string;
  cardholder: string;
  isDefault: boolean;
};

const STORAGE_KEY = 'customer-payment-methods-v1';

function makeId() {
  return `customer_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function defaultCustomerCard(cardholder: string): CustomerPaymentMethod {
  return {
    id: 'customer-default-card',
    brand: 'visa',
    last4: '4242',
    expiry: '09/27',
    cardholder,
    isDefault: true,
  };
}

function normalizeBrand(brand: string): CustomerPaymentMethod['brand'] {
  const normalized = brand.trim().toLowerCase();
  if (normalized === 'visa') return 'visa';
  if (normalized === 'mastercard') return 'mastercard';
  if (normalized === 'amex' || normalized === 'american express') return 'amex';
  return 'card';
}

async function readMethods(cardholder: string): Promise<CustomerPaymentMethod[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [defaultCustomerCard(cardholder)];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerPaymentMethod[]) : [defaultCustomerCard(cardholder)];
  } catch {
    return [defaultCustomerCard(cardholder)];
  }
}

async function writeMethods(methods: CustomerPaymentMethod[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
}

export async function getStoredCustomerPaymentMethods(cardholder: string): Promise<CustomerPaymentMethod[]> {
  return readMethods(cardholder);
}

export async function saveCustomerPaymentMethod(
  card: Omit<CustomerPaymentMethod, 'id' | 'brand'> & { id?: string; brand: string },
  fallbackCardholder: string,
): Promise<CustomerPaymentMethod[]> {
  const methods = await readMethods(fallbackCardholder);
  const next: CustomerPaymentMethod = {
    id: card.id ?? makeId(),
    brand: normalizeBrand(card.brand),
    last4: card.last4,
    expiry: card.expiry,
    cardholder: card.cardholder.trim() || fallbackCardholder,
    isDefault: card.isDefault,
  };
  const existingIndex = methods.findIndex((method) => method.id === next.id);
  const normalized = next.isDefault
    ? methods.map((method) => ({ ...method, isDefault: false }))
    : methods;
  const merged = existingIndex >= 0
    ? normalized.map((method) => (method.id === next.id ? next : method))
    : [next, ...normalized];
  const finalMethods = merged.some((method) => method.isDefault)
    ? merged
    : merged.map((method, index) => ({ ...method, isDefault: index === 0 }));
  await writeMethods(finalMethods);
  return finalMethods;
}

export async function setDefaultCustomerPaymentMethod(
  id: string,
  fallbackCardholder: string,
): Promise<CustomerPaymentMethod[]> {
  const methods = await readMethods(fallbackCardholder);
  const next = methods.map((method) => ({ ...method, isDefault: method.id === id }));
  await writeMethods(next);
  return next;
}

export async function removeCustomerPaymentMethod(
  id: string,
  fallbackCardholder: string,
): Promise<CustomerPaymentMethod[]> {
  const methods = await readMethods(fallbackCardholder);
  const next = methods.filter((method) => method.id !== id);
  if (next.length && !next.some((method) => method.isDefault)) {
    next[0] = { ...next[0], isDefault: true };
  }
  await writeMethods(next);
  return next;
}

