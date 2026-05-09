import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'claimed-promotions-v1';

export type ClaimedPromotion = {
  promoId: string;
  claimedAt: string;
  redeemedAt: string | null;
};

async function readAll(): Promise<ClaimedPromotion[]> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as ClaimedPromotion[]) : [];
  } catch {
    return [];
  }
}

async function writeAll(items: ClaimedPromotion[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export async function getClaimedPromotions(): Promise<ClaimedPromotion[]> {
  return readAll();
}

export async function isPromotionClaimed(promoId: string): Promise<boolean> {
  const items = await readAll();
  return items.some((item) => item.promoId === promoId);
}

export async function claimPromotion(promoId: string): Promise<ClaimedPromotion> {
  const items = await readAll();
  const existing = items.find((item) => item.promoId === promoId);
  if (existing) return existing;
  const next: ClaimedPromotion = {
    promoId,
    claimedAt: new Date().toISOString(),
    redeemedAt: null,
  };
  await writeAll([next, ...items]);
  return next;
}

export async function redeemPromotion(promoId: string): Promise<void> {
  const items = await readAll();
  const updated = items.map((item) =>
    item.promoId === promoId && !item.redeemedAt
      ? { ...item, redeemedAt: new Date().toISOString() }
      : item,
  );
  await writeAll(updated);
}

export async function unclaimPromotion(promoId: string): Promise<void> {
  const items = await readAll();
  await writeAll(items.filter((item) => item.promoId !== promoId));
}
