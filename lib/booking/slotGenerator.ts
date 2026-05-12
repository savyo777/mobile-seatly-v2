/**
 * Client-side availability slot generator.
 *
 * !!! IMPORTANT — DO NOT WIRE THIS INTO THE CUSTOMER BOOKING FLOW !!!
 *
 * This is a documented sibling of the server RPC `get_available_slots_cached`
 * (which in turn delegates to `get_available_slots`). It was extracted as part
 * of Phase 3a of the "Bring backend logic into the business-side mobile app"
 * plan, with the explicit acceptance criterion that the client output must
 * match the RPC output *byte-for-byte* (same `slots` array shape, same
 * `table_ids`, same `duration_minutes`, same `floor_capacity`) before any
 * call site is swapped over.
 *
 * Why this stays a sibling (and the RPC stays alive):
 *
 * 1. RLS — the server RPC is `SECURITY DEFINER`. The mobile client is subject
 *    to RLS. The anon role *cannot* read other users' rows in `reservations`
 *    (only `reservations_select_own` / `reservations_select_staff_roles`
 *    apply). So a non-staff caller running this code would silently miss
 *    every booking made by other customers and report slots as available
 *    that are actually taken. Owner/manager/host/staff sessions are fine.
 *
 * 2. Table allocation — the server uses
 *    `find_available_table_group(restaurant_id, reserved_at, party_size, turn_minutes)`
 *    which runs a recursive CTE: smallest single fit first, then a
 *    section-grouped recursive combine with a spatial-adjacency check
 *    (sqrt(dx^2+dy^2) <= 170), then a fallback any-section combine. The
 *    output of THAT function is what populates `table_ids` on each slot.
 *    Replicating the recursive combine + adjacency exactly in TypeScript is
 *    non-trivial and the spatial-distance threshold is hard-coded in the SQL
 *    (170). Until we verify byte-identical output across a representative
 *    sample of restaurants, we must not swap.
 *
 * 3. Turn-minutes resolution — the server pulls turn minutes from
 *    `restaurants.settings_json->>'turnTimeMinutes'` first, then the shift's
 *    `turn_time_minutes`, then 90, clamped to [15, 480]. We mirror that here.
 *
 * For staff-side previews (e.g. an owner-side "what does my Friday look
 * like?" widget), this helper is safe because staff sessions can see all
 * reservations under their restaurant. Customer-side callers must continue
 * to use the RPC via `publicBookingApi.getAvailability`.
 *
 * The shape of `AvailabilityResponse` is re-exported from `publicBookingApi`
 * so the helper is a drop-in slot-source the moment a future agent verifies
 * correctness for the customer flow.
 */

import { getSupabase } from '@/lib/supabase/client';
import {
  DEFAULT_TIMEZONE,
  DEFAULT_TURN_MINUTES,
  DEFAULT_SLOT_DURATION_MINUTES,
} from '@/lib/booking/bookingDefaults';
import {
  type BookingHoursJson,
  getBookingMinutesWindowForDate,
  parseClockTime,
} from '@/lib/booking/hoursSchedule';
import type { AvailabilityResponse, AvailabilitySlot } from '@/lib/booking/publicBookingApi';

const SLOT_HARD_CAP = 48;
const ADJACENCY_DISTANCE = 170;
const COMBINE_TABLE_CAP = 36;
const COMBINE_MAX_GROUP = 16;
const TURN_MIN = 15;
const TURN_MAX = 480;

type ShiftRow = {
  id: string;
  name: string | null;
  start_time: string | null;
  end_time: string | null;
  slot_duration_minutes: number | null;
  turn_time_minutes: number | null;
  max_covers: number | null;
  blackout_dates: string[] | null;
  advance_booking_days: number | null;
  days_of_week: number[] | null;
};

type TableRow = {
  id: string;
  capacity: number;
  table_number: string | null;
  label: string | null;
  section: string | null;
  section_id: string | null;
  position_x: number | null;
  position_y: number | null;
  min_party: number | null;
  is_active: boolean | null;
  status: string | null;
};

type ReservationRow = {
  id: string;
  shift_id: string | null;
  reserved_at: string;
  party_size: number;
  status: string | null;
  duration_minutes: number | null;
  table_id: string | null;
};

type ReservationTableRow = {
  reservation_id: string;
  table_id: string;
  released_at: string | null;
};

type RestaurantRow = {
  timezone: string | null;
  hours_json: BookingHoursJson | null;
  settings_json: Record<string, unknown> | null;
};

