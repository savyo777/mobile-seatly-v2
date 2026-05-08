import type { AppNotification } from '@/lib/mock/notifications';

export type NormalizedStaffNotification = {
  id: string;
  type: AppNotification['type'] | 'unknown';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
};

const KNOWN_TYPES = new Set<AppNotification['type']>([
  'booking_confirmed',
  'booking_reminder_24h',
  'booking_reminder_2h',
  'booking_cancelled',
  'shift_reminder',
  'no_show_flag',
  'payment_received',
  'waitlist_ready',
  'loyalty_milestone',
]);

function safeObject(value: unknown): Partial<AppNotification> {
  return value && typeof value === 'object' ? (value as Partial<AppNotification>) : {};
}

function safeText(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
}

export function normalizeStaffNotification(
  value: unknown,
  index = 0,
): NormalizedStaffNotification {
  const item = safeObject(value);
  const rawType = item.type;
  const type =
    typeof rawType === 'string' && KNOWN_TYPES.has(rawType as AppNotification['type'])
      ? (rawType as AppNotification['type'])
      : 'unknown';

  return {
    id: safeText(item.id, `staff-notification-${index}`),
    type,
    title: safeText(item.title, 'Notification'),
    body: typeof item.body === 'string' ? item.body : '',
    isRead: item.isRead === true,
    createdAt: typeof item.createdAt === 'string' ? item.createdAt : '',
  };
}

export function normalizeStaffNotifications(values: unknown): NormalizedStaffNotification[] {
  if (!Array.isArray(values)) return [];
  return values.map((value, index) => normalizeStaffNotification(value, index));
}

export function getStaffNotificationIconName(type: NormalizedStaffNotification['type']): string {
  switch (type) {
    case 'no_show_flag':
      return 'alert-circle';
    case 'booking_confirmed':
    case 'booking_reminder_24h':
    case 'booking_reminder_2h':
    case 'booking_cancelled':
    case 'waitlist_ready':
      return 'calendar';
    case 'payment_received':
      return 'cash';
    case 'shift_reminder':
      return 'time';
    case 'loyalty_milestone':
      return 'star';
    default:
      return 'notifications';
  }
}

export function getStaffNotificationTimeLabel(iso: unknown, locale: unknown): string {
  const language = typeof locale === 'string' ? locale.toLowerCase() : '';
  const fr = language.startsWith('fr');
  const ts = typeof iso === 'string' ? new Date(iso).getTime() : Number.NaN;
  if (!Number.isFinite(ts)) return fr ? 'Date inconnue' : 'Unknown time';

  const sec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (sec < 60) return fr ? "à l'instant" : 'just now';

  const min = Math.floor(sec / 60);
  if (min < 60) return fr ? `il y a ${min} min` : `${min} min ago`;

  const hr = Math.floor(min / 60);
  if (hr < 24) return fr ? `il y a ${hr} h` : `${hr}h ago`;

  const day = Math.floor(hr / 24);
  if (day < 7) return fr ? `il y a ${day} j` : `${day}d ago`;

  const week = Math.floor(day / 7);
  if (week < 5) return fr ? `il y a ${week} sem` : `${week}w ago`;

  try {
    return new Date(ts).toLocaleDateString(fr ? 'fr-FR' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch (error) {
    console.error('[Staff notifications] date formatting recovered', { iso, locale, error });
    return fr ? 'Date inconnue' : 'Unknown time';
  }
}
