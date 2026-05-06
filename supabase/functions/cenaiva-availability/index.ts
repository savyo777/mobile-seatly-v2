import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import {
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

    return jsonRes(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("cenaiva-availability error:", message);
    return jsonRes({ error: message || "availability_failed" }, 500);
  }
});