export type GenerateAvailabilitySlotsArgs = {
  restaurantId: string;
  date: string; // YYYY-MM-DD
  partySize: number;
  /** Optional timezone override; otherwise pulled from `restaurants.timezone`. */
  timezone?: string | null;
};

/** UTC offset (minutes) for a given timezone at a given Date. */
function getUTCOffsetMinutes(date: Date, timezone: string): number {
  const utcMs = new Date(date.toLocaleString('en-US', { timeZone: 'UTC' })).getTime();
  const tzMs = new Date(date.toLocaleString('en-US', { timeZone: timezone })).getTime();
  return (utcMs - tzMs) / 60_000;
}

/** Convert a restaurant-local YYYY-MM-DD + HH:MM to a UTC ISO string. Mirrors `_shared/time.ts`. */
function localToUTC(dateStr: string, timeStr: string, timezone: string): string {
  const tempDate = new Date(`${dateStr}T${timeStr}:00Z`);
  const offsetMinutes = getUTCOffsetMinutes(tempDate, timezone);
  return new Date(tempDate.getTime() + offsetMinutes * 60_000).toISOString();
}

/** JS-style day-of-week (0=Sun … 6=Sat) for a YYYY-MM-DD string in `timezone`. */
function localDayOfWeek(dateStr: string, timezone: string): number {
  const anchor = new Date(`${dateStr}T12:00:00Z`);
  const localDow = new Intl.DateTimeFormat('en-US', { timeZone: timezone, weekday: 'short' }).format(
    anchor,
  );
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[localDow] ?? anchor.getUTCDay();
}

function parseTimeOfDayToMinutes(value: string | null): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{2}):(\d{2})(?::\d{2})?$/);
  if (!m) {
    const parsed = parseClockTime(value);
    return parsed?.minutes ?? null;
  }
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

function clampTurnMinutes(value: number | null | undefined): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TURN_MINUTES;
  return Math.max(TURN_MIN, Math.min(TURN_MAX, Math.trunc(n)));
}

function resolveTurnMinutes(restaurant: RestaurantRow | null, shift: ShiftRow): number {
  const settings = restaurant?.settings_json ?? null;
  const raw = settings ? settings['turnTimeMinutes'] : undefined;
  const fromSettings = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isFinite(fromSettings) && fromSettings > 0) return clampTurnMinutes(fromSettings);
  if (shift.turn_time_minutes != null) return clampTurnMinutes(shift.turn_time_minutes);
  return DEFAULT_TURN_MINUTES;
}

