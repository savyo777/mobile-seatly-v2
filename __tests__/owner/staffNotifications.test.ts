import {
  getStaffNotificationIconName,
  getStaffNotificationTimeLabel,
  normalizeStaffNotification,
  normalizeStaffNotifications,
} from '@/lib/notifications/staffNotifications';

describe('staff notifications', () => {
  const now = new Date('2026-05-07T16:00:00.000Z').getTime();

  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(now);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('normalizes valid staff notification data', () => {
    expect(
      normalizeStaffNotification({
        id: 'sn-1',
        type: 'booking_confirmed',
        title: 'New Reservation',
        body: 'A table was booked.',
        isRead: true,
        createdAt: '2026-05-07T15:50:00.000Z',
      }),
    ).toEqual({
      id: 'sn-1',
      type: 'booking_confirmed',
      title: 'New Reservation',
      body: 'A table was booked.',
      isRead: true,
      createdAt: '2026-05-07T15:50:00.000Z',
    });
  });

  it('normalizes malformed staff notification data without throwing', () => {
    expect(() => normalizeStaffNotifications([null, { type: 'bad', id: '', title: 123 }])).not.toThrow();
    expect(normalizeStaffNotifications(undefined)).toEqual([]);
    expect(normalizeStaffNotifications([null, { type: 'bad', id: '', title: 123 }])).toEqual([
      {
        id: 'staff-notification-0',
        type: 'unknown',
        title: 'Notification',
        body: '',
        isRead: false,
        createdAt: '',
      },
      {
        id: 'staff-notification-1',
        type: 'unknown',
        title: 'Notification',
        body: '',
        isRead: false,
        createdAt: '',
      },
    ]);
  });

  it('formats known and malformed notification times without Intl dependencies', () => {
    expect(getStaffNotificationTimeLabel('2026-05-07T15:59:30.000Z', 'en')).toBe('just now');
    expect(getStaffNotificationTimeLabel('2026-05-07T15:30:00.000Z', 'en')).toBe('30 min ago');
    expect(getStaffNotificationTimeLabel('not-a-date', 'en')).toBe('Unknown time');
    expect(getStaffNotificationTimeLabel(undefined, 'fr-CA')).toBe('Date inconnue');
  });

  it('falls back to a safe icon for unknown types', () => {
    expect(getStaffNotificationIconName('booking_cancelled')).toBe('calendar');
    expect(getStaffNotificationIconName('unknown')).toBe('notifications');
  });
});
