import { mockCustomer } from './users';
import { listSnapPostsByUser, snapUsers } from './snaps';

// -----------------------------------------------------------------------------
// Staff / system notifications (pre-existing)
// -----------------------------------------------------------------------------

export interface AppNotification {
  id: string;
  type:
    | 'booking_confirmed'
    | 'booking_reminder_24h'
    | 'booking_reminder_2h'
    | 'booking_cancelled'
    | 'shift_reminder'
    | 'no_show_flag'
    | 'payment_received'
    | 'waitlist_ready'
    | 'loyalty_milestone';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export const mockNotifications: AppNotification[] = [
  { id: 'n1', type: 'booking_confirmed', title: 'Booking Confirmed', body: 'Your reservation at Nova Ristorante for March 28 at 7:00 PM is confirmed.', isRead: false, createdAt: '2026-03-25T10:00:00-04:00' },
  { id: 'n2', type: 'loyalty_milestone', title: 'Silver Tier Reached!', body: 'Congratulations! You\'ve reached Silver tier. Enjoy exclusive benefits.', isRead: false, createdAt: '2026-03-24T14:00:00-04:00' },
  { id: 'n3', type: 'booking_reminder_24h', title: 'Reminder: Dinner Tomorrow', body: 'Your table at Nova Ristorante is tomorrow at 7:00 PM. Party of 2.', isRead: true, createdAt: '2026-03-27T19:00:00-04:00' },
  { id: 'n4', type: 'payment_received', title: 'Payment Received', body: 'Payment of $185.52 for Nova Ristorante has been processed.', isRead: true, createdAt: '2026-03-08T22:30:00-04:00' },
  { id: 'n5', type: 'booking_cancelled', title: 'Booking Cancelled', body: 'Your reservation at The Smoky Grill for Feb 20 has been cancelled.', isRead: true, createdAt: '2026-02-18T15:00:00-05:00' },
];

export const mockStaffNotifications: AppNotification[] = [
  { id: 'sn1', type: 'no_show_flag', title: 'No-Show Risk', body: 'Lisa Park (party of 8, 8:30 PM) has a high no-show risk score.', isRead: false, createdAt: '2026-03-25T16:00:00-04:00' },
  { id: 'sn2', type: 'booking_confirmed', title: 'New Reservation', body: 'David Kim booked a table for 2 at 8:00 PM tonight.', isRead: false, createdAt: '2026-03-25T14:30:00-04:00' },
  { id: 'sn3', type: 'shift_reminder', title: 'Shift Tomorrow', body: 'You have a dinner shift tomorrow from 4:00 PM to 11:00 PM.', isRead: true, createdAt: '2026-03-24T09:00:00-04:00' },
  { id: 'sn4', type: 'payment_received', title: 'Payment Received', body: 'Table T5 bill of $108.43 has been paid.', isRead: true, createdAt: '2026-03-25T21:00:00-04:00' },
];

// -----------------------------------------------------------------------------
// Social notifications (new: likes / comments / follows for the food feed)
// -----------------------------------------------------------------------------

export type SocialNotificationType = 'like' | 'comment' | 'follow';

export type SocialNotification = {
  id: string;
  ownerId: string;
  type: SocialNotificationType;
  actorId: string;
  postId?: string;
  commentText?: string;
  timestamp: string;
  read: boolean;
};

const OWNER = mockCustomer.id;

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

const myPosts = listSnapPostsByUser(OWNER);
const myFirstPostId = myPosts[0]?.id;
const mySecondPostId = myPosts[1]?.id ?? myFirstPostId;

const seed: SocialNotification[] = [
  { id: 'sn-1', ownerId: OWNER, type: 'like', actorId: 'u3', postId: myFirstPostId, timestamp: hoursAgo(0.5), read: false },
  { id: 'sn-2', ownerId: OWNER, type: 'comment', actorId: 'u4', postId: myFirstPostId, commentText: 'taking my partner here next week!!', timestamp: hoursAgo(1.2), read: false },
  { id: 'sn-3', ownerId: OWNER, type: 'follow', actorId: 'u6', timestamp: hoursAgo(2), read: false },
  { id: 'sn-4', ownerId: OWNER, type: 'like', actorId: 'u5', postId: mySecondPostId, timestamp: hoursAgo(4), read: false },
  { id: 'sn-5', ownerId: OWNER, type: 'like', actorId: 'u8', postId: myFirstPostId, timestamp: hoursAgo(8), read: true },
  { id: 'sn-6', ownerId: OWNER, type: 'comment', actorId: 'u7', postId: mySecondPostId, commentText: 'need this in my life rn', timestamp: hoursAgo(22), read: true },
  { id: 'sn-7', ownerId: OWNER, type: 'follow', actorId: 'u10', timestamp: hoursAgo(30), read: true },
  { id: 'sn-8', ownerId: OWNER, type: 'like', actorId: 'u9', postId: myFirstPostId, timestamp: hoursAgo(48), read: true },
  { id: 'sn-9', ownerId: OWNER, type: 'comment', actorId: 'u11', postId: myFirstPostId, commentText: 'what did you order?', timestamp: hoursAgo(72), read: true },
  { id: 'sn-10', ownerId: OWNER, type: 'follow', actorId: 'u8', timestamp: hoursAgo(120), read: true },
  { id: 'sn-11', ownerId: OWNER, type: 'like', actorId: 'u3', postId: mySecondPostId, timestamp: hoursAgo(180), read: true },
  { id: 'sn-12', ownerId: OWNER, type: 'like', actorId: 'u4', postId: myFirstPostId, timestamp: hoursAgo(240), read: true },
];

const socialNotifications = new Map<string, SocialNotification[]>([[OWNER, seed]]);

export function listNotifications(userId: string): SocialNotification[] {
  return [...(socialNotifications.get(userId) ?? [])].sort(
    (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp),
  );
}

export function getUnreadCount(userId: string): number {
  return (socialNotifications.get(userId) ?? []).filter((n) => !n.read).length;
}

export function markAllRead(userId: string): void {
  const list = socialNotifications.get(userId);
  if (!list) return;
  list.forEach((n) => {
    n.read = true;
  });
}

export function getNotificationActor(actorId: string) {
  return snapUsers.find((u) => u.id === actorId);
}

export type NotificationBucket = 'today' | 'thisWeek' | 'earlier';

export function bucketNotifications(
  list: SocialNotification[],
): Record<NotificationBucket, SocialNotification[]> {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const buckets: Record<NotificationBucket, SocialNotification[]> = {
    today: [],
    thisWeek: [],
    earlier: [],
  };
  list.forEach((n) => {
    const age = now - +new Date(n.timestamp);
    if (age < dayMs) buckets.today.push(n);
    else if (age < 7 * dayMs) buckets.thisWeek.push(n);
    else buckets.earlier.push(n);
  });
  return buckets;
}