function formatDisplayTime(isoUtc: string, timezone: string): string {
  try {
    return new Date(isoUtc).toLocaleTimeString('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return new Date(isoUtc).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
}

/**
 * Smallest-fit single-table search.
 * Mirrors the first SELECT in `find_available_table_group`:
 *   ORDER BY capacity ASC, table_number ASC LIMIT 1.
 */
function pickSingleTable(
  candidates: TableRow[],
  unavailable: Set<string>,
  partySize: number,
): string[] | null {
  const eligible = candidates
    .filter((t) => !unavailable.has(t.id))
    .filter((t) => (t.min_party ?? 1) <= partySize)
    .filter((t) => t.capacity >= partySize)
    .sort((a, b) => {
      if (a.capacity !== b.capacity) return a.capacity - b.capacity;
      return String(a.table_number ?? '').localeCompare(String(b.table_number ?? ''));
    });
  if (eligible.length === 0) return null;
  return [eligible[0].id];
}

type CombineCandidate = {
  id: string;
  capacity: number;
  sectionKey: string;
  x: number;
  y: number;
  sortLabel: string;
};

/**
 * Section-grouped recursive combine with spatial adjacency.
 * Mirrors the second CTE in `find_available_table_group`. We pre-rank tables
 * by (capacity ASC, table_number ASC), keep the first 36, then do a
 * breadth-first walk extending each group by tables strictly after the
 * highest-ordered member, same section, and within `ADJACENCY_DISTANCE` of
 * any existing member. Groups capped at 16 tables.
 *
 * When `requireSection` is false, the adjacency check is dropped and so is
 * the same-section requirement — that's the third CTE in the SQL.
 */
function pickCombo(
  candidates: TableRow[],
  unavailable: Set<string>,
  partySize: number,
  requireSection: boolean,
): string[] | null {
  const eligible = candidates
    .filter((t) => !unavailable.has(t.id))
    .filter((t) => (t.min_party ?? 1) <= partySize)
    .filter((t) => Math.max(t.capacity, 0) > 0)
    .sort((a, b) => {
      if (a.capacity !== b.capacity) return a.capacity - b.capacity;
      return String(a.table_number ?? '').localeCompare(String(b.table_number ?? ''));
    })
    .slice(0, COMBINE_TABLE_CAP)
    .map<CombineCandidate>((t) => ({
      id: t.id,
      capacity: Math.max(t.capacity, 0),
      sectionKey: requireSection ? (t.section_id ?? t.section ?? '') : '',
      x: t.position_x ?? 0,
      y: t.position_y ?? 0,
      sortLabel: t.label ?? t.table_number ?? t.id,
    }));

  type Group = {
    tableIds: string[];
    path: number[];
    totalCapacity: number;
    sectionKey: string;
    sortLabels: string[];
  };

  // Stable ord matching the SQL row_number() ordering: capacity ASC, sort_label ASC, id ASC.
  const ordered = [...eligible].sort((a, b) => {
    if (a.capacity !== b.capacity) return a.capacity - b.capacity;
    if (a.sortLabel !== b.sortLabel) return a.sortLabel.localeCompare(b.sortLabel);
    return a.id.localeCompare(b.id);
  });
  const ordById = new Map(ordered.map((row, idx) => [row.id, idx + 1]));
  const byOrd = new Map(ordered.map((row, idx) => [idx + 1, row]));

  const candidatesByOrd = ordered.map((_, idx) => idx + 1);

  let queue: Group[] = ordered.map((row) => ({
    tableIds: [row.id],
    path: [ordById.get(row.id)!],
    totalCapacity: row.capacity,
    sectionKey: row.sectionKey,
    sortLabels: [row.sortLabel],
  }));

  const winners: Group[] = [];
  for (const g of queue) {
    if (g.totalCapacity >= partySize) winners.push(g);
  }

  while (queue.length > 0) {
    const next: Group[] = [];
    for (const g of queue) {
      if (g.totalCapacity >= partySize) continue;
      if (g.tableIds.length >= COMBINE_MAX_GROUP) continue;
      const lastOrd = g.path[g.path.length - 1];
      for (const candOrd of candidatesByOrd) {
        if (candOrd <= lastOrd) continue;
        const cand = byOrd.get(candOrd)!;
        if (requireSection && cand.sectionKey !== g.sectionKey) continue;
        if (requireSection) {
          // Adjacency: at least one existing member within distance.
          let adjacent = false;
          for (const existingId of g.tableIds) {
            const existing = ordered.find((row) => row.id === existingId);
            if (!existing) continue;
            const dx = existing.x - cand.x;
            const dy = existing.y - cand.y;
            if (Math.sqrt(dx * dx + dy * dy) <= ADJACENCY_DISTANCE) {
              adjacent = true;
              break;
            }
          }
          if (!adjacent) continue;
        }
        const extended: Group = {
          tableIds: [...g.tableIds, cand.id],
          path: [...g.path, candOrd],
          totalCapacity: g.totalCapacity + cand.capacity,
          sectionKey: g.sectionKey,
          sortLabels: [...g.sortLabels, cand.sortLabel],
        };
        if (extended.totalCapacity >= partySize) {
          winners.push(extended);
        } else {
          next.push(extended);
        }
      }
    }
    queue = next;
  }

  if (winners.length === 0) return null;
  // SQL ordering: table_count ASC, total_capacity ASC, sort_labels ASC.
  winners.sort((a, b) => {
    if (a.tableIds.length !== b.tableIds.length) return a.tableIds.length - b.tableIds.length;
    if (a.totalCapacity !== b.totalCapacity) return a.totalCapacity - b.totalCapacity;
    const aLab = a.sortLabels.join(',');
    const bLab = b.sortLabels.join(',');
    return aLab.localeCompare(bLab);
  });
  return winners[0].tableIds;
}

/** Mirror of `find_available_table_group`: smallest single → section combo → any combo. */
function findAvailableTableGroup(
  candidates: TableRow[],
  unavailable: Set<string>,
  partySize: number,
): string[] {
  if (partySize < 1) return [];
  const single = pickSingleTable(candidates, unavailable, partySize);
  if (single) return single;
  const sectionCombo = pickCombo(candidates, unavailable, partySize, true);
  if (sectionCombo) return sectionCombo;
  const anyCombo = pickCombo(candidates, unavailable, partySize, false);
  return anyCombo ?? [];
}

/** Build the set of `table_id`s already busy during the given window. */
function blockedTableIds(
  reservations: ReservationRow[],
  reservationTables: ReservationTableRow[],
  windowStart: number,
  windowEnd: number,
  fallbackTurnMinutes: number,
): Set<string> {
  const blocked = new Set<string>();
  const overlappingReservationIds = new Set<string>();
  for (const r of reservations) {
    const start = new Date(r.reserved_at).getTime();
    const dur = (r.duration_minutes ?? fallbackTurnMinutes) * 60_000;
    const end = start + dur;
    if (start < windowEnd && end > windowStart) {
      overlappingReservationIds.add(r.id);
      if (r.table_id) blocked.add(r.table_id);
    }
  }
  for (const rt of reservationTables) {
    if (rt.released_at) continue;
    if (overlappingReservationIds.has(rt.reservation_id)) {
      blocked.add(rt.table_id);
    }
  }
  return blocked;
}

/**
 * Generate availability slots client-side.
 *
 * Returns the SAME shape as `publicBookingApi.getAvailability`. Currently
 * NOT wired into the customer booking flow — see the file header for the
 * correctness caveats (RLS visibility, table-allocator parity).
 */
export async function generateAvailabilitySlots(
  args: GenerateAvailabilitySlotsArgs,
): Promise<AvailabilityResponse> {
  const partySize = Math.max(1, Math.floor(args.partySize));
  const supabase = getSupabase();
  if (!supabase) return { slots: [], floorCapacity: null };

  const dateOnly = args.date.slice(0, 10);

  // 1. Restaurant: timezone, hours_json, settings_json (for turn-time override).
  const { data: restaurantRow } = await supabase
    .from('restaurants')
    .select('timezone, hours_json, settings_json')
    .eq('id', args.restaurantId)
    .maybeSingle();
  const restaurant = (restaurantRow ?? null) as RestaurantRow | null;
  const timezone = args.timezone ?? restaurant?.timezone ?? DEFAULT_TIMEZONE;
  const dow = localDayOfWeek(dateOnly, timezone);

  // 2. Owner-configured hours gate the day; if closed, no slots.
  const configuredWindow = getBookingMinutesWindowForDate(
    restaurant?.hours_json ?? undefined,
    dateOnly,
    dow,
  );
  // hours_json is the source of truth for "closed?" — when the json exists and
  // says no window for this date, the restaurant is closed.
  if (restaurant?.hours_json && !configuredWindow) {
    const floorCapacityForClosed = await readFloorCapacity(supabase, args.restaurantId);
    return { slots: [], floorCapacity: floorCapacityForClosed };
  }

  // 3. Active tables (RLS-friendly: `tables_select_public` permits is_active=true).
  const { data: tableRows } = await supabase
    .from('tables')
    .select(
      'id, capacity, table_number, label, section, section_id, position_x, position_y, min_party, is_active, status',
    )
    .eq('restaurant_id', args.restaurantId)
    .eq('is_active', true);
  const tablesAll: TableRow[] = (tableRows ?? []) as TableRow[];
  const tableCandidates = tablesAll.filter((t) => (t.status ?? 'empty') !== 'blocked');
  const floorCapacity =
    tablesAll.length > 0
      ? tablesAll.reduce((sum, t) => sum + Math.max(Number(t.capacity) || 0, 0), 0)
      : null;

  // Floor-capacity guard mirrors the RPC's restaurant_floor_capacity() check.
  const floorCapacityForGuard = tableCandidates.reduce(
    (sum, t) => sum + Math.max(Number(t.capacity) || 0, 0),
    0,
  );
  if (partySize > floorCapacityForGuard) {
    return { slots: [], floorCapacity };
  }

  // 4. Shifts: active, matching this dow.
  const { data: shiftRows } = await supabase
    .from('shifts')
    .select(
      'id, name, start_time, end_time, slot_duration_minutes, turn_time_minutes, max_covers, blackout_dates, advance_booking_days, days_of_week',
    )
    .eq('restaurant_id', args.restaurantId)
    .eq('is_active', true);
  const shiftsForDay = ((shiftRows ?? []) as ShiftRow[])
    .filter((s) => Array.isArray(s.days_of_week) && s.days_of_week.includes(dow))
    .sort((a, b) => a.id.localeCompare(b.id));

  if (shiftsForDay.length === 0) {
    return { slots: [], floorCapacity };
  }

  // 5. Reservations overlapping the local day (UTC bounds).
  const dayStartUtc = localToUTC(dateOnly, '00:00', timezone);
  const dayEndUtc = localToUTC(dateOnly, '23:59', timezone);
  const { data: reservationRows } = await supabase
    .from('reservations')
    .select('id, shift_id, reserved_at, party_size, status, duration_minutes, table_id')
    .eq('restaurant_id', args.restaurantId)
    .in('status', ['pending', 'confirmed', 'seated'])
    .gte('reserved_at', dayStartUtc)
    .lte('reserved_at', dayEndUtc);
  const reservations = (reservationRows ?? []) as ReservationRow[];

  let reservationTables: ReservationTableRow[] = [];
  if (reservations.length > 0) {
    const ids = reservations.map((r) => r.id);
    const { data: rtRows } = await supabase
      .from('reservation_tables')
      .select('reservation_id, table_id, released_at')
      .in('reservation_id', ids)
      .is('released_at', null);
    reservationTables = (rtRows ?? []) as ReservationTableRow[];
  }

  // 6. Slot generation per shift.
  const today = new Date();
  const todayYMD = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, '0')}-${String(
    today.getUTCDate(),
  ).padStart(2, '0')}`;
  const slots: AvailabilitySlot[] = [];

  for (const shift of shiftsForDay) {
    const advanceDays = shift.advance_booking_days ?? 30;
    const maxBookingDateMs = Date.parse(`${todayYMD}T00:00:00Z`) + advanceDays * 86_400_000;
    if (Date.parse(`${dateOnly}T00:00:00Z`) > maxBookingDateMs) continue;

    const blackouts: string[] = Array.isArray(shift.blackout_dates) ? shift.blackout_dates : [];
    if (blackouts.includes(dateOnly)) continue;

    const slotInc = shift.slot_duration_minutes ?? DEFAULT_SLOT_DURATION_MINUTES;
    const turnMins = resolveTurnMinutes(restaurant, shift);
    const maxCovers = shift.max_covers ?? null;

    let slotMin =
      parseTimeOfDayToMinutes(shift.start_time) ?? parseTimeOfDayToMinutes('17:00') ?? 17 * 60;
    let endMin =
      parseTimeOfDayToMinutes(shift.end_time) ?? parseTimeOfDayToMinutes('23:00') ?? 23 * 60;

    if (configuredWindow) {
      slotMin = Math.max(slotMin, configuredWindow.open);
      endMin = Math.min(endMin, configuredWindow.close);
    }
    if (endMin <= slotMin) continue;

    while (slotMin + turnMins <= endMin) {
      const hour = Math.floor(slotMin / 60);
      const minute = slotMin % 60;
      const timeStr = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const slotStartUtc = localToUTC(dateOnly, timeStr, timezone);
      const slotStartMs = Date.parse(slotStartUtc);
      const slotEndMs = slotStartMs + turnMins * 60_000;

      // Cover cap (only when max_covers is set).
      let coverOk = true;
      if (maxCovers != null) {
        let overlappingParty = 0;
        for (const r of reservations) {
          if (r.shift_id !== shift.id) continue;
          const rStart = Date.parse(r.reserved_at);
          const rEnd = rStart + (r.duration_minutes ?? turnMins) * 60_000;
          if (slotStartMs < rEnd && slotEndMs > rStart) {
            overlappingParty += r.party_size ?? 0;
          }
        }
        const total = partySize + overlappingParty;
        if (total > maxCovers) coverOk = false;
      }

      if (coverOk) {
        const unavailable = blockedTableIds(
          reservations,
          reservationTables,
          slotStartMs,
          slotEndMs,
          turnMins,
        );
        const tableIds = findAvailableTableGroup(tableCandidates, unavailable, partySize);
        if (tableIds.length > 0) {
          slots.push({
            shift_id: shift.id,
            shift_name: shift.name ?? 'Shift',
            date_time: new Date(slotStartMs).toISOString(),
            display_time: formatDisplayTime(slotStartUtc, timezone),
            table_ids: tableIds,
            duration_minutes: turnMins,
            floor_capacity: floorCapacity ?? undefined,
          });
          if (slots.length >= SLOT_HARD_CAP) break;
        }
      }

      slotMin += slotInc;
    }

    if (slots.length >= SLOT_HARD_CAP) break;
  }

  return { slots, floorCapacity };
}

async function readFloorCapacity(
  supabase: NonNullable<ReturnType<typeof getSupabase>>,
  restaurantId: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('tables')
    .select('capacity')
    .eq('restaurant_id', restaurantId)
    .eq('is_active', true);
  if (!data || data.length === 0) return null;
  return data.reduce(
    (sum, row) => sum + Math.max(Number((row as { capacity?: number }).capacity ?? 0) || 0, 0),
    0,
  );
}
