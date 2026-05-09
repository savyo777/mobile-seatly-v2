import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';
import { BRAND_DOMAIN } from '@/lib/config/legalLinks';
import { DEFAULT_TURN_MINUTES } from '@/lib/booking/bookingDefaults';

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

  const summary = escapeIcsText(`Reservation at ${booking.restaurantName}`);
  const descriptionLines = [
    `Confirmation code: ${booking.confirmationCode}`,
    `Party of ${booking.partySize}`,
  ];
  if (booking.notes && booking.notes.trim()) {
    descriptionLines.push(`Notes: ${booking.notes.trim()}`);
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

  const title = `Reservation at ${booking.restaurantName}`;
  const details = [
    `Confirmation code: ${booking.confirmationCode}`,
    `Party of ${booking.partySize}`,
    booking.notes ? `Notes: ${booking.notes}` : '',
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

export async function addBookingToCalendar(booking: CalendarBooking): Promise<void> {
  if (!booking.startDateTime || Number.isNaN(new Date(booking.startDateTime).getTime())) {
    throw new Error('Reservation time is missing.');
  }

  if (Platform.OS === 'web') {
    const url = buildGoogleCalendarUrl(booking);
    await Linking.openURL(url);
    return;
  }

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
      dialogTitle: 'Add reservation to your calendar',
    });
    return;
  }

  const fallbackUrl = buildGoogleCalendarUrl(booking);
  await Linking.openURL(fallbackUrl);
}
