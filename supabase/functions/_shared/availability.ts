import { supabaseAdmin } from "./supabase.ts";
import { localToUTC, localDayOfWeek } from "./time.ts";
import { resolveRestaurantHoursForDate } from "./hours.ts";

export interface AvailabilitySlot {
  shift_id: string;
  shift_name: string;
  date_time: string;   // UTC ISO — pass directly to complete_booking
  display_time: string; // Local time shown to user
}

export interface AvailabilityResult {
  slots: AvailabilitySlot[];
  /** Human-readable opening window ("5:00 PM to 10:00 PM") the assistant
   *  should speak INSTEAD of enumerating individual slots. Computed from
   *  the earliest and latest bookable slot across all matching shifts. */
  hours_window?: string | null;
  message?: string;
}

export type FlexibleAvailabilityMode =
  | "exact"
  | "any_day_at_time"
  | "weekday_any_time"
  | "date_any_time"
  | "first_available";

export interface FlexibleAvailabilityRequest {
  restaurant_id: string;
  party_size: number;
  mode: FlexibleAvailabilityMode;
  date?: string | null;
  time?: string | null;
  weekday?: number | null;
  timezone?: string | null;
  search_days?: number;
  nearest_count?: number;
  split_at?: string;
}

export interface FlexibleAvailabilityOption extends AvailabilitySlot {
  date: string;
  diff_minutes?: number;
}

export interface FlexibleAvailabilityResult {
  status: "available" | "unavailable" | "options" | "needs_more_info";
  requested?: {
    date?: string | null;
    time?: string | null;
    weekday?: number | null;
  };
  selected_slot?: FlexibleAvailabilityOption | null;
  alternatives?: FlexibleAvailabilityOption[];
  message?: string;
}

