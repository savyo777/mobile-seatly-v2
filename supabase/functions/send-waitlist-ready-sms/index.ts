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
import { sendSmsOrEmail, logCommunication, sanitizeForSmsField } from "../_shared/sms.ts";
import { sendExpoPush } from "../_shared/expo-push.ts";

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

    // Per-waitlist-entry dedup (Phase 3 audit fix 2026-05-17). The
    // user-level rate limit above caps total sends per staff member,
    // but doesn't stop a re-notify of the SAME guest if staff taps
    // twice. Refuse if we already sent a waitlist_ready notice for
    // this row in the last hour.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: recentNotice } = await supabaseAdmin
      .from("communication_log")
      .select("id")
      .eq("type", "waitlist_ready")
      .eq("campaign_id", row.id)
      .eq("status", "sent")
      .gte("sent_at", oneHourAgo)
      .limit(1)
      .maybeSingle();
    if (recentNotice) {
      return jsonRes({
        ok: false,
        error: "Already notified within the last hour.",
        code: "duplicate_notify",
      }, 409);
    }

    const { data: restaurant } = await supabaseAdmin
      .from("restaurants")
      .select("name")
      .eq("id", row.restaurant_id)
      .maybeSingle();
    // Sanitize user-controlled fields before interpolating into the
    // outbound SMS / email (security audit: strip control chars and
    // any non-cenaiva URLs).
    const restaurantName = sanitizeForSmsField(restaurant?.name) || "the restaurant";
    const guestName = sanitizeForSmsField(row.guest_name) || "there";

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

    // Additive push: deliver to the signed-in diner. Lookup token via
    // waitlist.guest_phone → guests → user_profiles. Best-effort. The
    // 1-hour dedup above is channel-agnostic so a duplicate push+SMS pair
    // still counts as one notification cycle.
    try {
      if (row.guest_phone) {
        const { data: guestRow } = await supabaseAdmin
          .from("guests")
          .select("auth_user_id")
          .eq("phone", row.guest_phone)
          .maybeSingle();
        const authUserId = (guestRow as { auth_user_id?: string | null } | null)?.auth_user_id;
        if (authUserId) {
          const { data: profileRow } = await supabaseAdmin
            .from("user_profiles")
            .select("expo_push_token")
            .eq("auth_user_id", authUserId)
            .maybeSingle();
          const token = (profileRow as { expo_push_token?: string | null } | null)?.expo_push_token;
          if (token) {
            const pushResult = await sendExpoPush({
              tokens: [token],
              title: "Your table is ready",
              body: `Head to the host stand at ${restaurantName}.`,
              data: {
                kind: "waitlist_ready",
                waitlistId: row.id,
                restaurantId: row.restaurant_id,
              },
            });
            await logCommunication({
              supabase: supabaseAdmin,
              guest_id: null,
              restaurant_id: row.restaurant_id,
              channel: "push",
              type: "waitlist_ready",
              subject: emailSubject,
              body: smsBody,
              status: pushResult.sentCount > 0 ? "sent" : "failed",
              campaign_id: row.id,
            });
          }
        }
      }
    } catch (pushErr) {
      console.error("[waitlist-ready] push send threw", row.id, pushErr);
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
