import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getCurrentUserProfileId } from '@/lib/services/userProfile';
import { getSupabase } from '@/lib/supabase/client';
import { key } from '@/lib/storage/keys';

export type CustomerPaymentMethod = {
  id: string;
  brand: 'visa' | 'mastercard' | 'amex' | 'card';
  last4: string;
  expiry: string;
  cardholder: string;
  isDefault: boolean;
};

const STORAGE_KEY = key('customer-payment-methods-v1');

function makeId() {
  return `customer_card_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeBrand(brand: string): CustomerPaymentMethod['brand'] {
  const normalized = brand.trim().toLowerCase();
  if (normalized === 'visa') return 'visa';
  if (normalized === 'mastercard') return 'mastercard';
  if (normalized === 'amex' || normalized === 'american express') return 'amex';
  return 'card';
}

function normalizeExpiry(row: Record<string, unknown>): string {
  const expMonth = typeof row.exp_month === 'number' ? row.exp_month : null;
  const expYear = typeof row.exp_year === 'number' ? row.exp_year : null;
  if (!expMonth || !expYear) return '';
  return `${String(expMonth).padStart(2, '0')}/${String(expYear).slice(-2)}`;
}

function rowLast4(row: Record<string, unknown>): string {
  return typeof row.last4 === 'string'
    ? row.last4
    : typeof row.last_4 === 'string'
      ? row.last_4
      : '';
}

async function readLocalDemoMethods(): Promise<CustomerPaymentMethod[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerPaymentMethod[]) : [];
  } catch {
    return [];
  }
}

async function writeMethods(methods: CustomerPaymentMethod[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(methods));
}

export async function getStoredCustomerPaymentMethods(cardholder: string): Promise<CustomerPaymentMethod[]> {
  const supabase = getSupabase();
  if (!supabase) return isDemoModeEnabled() ? readLocalDemoMethods() : [];
  const profileId = await getCurrentUserProfileId();
  if (!profileId) return [];

  const { data, error } = await supabase
    .from('saved_cards')
    .select('*')
    .eq('user_profile_id', profileId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    if (isDemoModeEnabled()) return readLocalDemoMethods();
    throw error;
  }

  return ((data ?? []) as Record<string, unknown>[]).flatMap((row) => {
    const last4 = rowLast4(row);
    if (!last4) return [];
    return [{
      id: String(row.id),
      brand: normalizeBrand(String(row.brand ?? 'card')),
      last4,
      expiry: normalizeExpiry(row),
      cardholder:
        typeof row.cardholder === 'string' && row.cardholder.trim()
          ? row.cardholder.trim()
          : cardholder,
      isDefault: row.is_default === true,
    }];
  });
}

export async function saveCustomerPaymentMethod(
  card: Omit<CustomerPaymentMethod, 'id' | 'brand'> & { id?: string; brand: string },
  fallbackCardholder: string,
): Promise<CustomerPaymentMethod[]> {
  const supabase = getSupabase();
  const profileId = supabase ? await getCurrentUserProfileId() : null;
  if (supabase && profileId) {
    if (card.isDefault) {
      await supabase.from('saved_cards').update({ is_default: false }).eq('user_profile_id', profileId);
    }
    const { error } = await supabase.from('saved_cards').insert({
      user_profile_id: profileId,
      brand: normalizeBrand(card.brand),
      last4: card.last4,
      is_default: card.isDefault,
    });
    if (error) throw error;
    return getStoredCustomerPaymentMethods(fallbackCardholder);
  }

  if (!isDemoModeEnabled()) {
    throw new Error('Payment methods are unavailable until backend billing is configured.');
  }

  const methods = await readLocalDemoMethods();
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
  const supabase = getSupabase();
  const profileId = supabase ? await getCurrentUserProfileId() : null;
  if (supabase && profileId) {
    await supabase.from('saved_cards').update({ is_default: false }).eq('user_profile_id', profileId);
    const { error } = await supabase
      .from('saved_cards')
      .update({ is_default: true })
      .eq('user_profile_id', profileId)
      .eq('id', id);
    if (error) throw error;
    return getStoredCustomerPaymentMethods(fallbackCardholder);
  }

  const methods = await readLocalDemoMethods();
  const next = methods.map((method) => ({ ...method, isDefault: method.id === id }));
  await writeMethods(next);
  return next;
}

export async function removeCustomerPaymentMethod(
  id: string,
  fallbackCardholder: string,
): Promise<CustomerPaymentMethod[]> {
  const supabase = getSupabase();
  const profileId = supabase ? await getCurrentUserProfileId() : null;
  if (supabase && profileId) {
    const { error } = await supabase
      .from('saved_cards')
      .delete()
      .eq('user_profile_id', profileId)
      .eq('id', id);
    if (error) throw error;
    return getStoredCustomerPaymentMethods(fallbackCardholder);
  }

  const next = (await readLocalDemoMethods()).filter((method) => method.id !== id);
  if (next.length && !next.some((method) => method.isDefault)) {
    next[0] = { ...next[0], isDefault: true };
  }
  await writeMethods(next);
  return next;
}
