import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import {
  getAvailability,
  getFlexibleAvailability,
  type FlexibleAvailabilityMode,
} from "../_shared/availability.ts";

type AvailabilityBody = {
  restaurant_id?: unknown;
  party_size?: unknown;
  mode?: unknown;
  date?: unknown;
  time?: unknown;
  weekday?: unknown;
  timezone?: unknown;
  search_days?: unknown;
  nearest_count?: unknown;
  split_at?: unknown;
};

const MODES = new Set<FlexibleAvailabilityMode>([
  "exact",
  "any_day_at_time",
  "weekday_any_time",
  "date_any_time",
  "first_available",
]);

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatHoursWindowForCustomer(value: string | null | undefined): string | null {
  if (!value) return null;
  const parts = value.split(/\s+(?:to|-)\s+/i);
  if (parts.length !== 2) return value;
  const formatted = parts.map(formatClockForCustomer);
  return formatted[0] && formatted[1] ? `${formatted[0]} to ${formatted[1]}` : value;
}

function formatClockForCustomer(value: string): string | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  const period = match[3]?.toUpperCase();
  if (!Number.isFinite(hour) || !Number.isFinite(minute) || minute < 0 || minute > 59) return null;
  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "PM" && hour < 12) hour += 12;
    if (period === "AM" && hour === 12) hour = 0;
  } else if (hour < 0 || hour > 23) {
    return null;
  }
  const displayPeriod = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${String(minute).padStart(2, "0")} ${displayPeriod}`;
}

function normalizeResultHours<T extends object>(result: T): T {
  const record = result as Record<string, unknown>;
  const hoursWindow = formatHoursWindowForCustomer(record.hours_window as string | null | undefined);
  const selectedSlot = record.selected_slot;
  const selectedHours = selectedSlot && typeof selectedSlot === "object"
    ? formatHoursWindowForCustomer((selectedSlot as Record<string, unknown>).hours_window as string | null | undefined) ??
      hoursWindow
    : null;
  return {
    ...result,
    ...(hoursWindow ? { hours_window: hoursWindow } : {}),
    selected_slot: selectedSlot && typeof selectedSlot === "object"
      ? {
        ...(selectedSlot as Record<string, unknown>),
        ...(selectedHours ? { hours_window: selectedHours } : {}),
      }
      : selectedSlot,
    alternatives: Array.isArray(record.alternatives)
      ? record.alternatives.map((option) => {
        if (!option || typeof option !== "object") return option;
        const optionRecord = option as Record<string, unknown>;
        const optionHours = formatHoursWindowForCustomer(optionRecord.hours_window as string | null | undefined);
        return {
          ...optionRecord,
          ...(optionHours ? { hours_window: optionHours } : {}),
        };
      })
      : record.alternatives,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json() as AvailabilityBody;
    const restaurantId = stringOrNull(body.restaurant_id);
    const partySize = numberOrNull(body.party_size);
    const mode = stringOrNull(body.mode) as FlexibleAvailabilityMode | null;

    if (!restaurantId) return jsonRes({ error: "restaurant_id is required" }, 400);
    if (partySize == null || partySize < 1) {
      return jsonRes({ error: "party_size is required" }, 400);
    }
    if (!mode || !MODES.has(mode)) {
      return jsonRes({ error: "valid mode is required" }, 400);
    }

    const result = await getFlexibleAvailability({
      restaurant_id: restaurantId,
      party_size: partySize,
      mode,
      date: stringOrNull(body.date),
      time: stringOrNull(body.time),
      weekday: numberOrNull(body.weekday),
      timezone: stringOrNull(body.timezone),
      search_days: numberOrNull(body.search_days) ?? undefined,
      nearest_count: numberOrNull(body.nearest_count) ?? undefined,
      split_at: stringOrNull(body.split_at) ?? undefined,
    });

    const requestedDate = stringOrNull(body.date);
    if (requestedDate && !result.hours_window) {
      const daily = await getAvailability(restaurantId, requestedDate, partySize);
      const hoursWindow = daily.hours_window ?? null;
      return jsonRes(normalizeResultHours({
        ...result,
        hours_window: hoursWindow,
        message: result.message ?? daily.message,
        selected_slot: result.selected_slot
          ? { ...result.selected_slot, hours_window: result.selected_slot.hours_window ?? hoursWindow }
          : result.selected_slot,
        alternatives: (result.alternatives ?? []).map((option) => ({
          ...option,
          hours_window: option.hours_window ?? (option.date === requestedDate ? hoursWindow : null),
        })),
      }));
    }

    return jsonRes(normalizeResultHours(result));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("cenaiva-availability error:", message);
    return jsonRes({ error: message || "availability_failed" }, 500);
  }
});
