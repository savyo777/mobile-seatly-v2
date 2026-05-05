import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * Saves the given view (photo + overlays) to a temporary JPEG.
 * Returns undefined when native RNViewShot is missing (e.g. Expo Go) or capture fails.
 * Avoid static imports of react-native-view-shot — that crashes app startup when the native module is absent.
 */
export async function captureStyledSnapToTmpFile(
  viewRef: RefObject<View | null>,
): Promise<string | undefined> {
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
