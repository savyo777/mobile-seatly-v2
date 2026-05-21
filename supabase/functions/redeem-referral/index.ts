// Build 3f — Apply a referral code to the authenticated diner's
// account. Called once at first sign-in (or after manual entry).
//
// Validates:
//   - Code matches an existing user_profiles.referral_code
//   - Caller is NOT the same user (self-referral guard)
//   - Caller doesn't already have a recorded referrer (UNIQUE
//     constraint on referrals.referred_user_id ensures this)
//
// Status starts as 'pending'. The qualification trigger (Build 3g
// loyalty hook) bumps it to 'qualified' when the referred user
// completes their first booking, then to 'rewarded' when the points
// land.

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
    if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

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
    if (userErr || !userData?.user) return jsonResponse({ error: "unauthenticated" }, 401);
    const userId = userData.user.id;

    let body: { code?: string };
    try { body = await req.json(); } catch { return jsonResponse({ error: "invalid_json" }, 400); }
    const rawCode = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!/^CENA-[2-9A-HJ-NP-Z]{6}$/.test(rawCode)) {
      return jsonResponse({ error: "invalid_code_format" }, 400);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: referrer, error: lookupErr } = await admin
      .from("user_profiles")
      .select("id")
      .eq("referral_code", rawCode)
      .maybeSingle();
    if (lookupErr) return jsonResponse({ error: "lookup_failed", detail: lookupErr.message }, 500);
    if (!referrer) return jsonResponse({ error: "code_not_found" }, 404);
    if (referrer.id === userId) return jsonResponse({ error: "self_referral" }, 400);

    const { data: inserted, error: insertErr } = await admin
      .from("referrals")
      .insert({
        referrer_user_id: referrer.id,
        referred_user_id: userId,
        referral_code: rawCode,
        status: "pending",
      })
      .select("id")
      .single();
    if (insertErr) {
      const msg = insertErr.message ?? "";
      if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("duplicate")) {
        return jsonResponse({ error: "already_referred" }, 409);
      }
      return jsonResponse({ error: "insert_failed", detail: msg }, 500);
    }

    return jsonResponse({
      ok: true,
      referral_id: inserted.id,
      message: "Referral applied. You and your friend will both earn rewards once you complete your first booking.",
    });
  },
};
