/**
 * Tonight briefing — owner-side aggregations computed on-device from
 * `reservations` + `restaurant_analytics` + `tables` rows.
 *
 * The shape mirrors `lib/mock/ownerApp.ts#TONIGHT_BRIEFING` and
 * `TONIGHT_GUESTS` so `app/(staff)/schedule.tsx` can render real or mock
 * data through the same components.
 *
 * Demo mode falls through this module entirely — `schedule.tsx` only calls
 * fetch* when real data is expected.
 */

import { getSupabase } from '@/lib/supabase/client';

// ── Public shape ─────────────────────────────────────────────────────────────

export type TonightStatus = 'quiet' | 'normal' | 'busy';

export type TonightBriefing = {
  status: TonightStatus;
  statusLabel: string;
  headline: string;
  /** Signed percent deviation vs the rolling 14-day average. Negative = below avg. */
  vsTypical: number;
  /** Total covers tonight (sum of party_size across non-cancelled reservations). */
  covers: number;
  /** Reservation row count tonight (excluding cancelled / no_show). */
  bookings: number;
  /** Busiest hour label, e.g. "7p–8p". */
  busiestWindow: string;
  /** Covers inside the busiest hour. */
  busiestCovers: number;
  /** Booked seats / total capacity, expressed 0–100. */
  bookedPct: number;
  /** Door open time label, e.g. "5:00 PM". */
  doorsOpen: string;
  /** First reservation time, e.g. "5:30p". */
  firstResTime: string;
  /** Party size of the first reservation. */
  firstResParty: number;
  /** Minutes from door open until first reservation ("runway"). */
  runwayMin: number;
  /** Total seats across active tables for the restaurant. */
  totalCapacity: number;
  /** Booked seats tonight (== covers). */
  bookedSeats: number;
  /** Open seats remaining (capacity − booked). */
  openSeats: number;
};

export type TonightBadge = 'vip' | 'large-party' | 'first-visit' | 'allergy';

export type TonightGuest = {
  id: string;
  name: string;
  /** Reservation time formatted as e.g. "7:00p". */
  time: string;
  partySize: number;
  badge: TonightBadge;
  note?: string;
  avatarColor: string;
};

// ── Caches ──────────────────────────────────────────────────────────────────

const restaurantTimezoneCache = new Map<string, string | null>();

async function getRestaurantTimezone(restaurantId: string): Promise<string | null> {
  if (restaurantTimezoneCache.has(restaurantId)) {
    return restaurantTimezoneCache.get(restaurantId) ?? null;
  }
  const supabase = getSupabase();
  if (!supabase) return null;
  try {
    const { data } = await supabase
      .from('restaurants')
      .select('timezone')
      .eq('id', restaurantId)
      .maybeSingle();
    const tz = (data as { timezone?: string | null } | null)?.timezone ?? null;
    restaurantTimezoneCache.set(restaurantId, tz);
    return tz;
  } catch {
    return null;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const LARGE_PARTY_THRESHOLD = 5;

/** Returns ISO bounds [startUtc, endUtc] for "today" in the restaurant timezone. */
function todayBoundsInTimezone(tz: string | null): { startIso: string; endIso: string } {
  // We approximate the local "today" by reading the local-tz calendar date from
  // the current UTC instant. Round-trip through Intl.DateTimeFormat to extract
  // y/m/d in the target tz, then build a local-midnight Date which we serialize.
  const now = new Date();
  let year: number;
  let month: number;
  let day: number;
  if (tz) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: tz,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(now);
      year = Number(parts.find((p) => p.type === 'year')?.value ?? '0');
      month = Number(parts.find((p) => p.type === 'month')?.value ?? '0');
      day = Number(parts.find((p) => p.type === 'day')?.value ?? '0');
    } catch {
      year = now.getFullYear();
      month = now.getMonth() + 1;
      day = now.getDate();
    }
  } else {
    year = now.getFullYear();
    month = now.getMonth() + 1;
    day = now.getDate();
  }

  // Without a robust tz library we accept a small (≤ ~1h) drift around the
  // boundary on DST days. The query is widened by an hour on each side below
  // to avoid clipping the local-midnight rows.
  const startLocal = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const endLocal = new Date(Date.UTC(year, month - 1, day, 23, 59, 59));
  // Widen by ±2 hours to absorb tz offset; we then filter the rows back to
  // the canonical local date below.
  startLocal.setUTCHours(startLocal.getUTCHours() - 14);
  endLocal.setUTCHours(endLocal.getUTCHours() + 14);
  return { startIso: startLocal.toISOString(), endIso: endLocal.toISOString() };
}

