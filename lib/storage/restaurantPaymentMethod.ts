import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';
import { getSupabase } from '@/lib/supabase/client';
import { key } from '@/lib/storage/keys';

export type CardFunding = 'credit' | 'debit' | 'prepaid' | 'unknown';

export type RestaurantPaymentCard = {
  id: string;
  brand: string;
  funding: CardFunding;
  last4: string;
  expiry: string;
  cardholder: string;
  isDefault: boolean;
  source: 'registration' | 'manual';
};

const STORAGE_KEY = key('restaurant-payment-cards-v1');

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

function expiryLabel(month: number | null, year: number | null): string {
  if (!month || !year) return '';
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}

async function readLocalDemoCards(): Promise<RestaurantPaymentCard[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
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
  const restaurant = await fetchCurrentOwnerRestaurant();
  if (restaurant?.billingCardLast4) {
    return [{
      id: restaurant.stripePaymentMethodId || `restaurant-card-${restaurant.id}`,
      brand: restaurant.billingCardBrand || 'Card',
      funding: 'unknown',
      last4: restaurant.billingCardLast4,
      expiry: expiryLabel(restaurant.billingCardExpMonth, restaurant.billingCardExpYear),
      cardholder: restaurant.name,
      isDefault: true,
      source: 'registration',
    }];
  }
  if (isDemoModeEnabled()) return readLocalDemoCards();
  return [];
}

export async function saveRestaurantPaymentCard(
  card: Omit<RestaurantPaymentCard, 'id' | 'funding'> & { id?: string; funding?: CardFunding },
): Promise<RestaurantPaymentCard[]> {
  const supabase = getSupabase();
  const restaurant = await fetchCurrentOwnerRestaurant();
  if (supabase && restaurant?.id) {
    const [expMonthRaw, expYearRaw] = card.expiry.split('/');
    const expMonth = Number(expMonthRaw);
    const expYear = Number(expYearRaw?.length === 2 ? `20${expYearRaw}` : expYearRaw);
    const { error } = await supabase
      .from('restaurants')
      .update({
        billing_card_brand: card.brand,
        billing_card_last4: card.last4,
        billing_card_exp_month: Number.isFinite(expMonth) ? expMonth : null,
        billing_card_exp_year: Number.isFinite(expYear) ? expYear : null,
      })
      .eq('id', restaurant.id);
    if (error) throw error;
    return getStoredRestaurantPaymentCards();
  }

  if (!isDemoModeEnabled()) {
    throw new Error('Restaurant billing is unavailable until backend billing is configured.');
  }

  const cards = await readLocalDemoCards();
  const next: RestaurantPaymentCard = {
    id: card.id ?? makeId(),
    brand: card.brand,
    funding: card.funding ?? 'unknown',
    last4: card.last4,
    expiry: card.expiry,
    cardholder: card.cardholder,
    isDefault: card.isDefault,
    source: card.source,
  };
  const normalized = next.isDefault
    ? cards.map((item) => ({ ...item, isDefault: false }))
    : cards;
  const merged = [next, ...normalized.filter((item) => item.id !== next.id)];
  await writeCards(merged);
  return merged;
}

export async function setDefaultRestaurantPaymentCard(id: string): Promise<RestaurantPaymentCard[]> {
  const cards = await readLocalDemoCards();
  const next = cards.map((card) => ({ ...card, isDefault: card.id === id }));
  await writeCards(next);
  return getStoredRestaurantPaymentCards();
}

export async function removeRestaurantPaymentCard(id: string): Promise<RestaurantPaymentCard[]> {
  const restaurant = await fetchCurrentOwnerRestaurant();
  const supabase = getSupabase();
  if (restaurant?.id && supabase && (id === restaurant.stripePaymentMethodId || id === `restaurant-card-${restaurant.id}`)) {
    const { error } = await supabase
      .from('restaurants')
      .update({
        billing_card_brand: null,
        billing_card_last4: null,
        billing_card_exp_month: null,
        billing_card_exp_year: null,
      })
      .eq('id', restaurant.id);
    if (error) throw error;
    return [];
  }

  const next = (await readLocalDemoCards()).filter((card) => card.id !== id);
  if (next.length && !next.some((card) => card.isDefault)) {
    next[0] = { ...next[0], isDefault: true };
  }
  await writeCards(next);
  return getStoredRestaurantPaymentCards();
}

export async function seedRestaurantPaymentCards(
  cards: RestaurantPaymentCard[],
): Promise<RestaurantPaymentCard[]> {
  await writeCards(cards);
  return cards;
}
