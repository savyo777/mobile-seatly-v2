import * as Linking from 'expo-linking';

/**
 * Opens the **customer’s** installed social app toward create/post flows when the OS allows it.
 * Tries native URL candidates in order, then falls back to web (often still hands off to the app).
 *
 * These entry points are unofficial and may change or vary by app version.
 */
export const USER_SOCIAL_LAUNCH = {
  instagram: {
    app: ['instagram://camera', 'instagram://app'],
    web: 'https://www.instagram.com/',
  },
  snapchat: {
    app: ['snapchat://camera', 'snapchat://'],
    web: 'https://www.snapchat.com/',
  },
  youtube: {
    /** `https` often opens the YouTube app’s upload flow when installed (see platform behavior). */
    app: ['https://youtube.com/upload', 'youtube://'],
    web: 'https://youtube.com/upload',
  },
  tiktok: {
    app: ['tiktok://upload', 'tiktok://'],
    web: 'https://www.tiktok.com/',
  },
} as const satisfies Record<
  string,
  {
    app: readonly string[];
    web: string;
  }
>;

export type UserSocialPlatform = keyof typeof USER_SOCIAL_LAUNCH;

/** Official Cenaiva profiles — use in Settings (“Follow us”) and marketing. */
export const CENAIVA_FOLLOW_URLS = {
  instagram: 'https://instagram.com/heycenaiva',
  tiktok: 'https://www.tiktok.com/@heycenaiva',
  youtube: 'https://www.youtube.com/@heycenaiva',
  snapchat: 'https://www.snapchat.com/add/heycenaiva',
} as const;

export type CenaivaFollowPlatform = keyof typeof CENAIVA_FOLLOW_URLS;

/** @deprecated Use USER_SOCIAL_LAUNCH + UserSocialPlatform; kept for any lingering imports. */
export const CENAIVA_SOCIAL_URLS = {
  instagram: CENAIVA_FOLLOW_URLS.instagram,
  tiktok: CENAIVA_FOLLOW_URLS.tiktok,
  youtube: CENAIVA_FOLLOW_URLS.youtube,
  snapchat: CENAIVA_FOLLOW_URLS.snapchat,
} as const;

export type CenaivaSocialPlatform = keyof typeof CENAIVA_SOCIAL_URLS;

export async function openUserSocialApp(platform: UserSocialPlatform): Promise<void> {
  const { app, web } = USER_SOCIAL_LAUNCH[platform];

  for (const url of app) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next candidate
    }
  }

  await Linking.openURL(web);
}
