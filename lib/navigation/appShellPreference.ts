import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@seatly/app_shell_preference';

export type AppShellPreference = 'auto' | 'customer' | 'staff';

export async function getAppShellPreference(): Promise<AppShellPreference> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw === 'customer' || raw === 'staff' || raw === 'auto') return raw;
    return 'auto';
  } catch {
    return 'auto';
  }
}

export async function setAppShellPreference(value: AppShellPreference): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, value);
}

export async function clearAppShellPreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
