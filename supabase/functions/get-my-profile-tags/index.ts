// Build 3d — Surface the diner's auto-generated tags / no-show risk
// / lifetime value across every restaurant they've been a guest at.
// Implements ToS §18 + §6.4: diner can review what restaurants see
// about them and request correction.
//
// Returns one entry per restaurant-guest row owned by the
// authenticated user, plus aggregates across all rows.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
    if (req.method !== "POST" && req.method !== "GET") {
      return jsonResponse({ error: "method_not_allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !serviceKey || !anonKey) {
      return jsonResponse({ error: "server_misconfigured" }, 500);
    }

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (!token) return jsonResponse({ error: "unauthenticated" }, 401);

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthenticated" }, 401);
    }
    const userId = userData.user.id;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Join to restaurants for the display name.
    const { data, error } = await admin
      .from("guests")
      .select(
        "id, restaurant_id, tags, no_show_risk_score, lifetime_value_score, total_visits, no_show_count, last_visit_at, restaurant:restaurants(id,name,slug)",
      )
      .eq("user_profile_id", userId)
      .order("last_visit_at", { ascending: false, nullsFirst: false });

    if (error) {
      return jsonResponse({ error: "query_failed", detail: error.message }, 500);
    }

    type Row = {
      id: string;
      restaurant_id: string;
      tags: string[] | null;
      no_show_risk_score: number | null;
      lifetime_value_score: number | null;
      total_visits: number | null;
      no_show_count: number | null;
      last_visit_at: string | null;
      restaurant: { id: string; name: string; slug: string } | null;
    };

    const rows = (data ?? []) as Row[];
    const tagSet = new Set<string>();
    let maxRisk = 0;
    let maxLtv = 0;
    let totalVisits = 0;
    let totalNoShows = 0;
    for (const row of rows) {
      if (Array.isArray(row.tags)) row.tags.forEach((t) => tagSet.add(String(t)));
      if (typeof row.no_show_risk_score === "number") maxRisk = Math.max(maxRisk, row.no_show_risk_score);
      if (typeof row.lifetime_value_score === "number") maxLtv = Math.max(maxLtv, row.lifetime_value_score);
      if (typeof row.total_visits === "number") totalVisits += row.total_visits;
      if (typeof row.no_show_count === "number") totalNoShows += row.no_show_count;
    }

    return jsonResponse({
      ok: true,
      aggregate: {
        all_tags: Array.from(tagSet).sort(),
        max_no_show_risk_score: maxRisk,
        max_lifetime_value_score: maxLtv,
        total_visits: totalVisits,
        total_no_shows: totalNoShows,
        restaurants_known_at: rows.length,
      },
      per_restaurant: rows.map((r) => ({
        guest_id: r.id,
        restaurant_id: r.restaurant_id,
        restaurant_name: r.restaurant?.name ?? "Unknown restaurant",
        tags: r.tags ?? [],
        no_show_risk_score: r.no_show_risk_score ?? 0,
        lifetime_value_score: r.lifetime_value_score ?? 0,
        total_visits: r.total_visits ?? 0,
        no_show_count: r.no_show_count ?? 0,
        last_visit_at: r.last_visit_at,
      })),
    });
  },
};
