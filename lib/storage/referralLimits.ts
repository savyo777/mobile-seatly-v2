import AsyncStorage from '@react-native-async-storage/async-storage';
import { key } from '@/lib/storage/keys';

export const REFERRAL_DAILY_SHARE_LIMIT = 10;
export const REFERRAL_LIFETIME_CREDIT_CAP = 100;
export const REFERRAL_SHARE_COOLDOWN_SECONDS = 30;

const STORAGE_KEY = key('referral-limits-v1');

type ReferralLimitsState = {
  dayKey: string;
  sharesToday: number;
  lastShareAt: number;
  lifetimeCreditEarned: number;
};

const DEFAULT_STATE: ReferralLimitsState = {
  dayKey: '',
  sharesToday: 0,
  lastShareAt: 0,
  lifetimeCreditEarned: 0,
};

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function readState(): Promise<ReferralLimitsState> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return { ...DEFAULT_STATE, dayKey: todayKey() };
  try {
    const parsed = JSON.parse(raw) as Partial<ReferralLimitsState>;
    const state: ReferralLimitsState = { ...DEFAULT_STATE, ...parsed };
    if (state.dayKey !== todayKey()) {
      state.dayKey = todayKey();
      state.sharesToday = 0;
    }
    return state;
  } catch {
    return { ...DEFAULT_STATE, dayKey: todayKey() };
  }
}

async function writeState(state: ReferralLimitsState): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export type ReferralLimitsSnapshot = {
  sharesRemainingToday: number;
  cooldownSecondsRemaining: number;
  lifetimeCreditEarned: number;
  lifetimeCreditCap: number;
  lifetimeCreditRemaining: number;
};

export async function getReferralLimits(): Promise<ReferralLimitsSnapshot> {
  const state = await readState();
  const now = Date.now();
  const elapsed = Math.floor((now - state.lastShareAt) / 1000);
  const cooldownSecondsRemaining = state.lastShareAt
    ? Math.max(0, REFERRAL_SHARE_COOLDOWN_SECONDS - elapsed)
    : 0;
  return {
    sharesRemainingToday: Math.max(0, REFERRAL_DAILY_SHARE_LIMIT - state.sharesToday),
    cooldownSecondsRemaining,
    lifetimeCreditEarned: state.lifetimeCreditEarned,
    lifetimeCreditCap: REFERRAL_LIFETIME_CREDIT_CAP,
    lifetimeCreditRemaining: Math.max(0, REFERRAL_LIFETIME_CREDIT_CAP - state.lifetimeCreditEarned),
  };
}

export type ShareGate =
  | { allowed: true }
  | { allowed: false; reason: 'daily_limit' | 'cooldown' | 'cap_reached'; retryInSeconds?: number };

export async function canShareReferral(): Promise<ShareGate> {
  const snapshot = await getReferralLimits();
  if (snapshot.lifetimeCreditRemaining <= 0) {
    return { allowed: false, reason: 'cap_reached' };
  }
  if (snapshot.sharesRemainingToday <= 0) {
    return { allowed: false, reason: 'daily_limit' };
  }
  if (snapshot.cooldownSecondsRemaining > 0) {
    return { allowed: false, reason: 'cooldown', retryInSeconds: snapshot.cooldownSecondsRemaining };
  }
  return { allowed: true };
}

export async function recordReferralShare(): Promise<void> {
  const state = await readState();
  state.sharesToday += 1;
  state.lastShareAt = Date.now();
  await writeState(state);
}

export async function recordReferralCreditEarned(amount: number): Promise<void> {
  if (!Number.isFinite(amount) || amount <= 0) return;
  const state = await readState();
  state.lifetimeCreditEarned = Math.min(
    REFERRAL_LIFETIME_CREDIT_CAP,
    state.lifetimeCreditEarned + amount,
  );
  await writeState(state);
}
