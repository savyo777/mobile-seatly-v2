import type { RefObject } from 'react';
import Constants from 'expo-constants';
import { NativeModules, TurboModuleRegistry, type View } from 'react-native';

function hasNativeViewShotModule(): boolean {
  if (Constants.appOwnership === 'expo') {
    return false;
  }

  try {
    const turboModule = TurboModuleRegistry.get?.('RNViewShot');
    const nativeModule = NativeModules.RNViewShot;
    return Boolean(turboModule || nativeModule);
  } catch {
    return false;
  }
}

/**
 * Saves the given view (photo + overlays) to a temporary JPEG.
 * Returns undefined when native RNViewShot is missing (e.g. Expo Go) or capture fails.
 * Avoid static imports of react-native-view-shot — that crashes app startup when the native module is absent.
 */
export async function captureStyledSnapToTmpFile(
  viewRef: RefObject<View | null>,
): Promise<string | undefined> {
  if (!viewRef.current || !hasNativeViewShotModule()) {
    return undefined;
  }

  try {
    const { captureRef } = await import('react-native-view-shot');
    const uri = await captureRef(viewRef, {
      format: 'jpg',
      quality: 0.92,
      result: 'tmpfile',
    });
    return typeof uri === 'string' ? uri : undefined;
  } catch {
    return undefined;
  }
}
