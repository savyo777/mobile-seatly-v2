import * as Calendar from 'expo-calendar';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert, Linking, Platform } from 'react-native';
import { BRAND_DOMAIN } from '@/lib/config/legalLinks';
import { DEFAULT_TURN_MINUTES } from '@/lib/booking/bookingDefaults';
import i18n from '@/lib/i18n';

export type CalendarBooking = {
  reservationId: string;
  confirmationCode: string;
  restaurantName: string;
  restaurantAddress?: string | null;
  startDateTime: string;
  durationMinutes?: number | null;
  partySize: number;
  notes?: string | null;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIcsUtc(value: Date): string {
  return (
    value.getUTCFullYear().toString() +
    pad(value.getUTCMonth() + 1) +
    pad(value.getUTCDate()) +
    'T' +
    pad(value.getUTCHours()) +
    pad(value.getUTCMinutes()) +
    pad(value.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r?\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function buildIcsContent(booking: CalendarBooking): string {
  const start = new Date(booking.startDateTime);
  const duration = booking.durationMinutes && booking.durationMinutes > 0
    ? booking.durationMinutes
    : DEFAULT_TURN_MINUTES;
  const end = new Date(start.getTime() + duration * 60_000);
  const now = new Date();

  const summary = escapeIcsText(i18n.t('calendar.eventTitle', { name: booking.restaurantName }));
  const descriptionLines = [
    i18n.t('calendar.confirmationCode', { code: booking.confirmationCode }),
    i18n.t('calendar.partyOf', { count: booking.partySize }),
  ];
  if (booking.notes && booking.notes.trim()) {
    descriptionLines.push(i18n.t('calendar.notes', { text: booking.notes.trim() }));
  }
  const description = escapeIcsText(descriptionLines.join('\n'));
  const location = booking.restaurantAddress ? escapeIcsText(booking.restaurantAddress) : '';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cenaiva//Reservation//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${booking.reservationId}@${BRAND_DOMAIN}`,
    `DTSTAMP:${toIcsUtc(now)}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${summary}`,
    `DESCRIPTION:${description}`,
  ];
  if (location) lines.push(`LOCATION:${location}`);
  lines.push('BEGIN:VALARM');
  lines.push('ACTION:DISPLAY');
  lines.push(`DESCRIPTION:${summary}`);
  lines.push('TRIGGER:-PT2H');
  lines.push('END:VALARM');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

function buildGoogleCalendarUrl(booking: CalendarBooking): string {
  const start = new Date(booking.startDateTime);
  const duration = booking.durationMinutes && booking.durationMinutes > 0
    ? booking.durationMinutes
    : DEFAULT_TURN_MINUTES;
  const end = new Date(start.getTime() + duration * 60_000);

  const title = i18n.t('calendar.eventTitle', { name: booking.restaurantName });
  const details = [
    i18n.t('calendar.confirmationCode', { code: booking.confirmationCode }),
    i18n.t('calendar.partyOf', { count: booking.partySize }),
    booking.notes ? i18n.t('calendar.notes', { text: booking.notes }) : '',
  ]
    .filter(Boolean)
    .join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details,
  });
  if (booking.restaurantAddress) {
    params.set('location', booking.restaurantAddress);
  }
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// Picks the device's "primary" writable calendar. iOS exposes a
// `isPrimary` flag on the default source; Android exposes a single
// `Calendar.SOURCE_DEFAULT` source per account. Both providers fall back
// to the first allowsModifications calendar if no obvious primary exists.
function pickPrimaryCalendar(calendars: Calendar.Calendar[]): Calendar.Calendar | null {
  const writable = calendars.filter((cal) => cal.allowsModifications);
  if (writable.length === 0) return null;

  if (Platform.OS === 'ios') {
    const primary = writable.find((cal) => (cal as any).isPrimary === true);
    if (primary) return primary;
    // iOS users typically have an iCloud or Local calendar as default —
    // prefer ones owned by the device account before falling back.
    const local = writable.find(
      (cal) => cal.source && (cal.source.type === 'LOCAL' || cal.source.name?.toLowerCase() === 'default'),
    );
    if (local) return local;
  } else if (Platform.OS === 'android') {
    // Android: prefer the account-owner calendar (ownerAccount matches
    // the account name) which is usually the primary Google calendar.
    const primary = writable.find(
      (cal) => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER && cal.ownerAccount === cal.source?.name,
    );
    if (primary) return primary;
    const owner = writable.find((cal) => cal.accessLevel === Calendar.CalendarAccessLevel.OWNER);
    if (owner) return owner;
  }

  return writable[0];
}

async function writeEventToDeviceCalendar(booking: CalendarBooking): Promise<boolean> {
  // Ask for permission. On Android (API 33+) and iOS 17+ the OS allows
  // limited / write-only access; expo-calendar resolves that to a single
  // permission. Bail early if user denies.
  const { status } = await Calendar.requestCalendarPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert(
      i18n.t('calendar.permissionDeniedTitle'),
      i18n.t('calendar.permissionDeniedBody'),
    );
    return false;
  }

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const target = pickPrimaryCalendar(calendars);
  if (!target) {
    Alert.alert(i18n.t('calendar.permissionDeniedTitle'), i18n.t('calendar.noWritableCalendar'));
    return false;
  }

  const start = new Date(booking.startDateTime);
  const duration = booking.durationMinutes && booking.durationMinutes > 0
    ? booking.durationMinutes
    : DEFAULT_TURN_MINUTES;
  const end = new Date(start.getTime() + duration * 60_000);

  const title = i18n.t('calendar.eventTitle', { name: booking.restaurantName });
  const notesParts = [
    i18n.t('calendar.confirmationCode', { code: booking.confirmationCode }),
    i18n.t('calendar.partyOf', { count: booking.partySize }),
  ];
  if (booking.notes && booking.notes.trim()) {
    notesParts.push(i18n.t('calendar.notes', { text: booking.notes.trim() }));
  }
  const description = notesParts.join('\n');

  await Calendar.createEventAsync(target.id, {
    title,
    startDate: start,
    endDate: end,
    location: booking.restaurantAddress ?? undefined,
    notes: description,
    // 2-hour heads-up alarm, mirroring the ICS VALARM we used to ship.
    alarms: [{ relativeOffset: -120 }],
    // timeZone omitted on purpose — expo-calendar defaults to the device
    // timezone, and our `startDate` is already an absolute instant (from
    // booking.startDateTime which is ISO with offset), so the OS will
    // render the event correctly in the user's local time.
  });

  Alert.alert(
    i18n.t('calendar.addedTitle'),
    i18n.t('calendar.addedBody', {
      name: booking.restaurantName,
      when: start.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }),
    }),
  );
  return true;
}

