import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter, type Href } from 'expo-router';

/**
 * Mounted once near the root (`app/_layout.tsx`). Owns the Expo
 * notification listeners — without these, a tap on a push does nothing
 * even if the OS delivers it.
 *
 * Responsibilities:
 *   1. Configure how notifications display while the app is foregrounded
 *      (banner + sound, no badge — badge management is post-MVP).
 *   2. `addNotificationReceivedListener` — log received payloads so we
 *      can see them in Metro. Post-MVP this is where we'd bump the
 *      in-app activity badge.
 *   3. `addNotificationResponseReceivedListener` — when the user taps a
 *      push, route based on `data.kind` (set server-side by
 *      `_shared/expo-push.ts`).
 *   4. Cold-start: if the user tapped a push that woke the app from
 *      killed state, the response shows up via
 *      `getLastNotificationResponseAsync()` — handle it once on mount.
 *
 * The 4 push kinds (`booking_confirmed`, `reservation_reminder`,
 * `waitlist_ready`, `review_request`) all route to `/(customer)/activity`
 * today — the activity screen + `PostTurnPromptHost` together surface
 * the right detail screen / modal based on data already in the DB.
 * Per-kind routing is here so future deep links (e.g. a dedicated
 * confirmation screen) only need a single switch case to land.
 */

type PushKind =
  | 'booking_confirmed'
  | 'reservation_reminder'
  | 'waitlist_ready'
  | 'review_request';

interface PushData {
  kind?: PushKind;
  reservationId?: string;
  restaurantId?: string;
  bookingId?: string;
  waitlistId?: string;
}

function readPushData(raw: unknown): PushData {
  if (!raw || typeof raw !== 'object') return {};
  const obj = raw as Record<string, unknown>;
  return {
    kind: typeof obj.kind === 'string' ? (obj.kind as PushKind) : undefined,
    reservationId: typeof obj.reservationId === 'string' ? obj.reservationId : undefined,
    restaurantId: typeof obj.restaurantId === 'string' ? obj.restaurantId : undefined,
    bookingId: typeof obj.bookingId === 'string' ? obj.bookingId : undefined,
    waitlistId: typeof obj.waitlistId === 'string' ? obj.waitlistId : undefined,
  };
}

function routeFor(kind: PushKind | undefined): Href {
  switch (kind) {
    case 'booking_confirmed':
    case 'reservation_reminder':
    case 'waitlist_ready':
    case 'review_request':
      // Activity is the catch-all destination. PostTurnPromptHost will
      // auto-pop the review modal when there's a pending request.
      return '/(customer)/activity' as Href;
    default:
      return '/(customer)/activity' as Href;
  }
}

// Foreground display config. iOS otherwise swallows notifications when
// the app is in the foreground; this opts in to show the banner + play
// a sound. Done once at module load — calling it inside the component
// would re-register on every mount.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function NotificationHandler() {
  const router = useRouter();
  const coldStartHandledRef = useRef(false);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = readPushData(notification.request.content.data);
      // Foreground receive log. The OS still shows the banner per
      // `setNotificationHandler` above; this is just observability.
      if (__DEV__) {
        // eslint-disable-next-line no-console
        console.log('[push] received', data.kind, data);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = readPushData(response.notification.request.content.data);
      try {
        router.push(routeFor(data.kind));
      } catch (err) {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn('[push] route failed', err);
        }
      }
    });

    // Cold-start: if a push tap launched the app from killed state, the
    // response is queued and surfaces here. Handle exactly once.
    if (!coldStartHandledRef.current) {
      coldStartHandledRef.current = true;
      void Notifications.getLastNotificationResponseAsync().then((response) => {
        if (!response) return;
        const data = readPushData(response.notification.request.content.data);
        try {
          router.push(routeFor(data.kind));
        } catch (err) {
          if (__DEV__) {
            // eslint-disable-next-line no-console
            console.warn('[push] cold-start route failed', err);
          }
        }
      });
    }

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router]);

  return null;
}
