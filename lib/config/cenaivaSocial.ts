import * as Linking from 'expo-linking';

/** Official Cenaiva profiles — use in Settings (“Follow us”) and marketing. */
export const CENAIVA_FOLLOW_URLS = {
  instagram: 'https://instagram.com/heycenaiva',
  tiktok: 'https://www.tiktok.com/@heycenaiva',
  youtube: 'https://www.youtube.com/@heycenaiva',
  snapchat: 'https://www.snapchat.com/add/heycenaiva',
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

/** @deprecated Posting flows must use lib/sharing/nativeSocialShare so media is attached. */
export async function openUserSocialApp(platform: UserSocialPlatform): Promise<void> {
  await Linking.openURL(CENAIVA_FOLLOW_URLS[platform]);
}
