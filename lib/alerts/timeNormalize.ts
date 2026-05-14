// Converts a user-facing time string (12h "6:00 PM" or 24h "18:00") into the
// canonical "HH:MM" 24-hour form the create_availability_alert RPC and the
// slot_opened deep-link route expect. Returns null when the input can't be
// parsed.

export function to24h(input: string | undefined | null): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;

  const ampmMatch = trimmed.match(/^(\d{1,2}):?(\d{2})?\s*(am|pm)$/i);
  if (ampmMatch) {
    const rawHour = parseInt(ampmMatch[1] ?? '', 10);
    const minutes = parseInt(ampmMatch[2] ?? '0', 10);
    const meridiem = (ampmMatch[3] ?? '').toLowerCase();
    if (!Number.isFinite(rawHour) || !Number.isFinite(minutes)) return null;
    if (rawHour < 1 || rawHour > 12 || minutes < 0 || minutes > 59) return null;
    let hour = rawHour % 12;
    if (meridiem === 'pm') hour += 12;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  const twentyFourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourMatch) {
    const hour = parseInt(twentyFourMatch[1] ?? '', 10);
    const minutes = parseInt(twentyFourMatch[2] ?? '', 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minutes)) return null;
    if (hour < 0 || hour > 23 || minutes < 0 || minutes > 59) return null;
    return `${String(hour).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  return null;
}
