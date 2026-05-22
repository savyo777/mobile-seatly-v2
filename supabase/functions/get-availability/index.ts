// @ts-nocheck
//
// get-availability — diner's hot read path for "show me open slots."
//
// 2026-05-21 rewrite: replaced 4 parallel queries + an in-process slot-by-slot
// loop with ONE rpc() call to `get_available_slots_cached`. The RPC already
// runs the slot computation + table assignment + live-reservation conflict
// check + Postgres-level 20s cache. The edge fn was redundantly re-fetching
// data the RPC already returns (timezone, floor_capacity, slot table_ids),
// which is why k6 measured edge-fn p95=2.45s vs direct-RPC p95=66ms — a 37×
// gap. After this swap the edge fn becomes a thin pass-through that adds:
//   - request validation
//   - in-memory cache (collapses repeat hits on the same warm instance)
//   - HTTP Cache-Control headers (CDN-level cache for popular tuples)
//   - display_time synthesis per slot (using the timezone the RPC returns)
//   - response-shape compatibility for the existing mobile clients
//     (keeps `hours_window` even though the RPC calls it
//      `configured_hours_window`)
//
// Expected: p95 drops from 2.45s to ~300ms. Connection-pool budget at
// 1500 VUs drops from 3,675 to 450 conn-seconds — comfortably under the
// Supabase Pro PGBouncer ceiling.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { DEFAULT_TURN_MINUTES } from "../_shared/booking-defaults.ts";
import {
  validationResponse,
  asText as validatedText,
  asIsoDate,
  asInteger,
} from "../_shared/input-validation.ts";

type CachedSlot = {
  shift_id: string;
  shift_name: string;
  date_time: string;
  table_ids?: string[];
  duration_minutes?: number;
};

type CachedResponse = {
  slots: CachedSlot[];
  message: string | null;
  timezone: string | null;
  floor_capacity: number | null;
  unavailable_reason: string | null;
  configured_hours_window: string | null;
};

type PublicAvailabilitySlot = CachedSlot & {
  display_time?: string;
  floor_capacity?: number;
};

// Module-scope in-memory cache. Supabase keeps each function instance warm
// for several minutes between invocations, so this cache survives across
// calls served by the same worker. Auto-scaling spins up new instances at
// load, each with its own empty cache — that's still a big win because
// each instance amortizes its own hot keys.
//
// We keep this even though the RPC has its own 20s Postgres cache because:
// - Skipping the RPC round-trip entirely saves ~50ms per request
// - At 1500 VUs hitting popular tuples, this absorbs huge chunks of traffic
//   before they ever cross the Supabase boundary
const CACHE_TTL_MS = 30_000;
type InMemoryEntry = { value: unknown; expiresAt: number };
const responseCache = new Map<string, InMemoryEntry>();

function buildCacheKey(restaurantId: string, date: string, partySize: number): string {
  return `${restaurantId}|${date}|${partySize}`;
}

const CACHE_HEADERS = {
  // Browser/RN-fetch + the Supabase CDN honor these. SWR keeps things
  // responsive even when the upstream cache misses.
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

    // L1: in-memory cache. Mobile diners pile up on popular (restaurant,
    // date, party_size) combos so this collapses huge waves into a single
    // RPC call (and even that is then absorbed by the RPC's L2 Postgres
    // cache for 20s).
    const cacheKey = buildCacheKey(restaurantId, date, partySize);
    const cached = responseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return jsonRes(cached.value, 200, CACHE_HEADERS);
    }

    // L2: cached RPC. The Postgres function get_available_slots_cached
    // already does:
    //   - 20s row-level cache via availability_cache table
    //   - slot generation per shift hours
    //   - table assignment per slot (smallest-fit) with live-reservation
    //     conflict checking
    //   - returns timezone + floor_capacity + hours_window in the SAME
    //     response (eliminates the 4 supplementary edge-fn queries the
    //     pre-rewrite version made).
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc(
      "get_available_slots_cached",
      {
        p_restaurant_id: restaurantId,
        p_date: date,
        p_party_size: partySize,
      },
    );
    if (rpcError) throw rpcError;
    const payload = (rpcData ?? {}) as CachedResponse;

    // Synthesize display_time per slot using the timezone the RPC returned.
    // Format matches _shared/availability.ts:244-249 exactly so existing
    // mobile rendering stays bit-identical (e.g. "5:00 PM").
    const timezone = payload.timezone ?? "America/Toronto";
    const floorCapacity = payload.floor_capacity ?? null;
    const slots: PublicAvailabilitySlot[] = [];
    for (const slot of payload.slots ?? []) {
      const slotStart = new Date(slot.date_time);
      if (Number.isNaN(slotStart.getTime())) continue;
      const displayTime = slotStart.toLocaleTimeString("en-US", {
        timeZone: timezone,
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
      slots.push({
        ...slot,
        display_time: displayTime,
        duration_minutes: slot.duration_minutes ?? DEFAULT_TURN_MINUTES,
        floor_capacity: floorCapacity ?? undefined,
      });
    }

    const responseBody = {
      slots,
      floor_capacity: floorCapacity,
      // Mobile clients read `hours_window` — keep the legacy field name.
      hours_window: payload.configured_hours_window ?? null,
      unavailable_reason: payload.unavailable_reason ?? null,
      message: payload.message ?? null,
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
