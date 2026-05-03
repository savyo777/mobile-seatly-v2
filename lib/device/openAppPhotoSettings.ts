import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Linking from 'expo-linking';

/**
 * Opens the closest system screen where the user can enable Photos / library access.
 * - Android: App info (Details) for this package — user taps Permissions → Photos.
 * - iOS: Cenaiva entry in Settings — user taps Photos (Apple does not allow deeper links).
 */
export async function openAppPhotoSettings(): Promise<void> {
  if (Platform.OS === 'android') {
    const pkg = Constants.expoConfig?.android?.package;
    if (pkg) {
      try {
        const IntentLauncher = await import('expo-intent-launcher');
        await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS, {
          data: `package:${pkg}`,
        });
        return;
      } catch {
        // Fall through to generic settings
      }
    }
  }
  await Linking.openSettings();
}
