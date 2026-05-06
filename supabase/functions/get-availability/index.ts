// @ts-nocheck
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { getAvailability } from "../_shared/availability.ts";
import { localBookingParts } from "../_shared/hours.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";

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
  return data?.timezone || "UTC";
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

async function findAvailableTableId(params: {
  restaurantId: string;
  partySize: number;
  dateTime: string;
  durationMinutes: number;
}): Promise<string | null> {
  const { data: tables, error: tableError } = await supabaseAdmin
    .from("tables")
    .select("id,capacity")
    .eq("restaurant_id", params.restaurantId)
    .eq("is_active", true)
    .gte("capacity", params.partySize)
    .order("capacity", { ascending: true });
  if (tableError || !tables?.length) return null;

  const start = new Date(params.dateTime);
  const end = new Date(start.getTime() + params.durationMinutes * 60_000);
  const dayStart = new Date(start);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(start);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const { data: reservations } = await supabaseAdmin
    .from("reservations")
    .select("table_id,reserved_at")
    .eq("restaurant_id", params.restaurantId)
    .in("status", ["pending", "confirmed", "seated"])
    .not("table_id", "is", null)
    .gte("reserved_at", dayStart.toISOString())
    .lte("reserved_at", dayEnd.toISOString());

  const blocked = new Set<string>();
  for (const reservation of reservations ?? []) {
    if (!reservation.table_id || !reservation.reserved_at) continue;
    const reservationStart = new Date(reservation.reserved_at);
    const reservationEnd = new Date(reservationStart.getTime() + params.durationMinutes * 60_000);
    if (start < reservationEnd && end > reservationStart) {
      blocked.add(reservation.table_id);
    }
  }

  return tables.find((table) => !blocked.has(table.id))?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "GET") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(req.url);
    const restaurantId = url.searchParams.get("restaurant_id")?.trim();
    const date = url.searchParams.get("date")?.trim();
    const partySize = Math.max(1, Math.floor(numberParam(url.searchParams.get("party_size"), 2)));

    if (!restaurantId || !date) {
      return jsonRes({ error: "restaurant_id and date required" }, 400);
    }

    const [availability, timezone, floorCapacity] = await Promise.all([
      getAvailability(restaurantId, date, partySize),
      getRestaurantTimezone(restaurantId),
      getFloorCapacity(restaurantId),
    ]);

    const shiftIds = Array.from(new Set((availability.slots ?? []).map((slot) => slot.shift_id)));
    const { data: shifts } = shiftIds.length
      ? await supabaseAdmin
        .from("shifts")
        .select("id,turn_time_minutes")
        .in("id", shiftIds)
      : { data: [] };
    const turnMinutesByShift = new Map(
      (shifts ?? []).map((shift) => [shift.id, Number(shift.turn_time_minutes) || 90]),
    );

    const slots: PublicAvailabilitySlot[] = [];
    let tableBlockedCount = 0;
    for (const slot of availability.slots ?? []) {
      const durationMinutes = turnMinutesByShift.get(slot.shift_id) ?? 90;
      const localParts = localBookingParts(slot.date_time, timezone);
      if (!localParts) continue;
      const tableId = await findAvailableTableId({
        restaurantId,
        partySize,
        dateTime: slot.date_time,
        durationMinutes,
      });
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

    return jsonRes({
      slots,
      floor_capacity: floorCapacity,
      hours_window: availability.hours_window ?? null,
      unavailable_reason: tableCapacityBlocked ? "fully_booked" : availability.unavailable_reason ?? null,
      message: tableCapacityBlocked
        ? "The restaurant is fully booked for that date."
        : availability.message ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("get-availability error:", message);
    return jsonRes({ error: message || "availability_failed" }, 500);
  }
});
