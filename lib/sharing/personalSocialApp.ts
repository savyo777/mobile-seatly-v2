import * as Linking from 'expo-linking';

/**
 * Opens the Snapchat app the user is signed into (same idea as jumping into your own app to post).
 * Does not attach media; the OS does not allow that without Snap’s SDK.
 */
export async function openPersonalSnapchatApp(): Promise<void> {
  try {
    await Linking.openURL('snapchat://');
  } catch {
    await Linking.openURL('https://www.snapchat.com/');
  }
}

/** Opens the TikTok app the user is signed into. */
export async function openPersonalTikTokApp(): Promise<void> {
  try {
    await Linking.openURL('tiktok://');
  } catch {
    await Linking.openURL('https://www.tiktok.com/');
  }
}
