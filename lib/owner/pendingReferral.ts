import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OWNER_REFERRAL_PENDING_STORAGE_KEY,
  isValidOwnerReferralCode,
  type PendingOwnerReferral,
} from '@/lib/owner/referralPolicy';

export async function readPendingOwnerReferral(): Promise<PendingOwnerReferral | null> {
  try {
    const raw = await AsyncStorage.getItem(OWNER_REFERRAL_PENDING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingOwnerReferral>;
    if (!isValidOwnerReferralCode(parsed.code)) return null;
    return {
      code: parsed.code,
      capturedAt: typeof parsed.capturedAt === 'string' ? parsed.capturedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearPendingOwnerReferral(): Promise<void> {
  try {
    await AsyncStorage.removeItem(OWNER_REFERRAL_PENDING_STORAGE_KEY);
  } catch {
    // best-effort
  }
}
