export interface AppNotification {
  id: string;
  type: 'booking_confirmed' | 'booking_reminder_24h' | 'booking_reminder_2h' | 'booking_cancelled' | 'shift_reminder' | 'no_show_flag' | 'payment_received' | 'waitlist_ready' | 'loyalty_milestone';
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
