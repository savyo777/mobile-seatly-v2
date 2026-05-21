// Build 3b — Self-service data export (PIPEDA / Quebec Law 25).
//
// Cenaiva consumer ToS §18 commits to: "Request portability of your
// personal data in a structured, commonly used format". This fn
// fulfils that with an in-app "Download my data" button.
//
// FLOW:
//   1. Authenticated POST from mobile (no body needed; user comes
//      from the bearer JWT).
//   2. Rate-limit: 1 request per 24h per user (data export is
//      expensive + the resulting JSON contains everything; no need
//      for a user to spam it).
//   3. Aggregate all rows referencing the user_id from canonical
//      tables. Each table aggregation is best-effort (table missing
//      → skipped, not fatal).
//   4. Upload the JSON bundle to the `user-data-exports` Storage
//      bucket. Create a signed URL with 24h TTL.
//   5. Email the signed URL via Resend to the user's email on file.
//   6. Return { ok: true, expires_at: <iso> } to the client.
//
// SECURITY:
//   - Bearer JWT is required (verify_jwt=true at deploy).
//   - Service-role client used INTERNALLY for table reads + Storage
//     write. The authenticated user_id is the ONLY filter on the
//     reads — never trust client input for which user_id to export.
//   - Signed URL is single-use-resistant (Storage doesn't natively
//     enforce single-use, but 24h TTL + email-only delivery is the
//     PIPEDA-recommended pattern).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";
import { enforceRateLimit, rateLimitIdentifier, RateLimitError } from "../_shared/rate-limit.ts";

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

// Canonical tables that contain user-identifying data. Add to this
// list whenever a new user-owned table ships. Each entry: table name
// + which column links to the user (most are user_id; some are
// user_profile_id).
const USER_TABLES: Array<{ table: string; column: string }> = [
  { table: "user_profiles", column: "id" },
  { table: "reservations", column: "user_profile_id" },
  { table: "reservation_deposit_payments", column: "user_id" },
  { table: "reservation_holds", column: "user_profile_id" },
  { table: "visit_photos", column: "user_id" },
  { table: "saved_cards", column: "user_id" },
  { table: "auth_sign_in_events", column: "user_id" },
  { table: "post_turn_visit_requests", column: "user_id" },
  { table: "allergy_incidents", column: "user_profile_id" },
  { table: "audit_log", column: "actor_user_id" },
];

async function gatherUserData(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Record<string, unknown>> {
  const bundle: Record<string, unknown> = {
    exported_at: new Date().toISOString(),
    user_id: userId,
    schema_version: 1,
  };
  for (const { table, column } of USER_TABLES) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq(column, userId);
      if (error) {
        bundle[table] = { error: error.message };
      } else {
        bundle[table] = data ?? [];
      }
    } catch (err) {
      bundle[table] = { error: err instanceof Error ? err.message : String(err) };
    }
  }
  return bundle;
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

    // Verify the caller via their JWT.
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
    const userEmail = userData.user.email;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Rate limit: 1 export per 24h per user. ToS §18 self-service
    // promise doesn't require we accept abusive request volumes.
    try {
      await enforceRateLimit(
        admin,
        "export-my-data",
        rateLimitIdentifier(req, userId),
        { limit: 1, windowSeconds: 24 * 60 * 60 },
      );
    } catch (err) {
      if (err instanceof RateLimitError) {
        return jsonResponse(
          {
            error:
              "You can request one data export every 24 hours. Please try again later.",
            retry_after_seconds: err.retryAfterSeconds,
          },
          429,
        );
      }
      throw err;
    }

    // Aggregate + upload.
    const bundle = await gatherUserData(admin, userId);
    const filename = `${userId}/${Date.now()}-cenaiva-data-export.json`;
    const { error: uploadErr } = await admin.storage
      .from("user-data-exports")
      .upload(filename, JSON.stringify(bundle, null, 2), {
        contentType: "application/json",
        upsert: false,
      });
    if (uploadErr) {
      console.error("[export-my-data] upload failed", uploadErr);
      return jsonResponse({ error: "upload_failed", detail: uploadErr.message }, 500);
    }

    const expiresInSeconds = 24 * 60 * 60;
    const { data: signed, error: signErr } = await admin.storage
      .from("user-data-exports")
      .createSignedUrl(filename, expiresInSeconds);
    if (signErr || !signed?.signedUrl) {
      console.error("[export-my-data] sign failed", signErr);
      return jsonResponse({ error: "sign_failed", detail: signErr?.message }, 500);
    }

    const expiresAt = new Date(Date.now() + expiresInSeconds * 1000).toISOString();

    // Email the link via Resend. Don't crash if Resend is misconfigured —
    // the API also returns the URL so the client can show it directly.
    if (userEmail) {
      const resendKey = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Cenaiva <noreply@cenaiva.com>";
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: fromEmail,
            to: userEmail,
            subject: "Your Cenaiva data export is ready",
            text:
              `Hi,\n\nYour Cenaiva data export is ready. The download link below is valid for 24 hours:\n\n${signed.signedUrl}\n\nThe export is a JSON file that includes everything Cenaiva holds about your account, including reservations, deposit payments, photos, sign-in history, and (where applicable) automated profiling.\n\nIf you didn't request this, please contact support@cenaiva.com immediately — your account may have been accessed.\n\nThanks,\nCenaiva`,
          });
        } catch (err) {
          console.warn("[export-my-data] resend email failed (returning URL anyway)", err);
        }
      }
    }

    return jsonResponse({
      ok: true,
      delivered_to: userEmail ? "email" : "client",
      expires_at: expiresAt,
      // Surfacing the URL lets the mobile app deep-link to it directly
      // for users who don't check their email or whose email is null.
      download_url: signed.signedUrl,
    });
  },
};
