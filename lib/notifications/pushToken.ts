import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSupabase } from '@/lib/supabase/client';

type ExpoNotificationsModule = {
  getPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  requestPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  getExpoPushTokenAsync?: (input?: { projectId?: string }) => Promise<{ data: string }>;
  setNotificationChannelAsync?: (
    channelId: string,
    channel: {
      name: string;
      importance: number;
      vibrationPattern?: number[];
      lightColor?: string;
    },
  ) => Promise<unknown>;
  AndroidImportance?: { DEFAULT: number; HIGH: number; MAX: number };
};

type ExpoDeviceModule = {
  isDevice?: boolean;
};

function getExpoNotifications(): ExpoNotificationsModule | null {
  try {
    return require('expo-notifications') as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

function getExpoDevice(): ExpoDeviceModule | null {
  try {
    return require('expo-device') as ExpoDeviceModule;
  } catch {
    return null;
  }
}

function getProjectId(): string | undefined {
  const fromConfig = Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof fromConfig === 'string' && fromConfig) return fromConfig;
  const fromEasConfig = (Constants as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  return typeof fromEasConfig === 'string' ? fromEasConfig : undefined;
}

let registeredAndroidChannel = false;

async function ensureAndroidChannel(Notifications: ExpoNotificationsModule): Promise<void> {
  if (Platform.OS !== 'android' || registeredAndroidChannel) return;
  if (!Notifications.setNotificationChannelAsync) return;
  const importance = Notifications.AndroidImportance?.DEFAULT ?? 3;
  try {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Default',
      importance,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C9A84C',
    });
    registeredAndroidChannel = true;
  } catch {
    // non-fatal
  }
}

async function ensurePermission(Notifications: ExpoNotificationsModule): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync?.();
    const granted =
      current?.granted === true ||
      current?.status === 'granted' ||
      current?.status === 'authorized';
    if (granted) return true;
    const requested = await Notifications.requestPermissionsAsync?.();
    return (
      requested?.granted === true ||
      requested?.status === 'granted' ||
      requested?.status === 'authorized'
    );
  } catch {
    return false;
  }
}

let inflightRegistration: Promise<void> | null = null;

export function registerPushTokenForCurrentUser(): Promise<void> {
  if (inflightRegistration) return inflightRegistration;
  inflightRegistration = (async () => {
    try {
      const Device = getExpoDevice();
      if (Device && Device.isDevice === false) return;

      const Notifications = getExpoNotifications();
      if (!Notifications?.getExpoPushTokenAsync) return;

      const supabase = getSupabase();
      if (!supabase) return;
      const { data: sessionData } = await supabase.auth.getSession();
      const authUserId = sessionData.session?.user?.id;
      if (!authUserId) return;

      await ensureAndroidChannel(Notifications);

      const granted = await ensurePermission(Notifications);
      if (!granted) return;

      const projectId = getProjectId();
      const tokenResult = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const token = tokenResult?.data;
      if (!token) return;

      await supabase
        .from('user_profiles')
        .update({ expo_push_token: token })
        .eq('auth_user_id', authUserId);
    } catch {
      // Push registration is best-effort; never let it crash the app.
    } finally {
      inflightRegistration = null;
    }
  })();
  return inflightRegistration;
}

/**
 * Clear the current user's push token on signOut. Without this, server-
 * dispatched notifications addressed to the prior session keep landing on
 * the device after a different user signs in (or after the same user
 * signs out and walks away). The next sign-in re-registers the token, so
 * the only loss is a few seconds of "no notifications" right after
 * signOut completes.
 *
 * Best-effort: failures are swallowed so signOut never blocks on a
 * network call.
 *
 * Phase B+ hardening 2026-05-20.
 */
export async function clearPushTokenForCurrentUser(): Promise<void> {
  try {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data: sessionData } = await supabase.auth.getSession();
    const authUserId = sessionData.session?.user?.id;
    if (!authUserId) return;
    await supabase
      .from('user_profiles')
      .update({ expo_push_token: null })
      .eq('auth_user_id', authUserId);
  } catch {
    // Best-effort.
  }
}