export async function getAvailability(
  restaurant_id: string,
  date: string, // YYYY-MM-DD
  party_size: number,
): Promise<AvailabilityResult> {
  const dateOnly = date.slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);

  // Fetch restaurant timezone + owner-configured hours. `hours_json` is the
  // source of truth for what the customer sees as "store hours" (set in the
  // Settings page). Shape: { monday: { open, close } | null, ..., special: [] }
  // in 12-hour strings ("11:00 AM", "10:00 PM").
  const { data: restaurantRow } = await supabaseAdmin
    .from("restaurants")
    .select("timezone, hours_json")
    .eq("id", restaurant_id)
    .single();
  const timezone = restaurantRow?.timezone || "UTC";

  const dayOfWeek = localDayOfWeek(dateOnly, timezone);
  const hoursJson =
    restaurantRow?.hours_json && typeof restaurantRow.hours_json === "object"
      ? (restaurantRow.hours_json as Record<string, unknown>)
      : null;

  // Owner-configured hours are the source of truth. If a weekly day or
  // date-specific special is marked closed, no shifts may create slots.
  const configuredHours = resolveRestaurantHoursForDate(hoursJson, dateOnly, dayOfWeek);
  if (configuredHours.closed) {
    return {
      slots: [],
      hours_window: null,
      message: "Restaurant is closed on that date.",
    };
  }

  // Fetch matching shifts — also select blackout_dates and advance_booking_days
  const { data: shifts } = await supabaseAdmin
    .from("shifts")
    .select(
      "id, name, start_time, end_time, slot_duration_minutes, turn_time_minutes, min_party_size, max_party_size, max_covers, blackout_dates, advance_booking_days",
    )
    .eq("restaurant_id", restaurant_id)
    .eq("is_active", true)
    .contains("days_of_week", [dayOfWeek]);

  if (!shifts?.length) {
    return { slots: [], message: "No availability on that date." };
  }

  // Query reservations using UTC bounds for the restaurant's local day
  const dayStartUTC = localToUTC(dateOnly, "00:00", timezone);
  const dayEndUTC = localToUTC(dateOnly, "23:59", timezone);

  const { data: reservations } = await supabaseAdmin
    .from("reservations")
    .select("shift_id, reserved_at, party_size")
    .eq("restaurant_id", restaurant_id)
    .in("status", ["pending", "confirmed", "seated"])
    .gte("reserved_at", dayStartUTC)
    .lte("reserved_at", dayEndUTC);

  const slots: AvailabilitySlot[] = [];
  const todayDate = new Date(today);
  const requestDate = new Date(dateOnly);

  for (const shift of shifts) {
    // Enforce party size bounds
    if (party_size < (shift.min_party_size ?? 1) || party_size > (shift.max_party_size ?? 20)) {
      continue;
    }

    // Enforce advance_booking_days — don't show if booking window hasn't opened
    const advanceDays = shift.advance_booking_days ?? 30;
    const maxBookingDate = new Date(todayDate.getTime() + advanceDays * 86_400_000);
    if (requestDate > maxBookingDate) continue;

    // Enforce blackout_dates
    const blackouts: string[] = shift.blackout_dates ?? [];
    if (blackouts.includes(dateOnly)) continue;

    const [sH, sM] = (shift.start_time ?? "17:00").split(":").map(Number);
    const [eH, eM] = (shift.end_time ?? "23:00").split(":").map(Number);
    const slotMins = shift.slot_duration_minutes ?? 30;
    const turnMins = shift.turn_time_minutes ?? 90;
    const maxCovers = shift.max_covers ?? 100;

    let slotMin = sH * 60 + sM;
    const endMin = eH * 60 + eM;

    while (slotMin + slotMins <= endMin) {
      if (
        configuredHours.window &&
        (slotMin < configuredHours.window.open || slotMin + slotMins > configuredHours.window.close)
      ) {
        slotMin += slotMins;
        continue;
      }

      const slotHour = Math.floor(slotMin / 60);
      const slotMinute = slotMin % 60;
      const timeStr = `${String(slotHour).padStart(2, "0")}:${String(slotMinute).padStart(2, "0")}`;

      const slotDateTimeUTC = localToUTC(dateOnly, timeStr, timezone);
      const slotStart = new Date(slotDateTimeUTC);
      const slotEnd = new Date(slotStart.getTime() + turnMins * 60_000);

      const shiftResvs = (reservations ?? []).filter((r: any) => r.shift_id === shift.id);
      let totalCovers = party_size;
      let available = true;

      for (const r of shiftResvs) {
        const resvStart = new Date(r.reserved_at);
        const resvEnd = new Date(resvStart.getTime() + turnMins * 60_000);
        if (slotStart < resvEnd && slotEnd > resvStart) {
          totalCovers += r.party_size ?? 0;
          if (totalCovers > maxCovers) {
            available = false;
            break;
          }
        }
      }

      // Never surface slots that start in the past for same-day booking.
      if (available && slotStart.getTime() >= Date.now()) {
        slots.push({
          shift_id: shift.id,
          shift_name: shift.name ?? "Shift",
          date_time: slotStart.toISOString(),
          display_time: slotStart.toLocaleTimeString("en-US", {
            timeZone: timezone,
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          }),
        });
      }

      slotMin += slotMins;
    }
  }

  const limited = slots.slice(0, 15);
  // Prefer the owner-configured hours. Fall back to the slot-derived window
  // only when hours_json is missing or the day is marked closed (otherwise
  // the assistant would read a misleading narrow range like "12 PM to 8:30
  // PM" that just reflects the shift configuration, not real store hours).
  const hours_window =
    configuredHours.window?.label ??
    (limited.length
      ? `${limited[0].display_time} to ${limited[limited.length - 1].display_time}`
      : null);
  return { slots: limited, hours_window };
}

