import * as Linking from 'expo-linking';

/** Official Cenaiva profiles — override with EXPO_PUBLIC_* URLs at build time if needed.
 *  Use `||` (not `??`) so an empty `.env` entry like `EXPO_PUBLIC_INSTAGRAM_PROFILE_URL=`
 *  still falls back to the canonical URL instead of returning '' and crashing Linking.openURL. */
export const CENAIVA_FOLLOW_URLS = {
  instagram: process.env.EXPO_PUBLIC_INSTAGRAM_PROFILE_URL?.trim() || 'https://instagram.com/heycenaiva',
  tiktok: process.env.EXPO_PUBLIC_TIKTOK_PROFILE_URL?.trim() || 'https://www.tiktok.com/@heycenaiva',
  // Channel-ID URL (not @handle) because the immutable UC… identifier survives
  // handle renames + handle reassignment by YouTube. All three forms currently
  // resolve to the same Cenaiva channel; UC… is the canonical pick.
  youtube: process.env.EXPO_PUBLIC_YOUTUBE_PROFILE_URL?.trim() || 'https://www.youtube.com/channel/UC7eNTmNPMNTY1yv5MTYrvfA',
  snapchat: process.env.EXPO_PUBLIC_SNAPCHAT_PROFILE_URL?.trim() || 'https://www.snapchat.com/add/heycenaiva',
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
