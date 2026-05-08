import type { PostTurnRequest } from '@/lib/postVisit/postTurnTypes';

type ExpoNotificationsModule = {
  getPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  requestPermissionsAsync?: () => Promise<{ status?: string; granted?: boolean }>;
  scheduleNotificationAsync?: (input: {
    content: {
      title: string;
      body: string;
      data?: Record<string, unknown>;
    };
    trigger: null;
  }) => Promise<string>;
};

function getExpoNotifications(): ExpoNotificationsModule | null {
  try {
    // expo-notifications is an optional native dependency in this project.
    // When it is installed in a dev/prod build this schedules the one-time
    // outside-app notification; otherwise the app keeps the in-app request.
    return require('expo-notifications') as ExpoNotificationsModule;
  } catch {
    return null;
  }
}

export async function sendPostTurnPushNotification(request: PostTurnRequest): Promise<boolean> {
  const Notifications = getExpoNotifications();
  if (!Notifications?.scheduleNotificationAsync) return false;

  try {
    const current = await Notifications.getPermissionsAsync?.();
    const granted =
      current?.granted === true ||
      current?.status === 'granted' ||
      current?.status === 'authorized';

    if (!granted) {
      const requested = await Notifications.requestPermissionsAsync?.();
      const allowed =
        requested?.granted === true ||
        requested?.status === 'granted' ||
        requested?.status === 'authorized';
      if (!allowed) return false;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: request.type === 'review' ? 'How was your visit?' : 'Share photos from your visit',
        body:
          request.type === 'review'
            ? `Leave a quick review for ${request.restaurantName}.`
            : `Upload photos from your visit to ${request.restaurantName}.`,
        data: {
          type: `post_turn_${request.type}`,
          requestId: request.id,
          bookingId: request.bookingId,
          restaurantId: request.restaurantId,
        },
      },
      trigger: null,
    });
    return true;
  } catch {
    return false;
  }
}
