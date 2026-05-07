import AsyncStorage from '@react-native-async-storage/async-storage';

export type RestaurantPaymentCard = {
  id: string;
  brand: string;
  last4: string;
  expiry: string;
  cardholder: string;
  isDefault: boolean;
  source: 'registration' | 'manual';
};

const STORAGE_KEY = 'restaurant-payment-cards-v1';

const DEFAULT_REGISTRATION_CARD: RestaurantPaymentCard = {
  id: 'registration-card-default',
  brand: 'Visa',
  last4: '4429',
  expiry: '06/28',
  cardholder: 'Restaurant owner',
  isDefault: true,
  source: 'registration',
};

function makeId() {
  return `card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function inferCardBrand(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.startsWith('4')) return 'Visa';
  if (digits.startsWith('5')) return 'Mastercard';
  if (digits.startsWith('3')) return 'Amex';
  if (digits.startsWith('6')) return 'Discover';
  return 'Card';
}

async function readCards(options: { hydrateDefault?: boolean } = {}): Promise<RestaurantPaymentCard[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) {
    if (!options.hydrateDefault) return [];
    await writeCards([DEFAULT_REGISTRATION_CARD]);
    return [DEFAULT_REGISTRATION_CARD];
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as RestaurantPaymentCard[]) : [];
  } catch {
    return [];
  }
}

async function writeCards(cards: RestaurantPaymentCard[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export async function getStoredRestaurantPaymentCards(): Promise<RestaurantPaymentCard[]> {
  return readCards({ hydrateDefault: true });
}

export async function saveRestaurantPaymentCard(
  card: Omit<RestaurantPaymentCard, 'id'> & { id?: string },
): Promise<RestaurantPaymentCard[]> {
  const cards = await readCards();
  const next: RestaurantPaymentCard = {
    id: card.id ?? makeId(),
    brand: card.brand,
    last4: card.last4,
    expiry: card.expiry,
    cardholder: card.cardholder,
    isDefault: card.isDefault,
    source: card.source,
  };
  const existingIndex = cards.findIndex((item) => item.id === next.id);
  const normalized = next.isDefault
    ? cards.map((item) => ({ ...item, isDefault: false }))
    : cards;

  const merged = existingIndex >= 0
    ? normalized.map((item) => (item.id === next.id ? next : item))
    : [next, ...normalized];

  const finalCards = next.isDefault
    ? merged.map((item, idx) => ({ ...item, isDefault: idx === 0 ? true : false }))
    : merged;

  await writeCards(finalCards);
  return finalCards;
}

export async function setDefaultRestaurantPaymentCard(id: string): Promise<RestaurantPaymentCard[]> {
  const cards = await readCards({ hydrateDefault: true });
  const next = cards.map((card) => ({ ...card, isDefault: card.id === id }));
  await writeCards(next);
  return next;
}

export async function removeRestaurantPaymentCard(id: string): Promise<RestaurantPaymentCard[]> {
  const cards = await readCards({ hydrateDefault: true });
  const next = cards.filter((card) => card.id !== id);
  if (next.length && !next.some((card) => card.isDefault)) {
    next[0] = { ...next[0], isDefault: true };
  }
  await writeCards(next);
  return next;
}

export async function seedRestaurantPaymentCards(
  cards: RestaurantPaymentCard[],
): Promise<RestaurantPaymentCard[]> {
  await writeCards(cards);
  return cards;
}
