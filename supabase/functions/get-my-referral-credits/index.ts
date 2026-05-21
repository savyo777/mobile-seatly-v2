// Build 3f LIVE — return the diner's referral-credit balance + recent
// issuances. Per Cenaiva ToS §9.3. Credits are auto-issued by the DB
// trigger `qualify_pending_referral_trg` when a referred user
// completes their first confirmed booking.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!supabaseUrl || !anonKey) return jsonResponse({ error: "server_misconfigured" }, 500);

    const auth = req.headers.get("Authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : "";
    if (!token) return jsonResponse({ error: "unauthenticated" }, 401);

    // RLS handles row filtering — every credit row is restricted to
    // its owner via drc_own_read policy. Use the user-scoped client.
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonResponse({ error: "unauthenticated" }, 401);

    const { data, error } = await userClient
      .from("diner_referral_credits")
      .select("id, source, amount_cents, remaining_cents, expires_at, created_at, source_referral_id")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return jsonResponse({ error: "query_failed", detail: error.message }, 500);

    type Row = {
      id: string;
      source: "referrer_reward" | "referred_reward" | "manual_grant";
      amount_cents: number;
      remaining_cents: number;
      expires_at: string | null;
      created_at: string;
      source_referral_id: string | null;
    };

    const rows = (data ?? []) as Row[];
    const now = Date.now();
    let balanceCents = 0;
    let lifetimeEarnedCents = 0;
    let expiringSoonCents = 0;
    const ninetyDays = 90 * 24 * 60 * 60 * 1000;
    for (const r of rows) {
      lifetimeEarnedCents += r.amount_cents;
      if (r.remaining_cents > 0 && (!r.expires_at || new Date(r.expires_at).getTime() > now)) {
        balanceCents += r.remaining_cents;
        if (r.expires_at && new Date(r.expires_at).getTime() - now < ninetyDays) {
          expiringSoonCents += r.remaining_cents;
        }
      }
    }

    return jsonResponse({
      ok: true,
      balance_cents: balanceCents,
      lifetime_earned_cents: lifetimeEarnedCents,
      expiring_soon_cents: expiringSoonCents,
      // Recent issuances (capped to 50 above). Useful for the activity feed.
      ledger: rows.map((r) => ({
        id: r.id,
        source: r.source,
        amount_cents: r.amount_cents,
        remaining_cents: r.remaining_cents,
        expires_at: r.expires_at,
        created_at: r.created_at,
        referral_id: r.source_referral_id,
      })),
    });
  },
};
