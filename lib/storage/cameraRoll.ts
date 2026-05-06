import { requireOptionalNativeModule } from 'expo-modules-core';

type MediaLibraryPermission = {
  granted?: boolean;
  status?: string;
};

type MediaLibraryModule = {
  isAvailableAsync?: () => Promise<boolean>;
  getPermissionsAsync?: (writeOnly?: boolean) => Promise<MediaLibraryPermission>;
  requestPermissionsAsync?: (writeOnly?: boolean) => Promise<MediaLibraryPermission>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
  createAssetAsync?: (localUri: string) => Promise<unknown>;
};

function hasMediaLibraryNativeModule(): boolean {
  try {
    return requireOptionalNativeModule('ExpoMediaLibrary') !== null;
  } catch {
    return false;
  }
}

async function loadMediaLibrary(): Promise<MediaLibraryModule | null> {
  if (!hasMediaLibraryNativeModule()) return null;

  try {
    // expo-media-library is optional in Expo Go, but required in Cenaiva dev builds.
    // @ts-ignore Optional native module may not be installed in this workspace yet.
    return (await import('expo-media-library')) as MediaLibraryModule;
  } catch {
    return null;
  }
}

export async function saveMediaToCameraRoll(localUri: string): Promise<boolean> {
  if (!localUri) return false;

  const MediaLibrary = await loadMediaLibrary();
  if (!MediaLibrary) return false;

  try {
    const available = await MediaLibrary.isAvailableAsync?.();
    if (available === false) return false;

    const existing = await MediaLibrary.getPermissionsAsync?.(true);
    const permission = existing?.granted
      ? existing
      : await MediaLibrary.requestPermissionsAsync?.(true);

    if (!permission?.granted) return false;

    try {
      await MediaLibrary.saveToLibraryAsync(localUri);
    } catch {
      if (!MediaLibrary.createAssetAsync) return false;
      await MediaLibrary.createAssetAsync(localUri);
    }
    return true;
  } catch {
    return false;
  }
}
