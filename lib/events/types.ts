/**
 * Cenaiva diner-facing events types + pure helpers. Source of truth.
 *
 * Backend-driven: live event rows come from `lib/events/getEvents.ts`
 * (Supabase) and are normalized to the `DiningEvent` shape via
 * `app/(customer)/events/index.tsx:mapEventRowToDining`. The mock
 * implementation that previously lived in `lib/mock/events.ts` was
 * deleted on 2026-05-21 — events are live-only now.
 */

export type EventType = 'event' | 'promotion' | 'happy_hour' | 'tasting_menu';

export interface DiningEvent {
  id: string;
  restaurantId: string;
  title: string;
  description: string;
  coverImage: string;
  type: EventType;
  /** ISO start datetime. */
  date: string;
  /** ISO end datetime. */
  endsAt: string;
  /** undefined = free / included. */
  price?: number;
  /** undefined = unlimited. */
  spotsLeft?: number;
  tags: string[];
  /** User IDs that have saved this event. Empty array when backend
   *  doesn't track diner saves yet. */
  savedBy: string[];
}

export type DateFilter = 'tonight' | 'this_weekend' | 'this_week' | 'all';

function nextWeekdayOffset(targetDow: number): number {
  const today = new Date().getDay();
  const diff = (targetDow - today + 7) % 7;
  return diff === 0 ? 7 : diff;
}

/**
 * Pure client-side filter — accepts an already-fetched event list and
 * narrows by date window + event type. No I/O; safe to call inside
 * useMemo. Hours are normalized to midnight so "tonight" includes
 * any event whose start date falls on the same calendar day.
 */
export function filterEvents(
  events: DiningEvent[],
  dateFilter: DateFilter,
  typeFilter: EventType | 'all',
): DiningEvent[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return events.filter((ev) => {
    const evDate = new Date(ev.date);
    const eventDay = new Date(evDate);
    eventDay.setHours(0, 0, 0, 0);

    if (typeFilter !== 'all' && ev.type !== typeFilter) return false;

    if (dateFilter === 'tonight') {
      return eventDay.getTime() === now.getTime();
    }
    if (dateFilter === 'this_weekend') {
      const sat = new Date(now);
      sat.setDate(now.getDate() + nextWeekdayOffset(6));
      const mon = new Date(sat);
      mon.setDate(sat.getDate() + 2);
      return eventDay >= sat && eventDay < mon;
    }
    if (dateFilter === 'this_week') {
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      return eventDay >= now && eventDay < weekEnd;
    }
    return true;
  });
}
