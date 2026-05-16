// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { getAvailability } from "../_shared/availability.ts";
import { localBookingParts } from "../_shared/hours.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { DEFAULT_TURN_MINUTES, DEFAULT_TIMEZONE } from "../_shared/booking-defaults.ts";
import {
  validationResponse,
  asText as validatedText,
  asIsoDate,
  asInteger,
} from "../_shared/input-validation.ts";

type PublicAvailabilitySlot = {
  shift_id: string;
  shift_name: string;
  date_time: string;
  display_time: string;
  table_ids?: string[];
  duration_minutes?: number;
  floor_capacity?: number;
};

function numberParam(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

async function getRestaurantTimezone(restaurantId: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("restaurants")
    .select("timezone")
    .eq("id", restaurantId)
    .single();
  return data?.timezone || DEFAULT_TIMEZONE;
}

async function getFloorCapacity(restaurantId: string): Promise<number | null> {
  const { data, error } = await supabaseAdmin
    .from("tables")
    .select("capacity")
    .eq("restaurant_id", restaurantId)
    .eq("is_active", true);
  if (error || !data?.length) return null;
  return data.reduce((sum, row) => sum + (Number(row.capacity) || 0), 0);
}

type CapacityTable = { id: string; capacity: number };
type LiveReservation = { table_id: string; reserved_at: string };

// Picks the smallest table that fits the party and isn't blocked by any
// reservation overlapping [dateTime, dateTime + durationMinutes). Operates
// on pre-fetched arrays so the caller only hits Postgres twice per request
// (instead of 2×N — see the loop in the handler below).
function pickAvailableTableId(
  tables: CapacityTable[],
  reservations: LiveReservation[],
  partySize: number,
  dateTime: string,
  durationMinutes: number,
): string | null {
  const start = new Date(dateTime).getTime();
  const end = start + durationMinutes * 60_000;

  const blocked = new Set<string>();
  for (const reservation of reservations) {
    if (!reservation.table_id || !reservation.reserved_at) continue;
    const reservationStart = new Date(reservation.reserved_at).getTime();
    const reservationEnd = reservationStart + durationMinutes * 60_000;
    if (start < reservationEnd && end > reservationStart) {
      blocked.add(reservation.table_id);
    }
  }

  // tables already sorted by capacity ascending — picks smallest fitting.
  for (const table of tables) {
    if (table.capacity < partySize) continue;
    if (!blocked.has(table.id)) return table.id;
  }
  return null;
}

// Module-scope in-memory cache. Supabase keeps each function instance warm
// for several minutes between invocations, so this cache survives across
// calls served by the same worker. Auto-scaling spins up new instances at
// load, each with its own empty cache — that's still a big win because
// each instance amortizes its own hot keys.
const CACHE_TTL_MS = 30_000;
type CachedResponse = { value: unknown; expiresAt: number };
const responseCache = new Map<string, CachedResponse>();

function buildCacheKey(restaurantId: string, date: string, partySize: number): string {
  return `${restaurantId}|${date}|${partySize}`;
}

const CACHE_HEADERS = {
  // Browser/RN-fetch + any CDN in front honors these. SWR keeps things
  // responsive even when the cache misses upstream.
  "Cache-Control": "public, max-age=30, s-maxage=60, stale-while-revalidate=120",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const restaurantId = validatedText(url.searchParams.get("restaurant_id"), "restaurant_id", {
      required: true,
      maxLength: 80,
    });
    const date = asIsoDate(url.searchParams.get("date"), "date", { required: true });
    const partySize = asInteger(url.searchParams.get("party_size") ?? "2", "party_size", {
      min: 1,
      max: 30,
    }) ?? 2;

    if (!restaurantId || !date) {
      return jsonRes({ error: "restaurant_id and date required" }, 400);
    }

    // Serve a recent identical response from the warm-instance cache if we
    // have one. Mobile diners pile up on popular (restaurant, date) combos
    // so this collapses huge waves of traffic into a single DB read.
    const cacheKey = buildCacheKey(restaurantId, date, partySize);
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return jsonRes(cached.value, 200, CACHE_HEADERS);
    }

    const [availability, timezone, floorCapacity] = await Promise.all([
      getAvailability(restaurantId, date, partySize),
      getRestaurantTimezone(restaurantId),
      getFloorCapacity(restaurantId),
    ]);

    const shiftIds = Array.from(new Set((availability.slots ?? []).map((slot) => slot.shift_id)));

    // Day window for the live-reservations fetch. Use the date string in the
    // restaurant timezone, expanded to ±1 day to catch overnight services
    // that cross midnight.
    const dayPivot = new Date(`${date}T12:00:00.000Z`);
    const dayStart = new Date(dayPivot);
    dayStart.setUTCDate(dayPivot.getUTCDate() - 1);
    const dayEnd = new Date(dayPivot);
    dayEnd.setUTCDate(dayPivot.getUTCDate() + 1);

    // ONE batch per request: tables + reservations + shifts. Eliminates the
    // previous 2×N per-slot loop that ran ~80ms × 40-60 calls = ~3-5s.
    const [tablesResult, reservationsResult, shiftsResult] = await Promise.all([
      supabaseAdmin
        .from("tables")
        .select("id,capacity")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .gte("capacity", partySize)
        .order("capacity", { ascending: true }),
      supabaseAdmin
        .from("reservations")
        .select("table_id,reserved_at")
        .eq("restaurant_id", restaurantId)
        .in("status", ["pending", "confirmed", "seated"])
        .not("table_id", "is", null)
        .gte("reserved_at", dayStart.toISOString())
        .lte("reserved_at", dayEnd.toISOString()),
      shiftIds.length
        ? supabaseAdmin.from("shifts").select("id,turn_time_minutes").in("id", shiftIds)
        : Promise.resolve({ data: [] as Array<{ id: string; turn_time_minutes: number | null }> }),
    ]);

    const tables: CapacityTable[] = (tablesResult.data ?? []).map((row: { id: string; capacity: number | null }) => ({
      id: row.id,
      capacity: Number(row.capacity) || 0,
    }));
    const liveReservations: LiveReservation[] = (reservationsResult.data ?? [])
      .filter((row: { table_id: string | null; reserved_at: string | null }) => row.table_id && row.reserved_at)
      .map((row: { table_id: string; reserved_at: string }) => ({
        table_id: row.table_id,
        reserved_at: row.reserved_at,
      }));
    const turnMinutesByShift = new Map(
      (shiftsResult.data ?? []).map(
        (shift: { id: string; turn_time_minutes: number | null }) =>
          [shift.id, Number(shift.turn_time_minutes) || DEFAULT_TURN_MINUTES] as const,
      ),
    );

    const slots: PublicAvailabilitySlot[] = [];
    let tableBlockedCount = 0;
    for (const slot of availability.slots ?? []) {
      const durationMinutes = turnMinutesByShift.get(slot.shift_id) ?? DEFAULT_TURN_MINUTES;
      const localParts = localBookingParts(slot.date_time, timezone);
      if (!localParts) continue;
      const tableId = pickAvailableTableId(
        tables,
        liveReservations,
        partySize,
        slot.date_time,
        durationMinutes,
      );
      if (!tableId && floorCapacity) {
        tableBlockedCount += 1;
        continue;
      }
      slots.push({
        ...slot,
        ...(tableId ? { table_ids: [tableId] } : {}),
        duration_minutes: durationMinutes,
        floor_capacity: floorCapacity ?? undefined,
      });
    }

    const tableCapacityBlocked =
      slots.length === 0 &&
      (availability.slots ?? []).length > 0 &&
      tableBlockedCount >= (availability.slots ?? []).length;

    const responseBody = {
      slots,
      floor_capacity: floorCapacity,
      hours_window: availability.hours_window ?? null,
      unavailable_reason: tableCapacityBlocked ? "fully_booked" : availability.unavailable_reason ?? null,
      message: tableCapacityBlocked
        ? "The restaurant is fully booked for that date."
        : availability.message ?? null,
    };

    responseCache.set(cacheKey, { value: responseBody, expiresAt: Date.now() + CACHE_TTL_MS });
    return jsonRes(responseBody, 200, CACHE_HEADERS);
  } catch (error) {
    const validation = validationResponse(error, corsHeaders);
    if (validation) return validation;
    let message = "availability_failed";
    if (error instanceof Error && error.message) {
      message = error.message;
    } else if (typeof error === "string" && error.trim()) {
      message = error;
    } else if (error && typeof error === "object") {
      const candidate =
        (error as { message?: unknown }).message ??
        (error as { error?: unknown }).error ??
        (error as { detail?: unknown }).detail;
      if (typeof candidate === "string" && candidate.trim()) {
        message = candidate;
      }
    }
    console.error("get-availability error:", message, error);
    return jsonRes({ error: message }, 500);
  }
});
