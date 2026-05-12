import AsyncStorage from '@react-native-async-storage/async-storage';
import { key } from '@/lib/storage/keys';

const STORAGE_KEY = key('app_shell_preference');

export type AppShellPreference = 'auto' | 'customer' | 'staff';

let cachedPreference: AppShellPreference | null = null;

export function getCachedAppShellPreference(): AppShellPreference | null {
  return cachedPreference;
}

export async function getAppShellPreference(): Promise<AppShellPreference> {
  if (cachedPreference) return cachedPreference;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'customer' || raw === 'staff' || raw === 'auto') {
      cachedPreference = raw;
      return raw;
    }
    cachedPreference = 'auto';
    return 'auto';
  } catch {
    cachedPreference = 'auto';
    return 'auto';
  }
}

export async function setAppShellPreference(value: AppShellPreference): Promise<void> {
  cachedPreference = value;
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

export async function clearAppShellPreference(): Promise<void> {
  cachedPreference = null;
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