/** Returns the local-tz YYYY-MM-DD string for an ISO timestamp. */
function localDateKey(iso: string, tz: string | null): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz ?? undefined,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(new Date(iso));
    const y = parts.find((p) => p.type === 'year')?.value ?? '';
    const m = parts.find((p) => p.type === 'month')?.value ?? '';
    const d = parts.find((p) => p.type === 'day')?.value ?? '';
    return `${y}-${m}-${d}`;
  } catch {
    return iso.slice(0, 10);
  }
}

/** Returns the local-tz hour (0–23) for an ISO timestamp. */
function localHour(iso: string, tz: string | null): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz ?? undefined,
      hour: '2-digit',
      hour12: false,
    });
    const value = formatter.format(new Date(iso));
    const hh = Number.parseInt(value, 10);
    return Number.isFinite(hh) ? hh % 24 : new Date(iso).getHours();
  } catch {
    return new Date(iso).getHours();
  }
}

function formatHourShort(hour: number): string {
  const norm = ((hour % 24) + 24) % 24;
  const am = norm < 12;
  const display = norm % 12 === 0 ? 12 : norm % 12;
  return `${display}${am ? 'a' : 'p'}`;
}

function formatHourLong(hour: number, minute: number): string {
  const norm = ((hour % 24) + 24) % 24;
  const ampm = norm >= 12 ? 'PM' : 'AM';
  const display = norm % 12 === 0 ? 12 : norm % 12;
  return `${display}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function formatTimeShort(iso: string, tz: string | null): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz ?? undefined,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
    // "5:30 PM" → "5:30p"
    const formatted = formatter.format(new Date(iso));
    return formatted
      .replace(/\s?AM$/i, 'a')
      .replace(/\s?PM$/i, 'p');
  } catch {
    return '';
  }
}

function statusFromCovers(covers: number, baseline: number | null): {
  status: TonightStatus;
  vsTypical: number;
} {
  if (baseline && baseline > 0) {
    const pct = Math.round(((covers - baseline) / baseline) * 100);
    let status: TonightStatus = 'normal';
    if (pct <= -20) status = 'quiet';
    else if (pct >= 20) status = 'busy';
    return { status, vsTypical: pct };
  }
  // Fallback thresholds when no analytics rows exist.
  let status: TonightStatus = 'normal';
  if (covers <= 20) status = 'quiet';
  else if (covers >= 60) status = 'busy';
  return { status, vsTypical: 0 };
}

function statusLabel(status: TonightStatus): string {
  if (status === 'quiet') return 'QUIET';
  if (status === 'busy') return 'BUSY';
  return 'STEADY';
}

function headlineFor(status: TonightStatus): string {
  if (status === 'quiet') return 'Quiet night tonight.';
  if (status === 'busy') return 'Busy night ahead.';
  return 'Steady night tonight.';
}

const COUNTED_STATUSES = new Set(['pending', 'confirmed', 'seated', 'completed']);
function isCountedStatus(status: string | null): boolean {
  return status ? COUNTED_STATUSES.has(status) : true;
}

// Avatar colors keyed by badge — mirrors the gold/blue accents the
// existing demo `TONIGHT_GUESTS` rows use.
const AVATAR_VIP = '#7A5F1E';
const AVATAR_OTHER = '#2A4A8A';

function badgeFor(row: {
  isVip: boolean;
  partySize: number;
  totalVisits: number;
  hasAllergy: boolean;
}): TonightBadge {
  if (row.isVip) return 'vip';
  if (row.hasAllergy) return 'allergy';
  if (row.partySize >= LARGE_PARTY_THRESHOLD) return 'large-party';
  if (row.totalVisits <= 0) return 'first-visit';
  return 'first-visit';
}

// ── Briefing fetch ──────────────────────────────────────────────────────────

type ReservationRow = {
  id: string;
  reserved_at: string;
  party_size: number | null;
  status: string | null;
};

type AnalyticsRow = {
  date: string;
  total_covers: number | null;
};

export async function fetchTonightBriefing(
  restaurantId: string,
): Promise<TonightBriefing | null> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return null;

  try {
    const tz = await getRestaurantTimezone(restaurantId);
    const { startIso, endIso } = todayBoundsInTimezone(tz);

    // Pull reservations within today's broadened UTC window, then refine to
    // the canonical local-tz date.
    const { data: resData } = await supabase
      .from('reservations')
      .select('id,reserved_at,party_size,status')
      .eq('restaurant_id', restaurantId)
      .gte('reserved_at', startIso)
      .lte('reserved_at', endIso);

    const todayKey = localDateKey(new Date().toISOString(), tz);
    const rows = ((resData ?? []) as ReservationRow[]).filter(
      (row) =>
        row.reserved_at &&
        isCountedStatus(row.status) &&
        localDateKey(row.reserved_at, tz) === todayKey,
    );

    const covers = rows.reduce((sum, row) => sum + (row.party_size ?? 0), 0);
    const bookings = rows.length;

    // Per-hour aggregation for busiest window + runway.
    const hourCovers = new Map<number, number>();
    rows.forEach((row) => {
      const hour = localHour(row.reserved_at, tz);
      hourCovers.set(hour, (hourCovers.get(hour) ?? 0) + (row.party_size ?? 0));
    });
    let busiestHour = -1;
    let busiestCovers = 0;
    hourCovers.forEach((value, hour) => {
      if (value > busiestCovers) {
        busiestCovers = value;
        busiestHour = hour;
      }
    });
    const busiestWindow =
      busiestHour >= 0
        ? `${formatHourShort(busiestHour)}–${formatHourShort(busiestHour + 1)}`
        : '—';

    // First reservation = earliest reserved_at.
    const sorted = [...rows].sort((a, b) =>
      a.reserved_at.localeCompare(b.reserved_at),
    );
    const first = sorted[0];
    const firstResTime = first ? formatTimeShort(first.reserved_at, tz) : '—';
    const firstResParty = first?.party_size ?? 0;

    // Total capacity from active tables.
    const { data: tableData } = await supabase
      .from('tables')
      .select('capacity,is_active')
      .eq('restaurant_id', restaurantId)
      .eq('is_active', true);
    const totalCapacity = ((tableData ?? []) as Array<{ capacity: number | null }>).reduce(
      (sum, row) => sum + (row.capacity ?? 0),
      0,
    );
    const bookedSeats = covers;
    const openSeats = Math.max(0, totalCapacity - bookedSeats);
    const bookedPct =
      totalCapacity > 0
        ? Math.min(100, Math.round((bookedSeats / totalCapacity) * 100))
        : 0;

    // Doors open + runway. We treat the earliest reservation hour as service
    // start when an explicit "doors open" isn't tracked.
    let doorsOpenHour = 17; // 5pm fallback
    if (first) {
      doorsOpenHour = localHour(first.reserved_at, tz);
    }
    const doorsOpen = formatHourLong(doorsOpenHour, 0);
    let runwayMin = 0;
    if (first) {
      const firstDate = new Date(first.reserved_at);
      const localMinutes =
        Number(
          new Intl.DateTimeFormat('en-US', {
            timeZone: tz ?? undefined,
            minute: '2-digit',
          }).format(firstDate),
        ) || 0;
      runwayMin = localMinutes; // minutes past the hour from doorsOpen=hour:00
    }

    // 14-day rolling avg from restaurant_analytics.
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const fourteenAgo = new Date(yesterday);
    fourteenAgo.setDate(yesterday.getDate() - 13);
    const fromIso = fourteenAgo.toISOString().slice(0, 10);
    const toIso = yesterday.toISOString().slice(0, 10);

    let baseline: number | null = null;
    try {
      const { data: analyticsData } = await supabase
        .from('restaurant_analytics')
        .select('date,total_covers')
        .eq('restaurant_id', restaurantId)
        .gte('date', fromIso)
        .lte('date', toIso);
      const analytics = (analyticsData ?? []) as AnalyticsRow[];
      if (analytics.length > 0) {
        const total = analytics.reduce((s, r) => s + (r.total_covers ?? 0), 0);
        baseline = total / analytics.length;
      }
    } catch {
      baseline = null;
    }

    const { status, vsTypical } = statusFromCovers(covers, baseline);

    return {
      status,
      statusLabel: statusLabel(status),
      headline: headlineFor(status),
      vsTypical,
      covers,
      bookings,
      busiestWindow,
      busiestCovers,
      bookedPct,
      doorsOpen,
      firstResTime,
      firstResParty,
      runwayMin,
      totalCapacity,
      bookedSeats,
      openSeats,
    };
  } catch {
    return null;
  }
}

// ── Guests fetch ────────────────────────────────────────────────────────────

type GuestJoin = {
  id?: string;
  full_name?: string | null;
  is_vip?: boolean | null;
  total_visits?: number | null;
  allergies?: string[] | string | null;
};

type ReservationGuestRow = {
  id: string;
  reserved_at: string;
  party_size: number | null;
  status: string | null;
  guest_full_name: string | null;
  special_request: string | null;
  guests: GuestJoin | GuestJoin[] | null;
};

function hasAllergyData(value: GuestJoin['allergies']): boolean {
  if (!value) return false;
  if (Array.isArray(value)) return value.some((v) => typeof v === 'string' && v.trim().length > 0);
  if (typeof value === 'string') return value.trim().length > 0;
  return false;
}

export async function fetchTonightGuests(
  restaurantId: string,
): Promise<TonightGuest[]> {
  const supabase = getSupabase();
  if (!supabase || !restaurantId) return [];

  try {
    const tz = await getRestaurantTimezone(restaurantId);
    const { startIso, endIso } = todayBoundsInTimezone(tz);

    const { data } = await supabase
      .from('reservations')
      .select(
        'id,reserved_at,party_size,status,guest_full_name,special_request,guests:guests(id,full_name,is_vip,total_visits,allergies)',
      )
      .eq('restaurant_id', restaurantId)
      .gte('reserved_at', startIso)
      .lte('reserved_at', endIso)
      .order('reserved_at', { ascending: true });

    const todayKey = localDateKey(new Date().toISOString(), tz);
    const rows = ((data ?? []) as ReservationGuestRow[]).filter(
      (row) =>
        row.reserved_at &&
        isCountedStatus(row.status) &&
        localDateKey(row.reserved_at, tz) === todayKey,
    );

    const guests: TonightGuest[] = [];
    rows.forEach((row) => {
      const guestObj: GuestJoin | null = Array.isArray(row.guests)
        ? row.guests[0] ?? null
        : row.guests ?? null;
      const name =
        (guestObj?.full_name && String(guestObj.full_name).trim()) ||
        (row.guest_full_name && row.guest_full_name.trim()) ||
        'Guest';
      const partySize = row.party_size ?? 0;
      const isVip = Boolean(guestObj?.is_vip);
      const totalVisits = guestObj?.total_visits ?? 0;
      const hasAllergy =
        hasAllergyData(guestObj?.allergies) ||
        Boolean(row.special_request && row.special_request.trim());

      // Only surface guests "worth knowing": VIPs, large parties, first-visits,
      // or guests with allergies. Filters down to the screen-level briefing.
      const isLargeParty = partySize >= LARGE_PARTY_THRESHOLD;
      const isFirstVisit = totalVisits <= 0;
      if (!isVip && !isLargeParty && !isFirstVisit && !hasAllergy) return;

      const badge = badgeFor({
        isVip,
        partySize,
        totalVisits,
        hasAllergy,
      });
      const avatarColor = badge === 'vip' ? AVATAR_VIP : AVATAR_OTHER;

      guests.push({
        id: row.id,
        name,
        time: formatTimeShort(row.reserved_at, tz),
        partySize,
        badge,
        note: row.special_request?.trim() || undefined,
        avatarColor,
      });
    });

    return guests;
  } catch {
    return [];
  }
}
