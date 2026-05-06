/**
 * Save a media file to the user's camera roll / Photos library.
 *
 * Implementation notes:
 *
 * The previous version used `requireOptionalNativeModule('ExpoMediaLibrary')`
 * to probe for the native module, but that probe returned null in several
 * dev-build / SDK 55 setups even when `expo-media-library` was installed,
 * which made every save silently fail and surface the wrong error
 * ("Allow photo access") to users.
 *
 * Now we just dynamic-import `expo-media-library` directly. If the module
 * is genuinely unavailable (e.g. running in Expo Go without the native
 * module) the import throws and we map that to a typed reason so the UI
 * can show something accurate. We also distinguish between
 * "permission-denied", "save-failed", and "no-uri".
 */

export type SaveToCameraRollResult =
  | { ok: true }
  | {
      ok: false;
      reason: 'no-uri' | 'unavailable' | 'permission-denied' | 'save-failed';
      detail?: string;
    };

type MediaLibraryModule = {
  isAvailableAsync?: () => Promise<boolean>;
  getPermissionsAsync?: (writeOnly?: boolean) => Promise<{ granted?: boolean; status?: string; canAskAgain?: boolean }>;
  requestPermissionsAsync?: (writeOnly?: boolean) => Promise<{ granted?: boolean; status?: string; canAskAgain?: boolean }>;
  saveToLibraryAsync: (localUri: string) => Promise<void>;
  createAssetAsync?: (localUri: string) => Promise<unknown>;
};

let cachedModule: MediaLibraryModule | null | undefined;

async function getMediaLibrary(): Promise<MediaLibraryModule | null> {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // expo-media-library is in package.json; in a dev / production build
    // this resolves to the real module. In Expo Go it may throw because
    // the native module isn't bundled — that's the only legitimate reason
    // we should report "unavailable" to the user.
    const mod = (await import('expo-media-library')) as MediaLibraryModule;
    cachedModule = mod ?? null;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
}

/** Detailed save with typed reason for callers that want to show different
 * messages. */
export async function saveMediaToCameraRollDetailed(
  localUri: string,
): Promise<SaveToCameraRollResult> {
  if (!localUri) return { ok: false, reason: 'no-uri' };

  const MediaLibrary = await getMediaLibrary();
  if (!MediaLibrary) {
    return {
      ok: false,
      reason: 'unavailable',
      detail: 'expo-media-library is not available in this build.',
    };
  }

  try {
    if (typeof MediaLibrary.isAvailableAsync === 'function') {
      const available = await MediaLibrary.isAvailableAsync();
      if (available === false) {
        return { ok: false, reason: 'unavailable' };
      }
    }

    // Ask for write-only access first (less invasive, supported on iOS 14+).
    const existing = MediaLibrary.getPermissionsAsync
      ? await MediaLibrary.getPermissionsAsync(true)
      : { granted: false };
    const permission = existing?.granted
      ? existing
      : MediaLibrary.requestPermissionsAsync
        ? await MediaLibrary.requestPermissionsAsync(true)
        : { granted: false };

    if (!permission?.granted) {
      return { ok: false, reason: 'permission-denied' };
    }

    // Try the simple save first; some platforms / entitlements need the
    // older `createAssetAsync` path, so fall back if the first throws.
    try {
      await MediaLibrary.saveToLibraryAsync(localUri);
    } catch (firstErr) {
      if (typeof MediaLibrary.createAssetAsync === 'function') {
        try {
          await MediaLibrary.createAssetAsync(localUri);
        } catch (secondErr) {
          return {
            ok: false,
            reason: 'save-failed',
            detail: `${firstErr}; fallback also failed: ${secondErr}`,
          };
        }
      } else {
        return {
          ok: false,
          reason: 'save-failed',
          detail: String(firstErr),
        };
      }
    }

    return { ok: true };
  } catch (err) {
    return { ok: false, reason: 'save-failed', detail: String(err) };
  }
}

/**
 * Boolean wrapper kept for callers that don't yet care about the reason.
 * Internally calls `saveMediaToCameraRollDetailed`.
 */
export async function saveMediaToCameraRoll(localUri: string): Promise<boolean> {
  const result = await saveMediaToCameraRollDetailed(localUri);
  return result.ok;
}