function formatISODateInTimeZone(date: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function addDaysToISODate(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function dateOffsetMinutes(anchorDate: string, candidateDate: string): number {
  const [ay, am, ad] = anchorDate.split("-").map(Number);
  const [cy, cm, cd] = candidateDate.split("-").map(Number);
  const anchor = Date.UTC(ay, am - 1, ad);
  const candidate = Date.UTC(cy, cm - 1, cd);
  return Math.round((candidate - anchor) / 60_000);
}

function displayTimeToMinutes(display: string): number | null {
  const m = display.match(/^(\d{1,2}):(\d{2})\s+(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const period = m[3].toUpperCase();
  if (period === "PM" && h < 12) h += 12;
  if (period === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function hhmmToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function uniqueOptions(options: FlexibleAvailabilityOption[]): FlexibleAvailabilityOption[] {
  const seen = new Set<string>();
  const out: FlexibleAvailabilityOption[] = [];
  for (const option of options) {
    const key = `${option.date}:${option.date_time}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(option);
  }
  return out;
}

async function getRestaurantTimezone(restaurantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("timezone")
    .eq("id", restaurantId)
    .single();
  return data?.timezone || "UTC";
}

async function getOptionsForDates(
  restaurantId: string,
  dates: string[],
  partySize: number,
): Promise<FlexibleAvailabilityOption[]> {
  const results = await Promise.all(
    dates.map(async (date) => {
      const availability = await getAvailability(restaurantId, date, partySize);
      return (availability.slots ?? []).map((slot) => ({ ...slot, date }));
    }),
  );
  return results.flat();
}

function datesFromToday(today: string, searchDays: number): string[] {
  return Array.from({ length: searchDays }, (_, index) => addDaysToISODate(today, index));
}

function nextWeekdayDates(today: string, weekday: number, searchDays: number, timezone: string): string[] {
  const dates: string[] = [];
  for (let i = 0; i < searchDays; i += 1) {
    const date = addDaysToISODate(today, i);
    if (localDayOfWeek(date, timezone) === weekday) dates.push(date);
  }
  return dates;
}

function rankByAbsoluteDateTime(
  anchorDate: string,
  targetMinutes: number,
  options: FlexibleAvailabilityOption[],
): FlexibleAvailabilityOption[] {
  return uniqueOptions(options)
    .map((option) => {
      const slotMinutes = displayTimeToMinutes(option.display_time);
      const diff = slotMinutes == null
        ? Number.POSITIVE_INFINITY
        : Math.abs(dateOffsetMinutes(anchorDate, option.date) + slotMinutes - targetMinutes);
      return { ...option, diff_minutes: diff };
    })
    .sort((a, b) =>
      (a.diff_minutes ?? Number.POSITIVE_INFINITY) - (b.diff_minutes ?? Number.POSITIVE_INFINITY) ||
      a.date.localeCompare(b.date) ||
      a.display_time.localeCompare(b.display_time)
    );
}

function rankByTimeThenDate(
  anchorDate: string,
  targetMinutes: number,
  options: FlexibleAvailabilityOption[],
): FlexibleAvailabilityOption[] {
  return uniqueOptions(options)
    .map((option) => {
      const slotMinutes = displayTimeToMinutes(option.display_time);
      const timeDiff = slotMinutes == null ? Number.POSITIVE_INFINITY : Math.abs(slotMinutes - targetMinutes);
      const dayDiff = Math.abs(dateOffsetMinutes(anchorDate, option.date) / 1440);
      return { ...option, diff_minutes: timeDiff * 10_000 + dayDiff };
    })
    .sort((a, b) =>
      (a.diff_minutes ?? Number.POSITIVE_INFINITY) - (b.diff_minutes ?? Number.POSITIVE_INFINITY) ||
      a.date.localeCompare(b.date)
    );
}

function optionsAroundSplit(
  options: FlexibleAvailabilityOption[],
  splitMinutes: number,
): FlexibleAvailabilityOption[] {
  const withMinutes = uniqueOptions(options)
    .map((option) => ({ option, minutes: displayTimeToMinutes(option.display_time) }))
    .filter((item): item is { option: FlexibleAvailabilityOption; minutes: number } => item.minutes != null)
    .sort((a, b) => a.option.date.localeCompare(b.option.date) || a.minutes - b.minutes);

  const before = [...withMinutes]
    .filter((item) => item.minutes < splitMinutes)
    .sort((a, b) => b.minutes - a.minutes)[0]?.option ?? null;
  const after = withMinutes
    .filter((item) => item.minutes > splitMinutes)
    .sort((a, b) => a.minutes - b.minutes)[0]?.option ?? null;

  const picked = [before, after].filter((option): option is FlexibleAvailabilityOption => Boolean(option));
  if (picked.length >= 2) return picked;
  return uniqueOptions([
    ...picked,
    ...withMinutes
      .map((item) => ({
        ...item.option,
        diff_minutes: Math.abs(item.minutes - splitMinutes),
      }))
      .sort((a, b) => (a.diff_minutes ?? 0) - (b.diff_minutes ?? 0)),
  ]).slice(0, 2);
}

export async function getFlexibleAvailability(
  request: FlexibleAvailabilityRequest,
): Promise<FlexibleAvailabilityResult> {
  const timezone = request.timezone || await getRestaurantTimezone(request.restaurant_id);
  const today = formatISODateInTimeZone(new Date(), timezone);
  const nearestCount = Math.max(1, Math.min(request.nearest_count ?? 2, 4));
  const searchDays = Math.max(1, Math.min(request.search_days ?? 14, 28));
  const requested = {
    date: request.date ?? null,
    time: request.time ?? null,
    weekday: request.weekday ?? null,
  };

  if (request.party_size == null || request.party_size < 1) {
    return { status: "needs_more_info", requested, message: "Party size is required." };
  }

  if (request.mode === "exact") {
    const targetMinutes = hhmmToMinutes(request.time);
    if (!request.date || targetMinutes == null) {
      return { status: "needs_more_info", requested, message: "Date and time are required." };
    }
    const dates = datesFromToday(request.date, searchDays);
    const options = await getOptionsForDates(request.restaurant_id, dates, request.party_size);
    const exact = options.find((option) =>
      option.date === request.date && displayTimeToMinutes(option.display_time) === targetMinutes
    );
    if (exact) {
      return { status: "available", requested, selected_slot: exact, alternatives: [] };
    }
    return {
      status: "unavailable",
      requested,
      selected_slot: null,
      alternatives: rankByAbsoluteDateTime(request.date, targetMinutes, options).slice(0, nearestCount),
    };
  }

  if (request.mode === "any_day_at_time") {
    const targetMinutes = hhmmToMinutes(request.time);
    if (targetMinutes == null) {
      return { status: "needs_more_info", requested, message: "Time is required." };
    }
    const dates = datesFromToday(today, searchDays);
    const options = await getOptionsForDates(request.restaurant_id, dates, request.party_size);
    const ranked = rankByTimeThenDate(today, targetMinutes, options);
    const exact = ranked.find((option) => displayTimeToMinutes(option.display_time) === targetMinutes);
    if (exact) {
      return { status: "available", requested, selected_slot: exact, alternatives: [] };
    }
    return {
      status: "options",
      requested,
      alternatives: ranked.slice(0, nearestCount),
    };
  }

  if (request.mode === "weekday_any_time") {
    if (request.weekday == null) {
      return { status: "needs_more_info", requested, message: "Weekday is required." };
    }
    const dates = nextWeekdayDates(today, request.weekday, searchDays, timezone);
    const options = await getOptionsForDates(request.restaurant_id, dates, request.party_size);
    const split = hhmmToMinutes(request.split_at) ?? 14 * 60 + 30;
    return {
      status: "options",
      requested,
      alternatives: optionsAroundSplit(options, split).slice(0, nearestCount),
    };
  }

  if (request.mode === "date_any_time") {
    if (!request.date) {
      return { status: "needs_more_info", requested, message: "Date is required." };
    }
    const options = await getOptionsForDates(request.restaurant_id, [request.date], request.party_size);
    const split = hhmmToMinutes(request.split_at) ?? 14 * 60 + 30;
    return {
      status: "options",
      requested,
      alternatives: optionsAroundSplit(options, split).slice(0, nearestCount),
    };
  }

  const options = await getOptionsForDates(
    request.restaurant_id,
    datesFromToday(today, searchDays),
    request.party_size,
  );
  return {
    status: "options",
    requested,
    alternatives: uniqueOptions(options)
      .sort((a, b) => a.date.localeCompare(b.date) || a.display_time.localeCompare(b.display_time))
      .slice(0, nearestCount),
  };
}
