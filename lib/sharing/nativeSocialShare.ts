import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo-modules-core';
import * as Sharing from 'expo-sharing';
import {
  getMimeType,
  type SocialMediaType,
  type SocialMimeType,
} from './mime';

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

async function shareWithNativeComposer(
  destination: SocialShareDestination,
  mediaUri: string,
  mediaType: SocialMediaType | undefined,
  nativeCall: (mimeType: SocialMimeType) => Promise<void>,
): Promise<SocialShareResult> {
  const mimeType = resolveMimeType(mediaUri, mediaType);
  const nativeSocialShare = getNativeSocialShare();

  if (!nativeSocialShare) {
    throw new Error(
      'This Cenaiva app build does not include native social sharing yet. Reinstall the latest dev build, then reopen this snap.',
    );
  }

  try {
    await nativeCall(mimeType);
    return { destination, usedFallback: false };
  } catch (error) {
    console.warn(`[CenaivaSocialShare] ${destination} direct composer failed.`, error);
    const message = error instanceof Error && error.message ? error.message : directComposerUnavailableMessage(destination);
    throw new Error(message);
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
