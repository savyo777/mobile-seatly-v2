import { Platform, Linking } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import {
  getMimeType,
  type SocialMediaType,
  type SocialMimeType,
} from './mime';
import { friendlyError } from '@/lib/errors/friendlyError';

// Install / app-launch URLs used when a direct composer can't open because the
// target social app isn't on the device. We try the app's custom scheme first
// (launches the app if installed) and fall back to the store listing.
const INSTAGRAM_APP_URL = 'instagram://app';
const INSTAGRAM_STORE_URLS = {
  ios: 'https://apps.apple.com/app/instagram/id389801252',
  android: 'https://play.google.com/store/apps/details?id=com.instagram.android',
};

type NativeSocialShareModule = {
  shareToInstagramStory(mediaUri: string, mimeType: string, instagramAppId: string | null): Promise<void>;
  shareToInstagramFeed(mediaUri: string, mimeType: string): Promise<void>;
  shareToTikTok(mediaUri: string, mimeType: string): Promise<void>;
  shareToSnapchat(mediaUri: string, mimeType: string): Promise<void>;
  shareToYouTube(videoUri: string): Promise<void>;
};

export type SocialShareDestination =
  | 'instagram-story'
  | 'instagram-feed'
  | 'tiktok'
  | 'snapchat-story'
  | 'youtube';

export type SocialShareResult = {
  destination: SocialShareDestination;
  usedFallback: boolean;
  message?: string;
};

function getNativeSocialShare(): NativeSocialShareModule | null {
  return requireOptionalNativeModule<NativeSocialShareModule>('CenaivaSocialShare');
}

export function isNativeSocialShareAvailable(): boolean {
  return getNativeSocialShare() !== null;
}

function resolveMimeType(mediaUri: string, mediaType?: SocialMediaType): SocialMimeType {
  if (mediaType === 'video') return 'video/mp4';
  if (mediaType === 'photo') {
    const mimeType = getMimeType(mediaUri);
    return mimeType === 'video/mp4' ? 'image/jpeg' : mimeType;
  }

  return getMimeType(mediaUri);
}

function instagramAppId(): string | null {
  return process.env.EXPO_PUBLIC_INSTAGRAM_APP_ID || null;
}

function directComposerUnavailableMessage(destination: SocialShareDestination): string {
  switch (destination) {
    case 'instagram-story':
      return 'Instagram Story is not installed or cannot open its Story composer with this media.';
    case 'instagram-feed':
      return 'Instagram is not installed or cannot open its Feed composer with this media.';
    case 'tiktok':
      return 'TikTok cannot open its post composer from this build. TikTok Share Kit must be configured on iOS.';
    case 'snapchat-story':
      return 'Snapchat Story sharing requires Snap Creative Kit app setup before Cenaiva can open the Snapchat composer directly.';
    case 'youtube':
      return 'YouTube cannot open a direct upload composer from this build.';
  }
}

export async function openSystemShareSheet(
  mediaUri: string,
  mediaType?: SocialMediaType,
  optionalMessage?: string,
  destination: SocialShareDestination = 'youtube',
): Promise<SocialShareResult> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Native sharing is not available on this device.');
  }

  const mimeType = resolveMimeType(mediaUri, mediaType);
  await Sharing.shareAsync(mediaUri, {
    dialogTitle: optionalMessage ?? 'Share Cenaiva media',
    mimeType,
    UTI: mimeType === 'video/mp4' ? 'public.mpeg-4' : mimeType === 'image/png' ? 'public.png' : 'public.jpeg',
  });

  return {
    destination,
    usedFallback: true,
    message: optionalMessage,
  };
}

async function openInstagramOrStore(destination: SocialShareDestination): Promise<SocialShareResult> {
  // Try to launch the Instagram app directly. canOpenURL is unreliable on
  // Android 11+ without manifest <queries> declarations, so we attempt the
  // openURL call and only fall back to the store listing if it actually
  // rejects (ActivityNotFoundException on Android, no-handler error on iOS).
  // The user explicitly wants the Instagram surface — never the OS share sheet.
  try {
    await Linking.openURL(INSTAGRAM_APP_URL);
    return { destination, usedFallback: true, message: 'Opened Instagram. Pick your snap from Photos to share it.' };
  } catch {
    const storeUrl =
      Platform.OS === 'ios' ? INSTAGRAM_STORE_URLS.ios : INSTAGRAM_STORE_URLS.android;
    await Linking.openURL(storeUrl);
    return { destination, usedFallback: true, message: 'Install Instagram, then come back to share your snap.' };
  }
}