async function shareIcsFallback(booking: CalendarBooking): Promise<void> {
  const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!cacheDir) {
    throw new Error('Device storage is not available for the calendar export.');
  }

  const directory = `${cacheDir}cenaiva-calendar/`;
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });

  const safeCode = booking.confirmationCode.replace(/[^A-Za-z0-9_-]/g, '') || booking.reservationId;
  const fileUri = `${directory}reservation-${safeCode}.ics`;
  const content = buildIcsContent(booking);

  await FileSystem.writeAsStringAsync(fileUri, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const sharingAvailable = await Sharing.isAvailableAsync();
  if (sharingAvailable) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/calendar',
      UTI: 'com.apple.ical.ics',
      dialogTitle: i18n.t('calendar.shareDialogTitle'),
    });
    return;
  }

  const fallbackUrl = buildGoogleCalendarUrl(booking);
  await Linking.openURL(fallbackUrl);
}

export async function addBookingToCalendar(booking: CalendarBooking): Promise<void> {
  if (!booking.startDateTime || Number.isNaN(new Date(booking.startDateTime).getTime())) {
    throw new Error('Reservation time is missing.');
  }

  if (Platform.OS === 'web') {
    const url = buildGoogleCalendarUrl(booking);
    await Linking.openURL(url);
    return;
  }

  // Try the direct device-calendar write first (one tap → event lives in
  // the user's primary calendar). If permission is denied or the device
  // has no writable calendar, fall back to the .ics share sheet which
  // routes through whatever calendar app the user picks.
  try {
    const wrote = await writeEventToDeviceCalendar(booking);
    if (wrote) return;
  } catch (err) {
    // expo-calendar can throw on edge devices (no calendar account on a
    // bare Android emulator). Silently fall through to the ICS path so
    // the user still gets a way to save the event.
    console.warn('[addToCalendar] direct write failed, falling back to ICS share', err);
  }

  await shareIcsFallback(booking);
}
