// Build 3f — return (or lazily mint) the authenticated diner's
// referral code. Format: CENA-XXXXXX (4-letter prefix + 6
// base32-ish chars). Per Cenaiva ToS §9.3.

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

// 32-char base avoiding visually-confusing 0/O/1/I.
const CODE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function generateCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += CODE_ALPHABET[buf[i] % CODE_ALPHABET.length];
  }
  return `CENA-${out}`;
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

    // Check if the user already has a code.
    const { data: existing, error: readErr } = await admin
      .from("user_profiles")
      .select("referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) {
      return jsonResponse({ error: "read_failed", detail: readErr.message }, 500);
    }
    if (existing?.referral_code) {
      return jsonResponse({ ok: true, code: existing.referral_code });
    }

    // Mint a new code. Retry up to 5 times on the unique-constraint
    // race (collision rate at 32^6 / day ≈ 10^-8, but defensive).
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = generateCode();
      const { error: updateErr } = await admin
        .from("user_profiles")
        .update({ referral_code: candidate })
        .eq("id", userId)
        .is("referral_code", null);
      if (!updateErr) {
        return jsonResponse({ ok: true, code: candidate });
      }
      if (!String(updateErr.message).toLowerCase().includes("unique")) {
        return jsonResponse({ error: "mint_failed", detail: updateErr.message }, 500);
      }
    }
    return jsonResponse({ error: "mint_collisions_exhausted" }, 500);
  },
};