async function shareWithNativeComposer(
  destination: SocialShareDestination,
  mediaUri: string,
  mediaType: SocialMediaType | undefined,
  nativeCall: (mimeType: SocialMimeType) => Promise<void>,
): Promise<SocialShareResult> {
  const mimeType = resolveMimeType(mediaUri, mediaType);
  const nativeSocialShare = getNativeSocialShare();
  const isInstagram = destination === 'instagram-story' || destination === 'instagram-feed';

  if (!nativeSocialShare) {
    // No native module: Instagram destinations open the Instagram app (or
    // Play Store / App Store if not installed). Other destinations fall
    // through to the OS share sheet as before.
    if (isInstagram) return openInstagramOrStore(destination);
    return openSystemShareSheet(mediaUri, mediaType, undefined, destination);
  }

  try {
    await nativeCall(mimeType);
    return { destination, usedFallback: false };
  } catch (error) {
    console.warn(`[CenaivaSocialShare] ${destination} direct composer failed.`, error);
    // Instagram-specific recovery: take the user to Instagram (or its install
    // page) so they end up on the Instagram surface, not a generic share sheet.
    if (isInstagram) {
      try {
        return await openInstagramOrStore(destination);
      } catch (fallbackError) {
        console.warn(`[CenaivaSocialShare] Instagram launch fallback also failed.`, fallbackError);
      }
    } else {
      // For TikTok / Snapchat / etc., the system share sheet stays the safety net.
      try {
        return await openSystemShareSheet(mediaUri, mediaType, undefined, destination);
      } catch (fallbackError) {
        console.warn(`[CenaivaSocialShare] System share sheet fallback also failed for ${destination}.`, fallbackError);
      }
    }
    // Re-throw with a user-friendly message so the Alert at the callsite
    // doesn't surface the raw "Call to function … rejected" string.
    throw new Error(friendlyError(error, directComposerUnavailableMessage(destination)));
  }
}

export async function shareToInstagramStory(
  mediaUri: string,
  mediaType?: SocialMediaType,
): Promise<SocialShareResult> {
  return shareWithNativeComposer('instagram-story', mediaUri, mediaType, (mimeType) => {
    const nativeSocialShare = getNativeSocialShare();
    if (!nativeSocialShare) throw new Error('Cenaiva native social share module is unavailable.');
    return nativeSocialShare.shareToInstagramStory(mediaUri, mimeType, instagramAppId());
  });
}

export async function shareToInstagramFeed(
  mediaUri: string,
  mediaType?: SocialMediaType,
): Promise<SocialShareResult> {
  return shareWithNativeComposer('instagram-feed', mediaUri, mediaType, (mimeType) => {
    const nativeSocialShare = getNativeSocialShare();
    if (!nativeSocialShare) throw new Error('Cenaiva native social share module is unavailable.');
    return nativeSocialShare.shareToInstagramFeed(mediaUri, mimeType);
  });
}

export async function shareToTikTok(mediaUri: string, mediaType?: SocialMediaType): Promise<SocialShareResult> {
  return shareWithNativeComposer('tiktok', mediaUri, mediaType, (mimeType) => {
    const nativeSocialShare = getNativeSocialShare();
    if (!nativeSocialShare) throw new Error('Cenaiva native social share module is unavailable.');
    return nativeSocialShare.shareToTikTok(mediaUri, mimeType);
  });
}

export async function shareToSnapchat(
  mediaUri: string,
  mediaType?: SocialMediaType,
): Promise<SocialShareResult> {
  return shareWithNativeComposer('snapchat-story', mediaUri, mediaType, (mimeType) => {
    const nativeSocialShare = getNativeSocialShare();
    if (!nativeSocialShare) throw new Error('Cenaiva native social share module is unavailable.');
    return nativeSocialShare.shareToSnapchat(mediaUri, mimeType);
  });
}

export async function shareToYouTube(videoUri: string): Promise<SocialShareResult> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return openSystemShareSheet(videoUri, 'video', 'Share this video to YouTube.', 'youtube');
  }

  const nativeSocialShare = getNativeSocialShare();
  if (!nativeSocialShare) {
    throw new Error(
      'This Cenaiva app build does not include native social sharing yet. Reinstall the latest dev build, then reopen this snap.',
    );
  }

  try {
    await nativeSocialShare.shareToYouTube(videoUri);
    return { destination: 'youtube', usedFallback: Platform.OS === 'ios' };
  } catch (error) {
    console.warn('[CenaivaSocialShare] YouTube direct share failed.', error);
    throw new Error(error instanceof Error && error.message ? error.message : directComposerUnavailableMessage('youtube'));
  }
}
