import * as Linking from 'expo-linking';

/** Official Cenaiva profiles — override with EXPO_PUBLIC_* URLs at build time if needed. */
export const CENAIVA_FOLLOW_URLS = {
  instagram: process.env.EXPO_PUBLIC_INSTAGRAM_PROFILE_URL ?? 'https://instagram.com/heycenaiva',
  tiktok: process.env.EXPO_PUBLIC_TIKTOK_PROFILE_URL ?? 'https://www.tiktok.com/@heycenaiva',
  youtube: process.env.EXPO_PUBLIC_YOUTUBE_PROFILE_URL ?? 'https://www.youtube.com/@heycenaiva',
  snapchat: process.env.EXPO_PUBLIC_SNAPCHAT_PROFILE_URL ?? 'https://www.snapchat.com/add/heycenaiva',
} as const;

export type CenaivaFollowPlatform = keyof typeof CENAIVA_FOLLOW_URLS;
export type UserSocialPlatform = CenaivaFollowPlatform;

/** @deprecated Use CENAIVA_FOLLOW_URLS for official profile links. */
export const CENAIVA_SOCIAL_URLS = {
  instagram: CENAIVA_FOLLOW_URLS.instagram,
  tiktok: CENAIVA_FOLLOW_URLS.tiktok,
  youtube: CENAIVA_FOLLOW_URLS.youtube,
  snapchat: CENAIVA_FOLLOW_URLS.snapchat,
} as const;

export type CenaivaSocialPlatform = keyof typeof CENAIVA_SOCIAL_URLS;

/** Opens the official Cenaiva profile in the native app or browser (HTTPS universal links). */
export async function openCenaivaSocialProfile(platform: UserSocialPlatform): Promise<void> {
  await Linking.openURL(CENAIVA_FOLLOW_URLS[platform]);
}

/** @deprecated Use `openCenaivaSocialProfile` — same behavior. */
export async function openUserSocialApp(platform: UserSocialPlatform): Promise<void> {
  await openCenaivaSocialProfile(platform);
}
