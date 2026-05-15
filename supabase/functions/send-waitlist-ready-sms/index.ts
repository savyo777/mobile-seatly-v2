// @ts-nocheck
// Edge function: send-waitlist-ready-sms
//
// Staff calls this when they tap "Notify ready" on a waitlist row. Looks
// up the row, sends an SMS (with email fallback) via the shared helper,
// updates `waitlist.status` to 'notified', and logs to communication_log.
//
// Auth: Bearer JWT (must be an authenticated staff/owner user). RLS on
// the `waitlist` table is the authorization boundary for the restaurant
// scope — we read with the caller's JWT to inherit their permissions.
//
// Twilio + Resend credentials live server-side only (see _shared/sms.ts).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkAuth } from "../_shared/auth.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { enforceRateLimit, rateLimitIdentifier, RateLimitError } from "../_shared/rate-limit.ts";
import {
  readJsonObject,
  validationResponse,
  asUuid,
} from "../_shared/input-validation.ts";
import { sendSmsOrEmail, logCommunication } from "../_shared/sms.ts";

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  const jsonRes = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST required" }, 405);

  const auth = checkAuth(req);
  if (!auth.ok) return jsonRes({ error: "Unauthorized" }, 401);

  try {
    await enforceRateLimit(supabaseAdmin, "send-waitlist-ready-sms", rateLimitIdentifier(req, auth.authUserId), {
      limit: 30,
      windowSeconds: 60,
    });

    const payload = await readJsonObject(req);
    const waitlistId = asUuid(payload.waitlist_id);
    if (!waitlistId) {
      return jsonRes({ error: "waitlist_id is required." }, 400);
    }

    // Read the waitlist row with the caller's JWT so RLS scopes them to
    // their own restaurant. If the row isn't visible to them, this 404s.
    const authorization = req.headers.get("authorization") ?? "";
    const callerClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authorization } },
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const { data: row, error: rowError } = await callerClient
      .from("waitlist")
      .select("id, restaurant_id, guest_name, guest_phone, guest_email, status, party_size")
      .eq("id", waitlistId)
      .maybeSingle();
    if (rowError) return jsonRes({ error: rowError.message }, 500);
    if (!row) return jsonRes({ error: "Waitlist entry not found." }, 404);

    const status = (row.status ?? "").toLowerCase();
    if (status === "seated" || status === "no_show" || status === "cancelled") {
      return jsonRes({ error: `Cannot notify: entry is ${status}.` }, 409);
    }

    const { data: restaurant } = await supabaseAdmin
      .from("restaurants")
      .select("name")
      .eq("id", row.restaurant_id)
      .maybeSingle();
    const restaurantName = restaurant?.name ?? "the restaurant";
    const guestName = row.guest_name ?? "there";

    const smsBody =
      `Hi ${guestName}, your table at ${restaurantName} is ready! ` +
      `Please head to the host stand.`;
    const emailSubject = `Your table at ${restaurantName} is ready`;
    const emailBody = smsBody;

    const result = await sendSmsOrEmail({
      phone: row.guest_phone,
      email: row.guest_email,
      smsBody,
      emailSubject,
      emailBody,
    });

    if (result.channel) {
      await logCommunication({
        supabase: supabaseAdmin,
        guest_id: null,
        restaurant_id: row.restaurant_id,
        channel: result.channel,
        type: "waitlist_ready",
        subject: emailSubject,
        body: smsBody,
        status: result.status,
        campaign_id: row.id,
      });
    }

    // Mark the waitlist row as 'notified' so the UI reflects state even
    // if the SMS itself failed (the staff member tried, the record stands).
    await supabaseAdmin
      .from("waitlist")
      .update({ status: "notified" })
      .eq("id", row.id);

    return jsonRes({
      ok: true,
      channel: result.channel,
      status: result.status,
      error: result.error ?? null,
    });
  } catch (err) {
    if (err instanceof RateLimitError) {
      return jsonRes({ error: err.message }, 429);
    }
    const validation = validationResponse(err, corsHeaders);
    if (validation) return validation;
    const message = err instanceof Error ? err.message : String(err);
    return jsonRes({ error: message }, 500);
  }
});
