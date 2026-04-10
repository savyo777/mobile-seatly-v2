import AsyncStorage from '@react-native-async-storage/async-storage';

export type SnapPlatform = 'instagram' | 'facebook' | 'google';

const CONNECTIONS_KEY = 'seatly.snap.connections.v1';
const PENDING_SELECTION_KEY = 'seatly.snap.pendingSelection.v1';

export interface SnapPlatformConnections {
  instagram: boolean;
  facebook: boolean;
  google: boolean;
}

const DEFAULT_CONNECTIONS: SnapPlatformConnections = {
  instagram: false,
  facebook: false,
  google: false,
};

export async function getSnapPlatformConnections(): Promise<SnapPlatformConnections> {
  const raw = await AsyncStorage.getItem(CONNECTIONS_KEY);
  if (!raw) return DEFAULT_CONNECTIONS;
  try {
    const parsed = JSON.parse(raw) as Partial<SnapPlatformConnections>;
    return {
      instagram: !!parsed.instagram,
      facebook: !!parsed.facebook,
      google: !!parsed.google,
    };
  } catch {
    return DEFAULT_CONNECTIONS;
  }
}

export async function setSnapPlatformConnected(
  platform: SnapPlatform,
  connected: boolean,
): Promise<SnapPlatformConnections> {
  const current = await getSnapPlatformConnections();
  const next = { ...current, [platform]: connected };
  await AsyncStorage.setItem(CONNECTIONS_KEY, JSON.stringify(next));
  return next;
}

export async function setPendingSnapPlatformSelection(platform: SnapPlatform): Promise<void> {
  await AsyncStorage.setItem(PENDING_SELECTION_KEY, platform);
}

export async function getPendingSnapPlatformSelection(): Promise<SnapPlatform | null> {
  const raw = await AsyncStorage.getItem(PENDING_SELECTION_KEY);
  if (raw === 'instagram' || raw === 'facebook' || raw === 'google') return raw;
  return null;
}

export async function clearPendingSnapPlatformSelection(): Promise<void> {
  await AsyncStorage.removeItem(PENDING_SELECTION_KEY);
}
