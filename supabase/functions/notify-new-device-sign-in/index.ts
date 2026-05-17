// @ts-nocheck
// Edge function: notify-new-device-sign-in
//
// Drains public.security_alert_queue. For each pending row with
// alert_type='new_device_sign_in', looks up the user's email/phone
// and dispatches a "new sign-in detected" notification via the shared
// sms.ts helper.
//
// Trigger: pg_cron every 5 minutes (idempotent — only processes
// status='pending' rows, marks them sent/failed). Could also be
// called from a pg_net trigger immediately on insert if the project
// has pg_net configured.
//
// Auth: X-Cron-Secret header check, same pattern as
// send-reservation-reminders. Never anon-callable.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSmsOrEmail, logCommunication, sanitizeForSmsField } from "../_shared/sms.ts";

const MAX_PER_RUN = 100;
const MAX_ATTEMPTS = 3;

function formatLocalTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Toronto",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

Deno.serve(async (req: Request) => {
  const corsHeaders = buildCorsHeaders(req);
  const jsonRes = (body: unknown, status = 200): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST required" }, 405);

  const cronSecret = Deno.env.get("RESERVATION_REMINDER_CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || !provided || provided !== cronSecret) {
    return jsonRes({ error: "Unauthorized" }, 401);
  }

  // Pull pending alerts. Order by queued_at so older alerts go first.
  const { data: pending, error: pendingErr } = await supabaseAdmin
    .from("security_alert_queue")
    .select("id, sign_in_event_id, alert_type, attempts")
    .eq("status", "pending")
    .lt("attempts", MAX_ATTEMPTS)
    .order("queued_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (pendingErr) {
    return jsonRes({ error: `Queue fetch failed: ${pendingErr.message}` }, 500);
  }

  const rows = pending ?? [];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const alert of rows) {
    // Lookup the sign-in event + user details.
    const { data: event, error: eventErr } = await supabaseAdmin
      .from("auth_sign_in_events")
      .select("id, user_id, device_fingerprint, platform, app_version, occurred_at")
      .eq("id", alert.sign_in_event_id)
      .maybeSingle();
    if (eventErr || !event) {
      await supabaseAdmin
        .from("security_alert_queue")
        .update({
          status: "failed",
          attempts: alert.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error: `Event lookup failed: ${eventErr?.message ?? "not found"}`,
        })
        .eq("id", alert.id);
      failed += 1;
      continue;
    }

    const { data: profile } = await supabaseAdmin
      .from("user_profiles")
      .select("full_name, email, phone")
      .eq("id", event.user_id)
      .maybeSingle();
    if (!profile || (!profile.email && !profile.phone)) {
      // No contact info — skip but mark so we don't retry forever.
      await supabaseAdmin
        .from("security_alert_queue")
        .update({
          status: "skipped",
          attempts: alert.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error: "No email or phone for user",
        })
        .eq("id", alert.id);
      skipped += 1;
      continue;
    }

    const guestName = sanitizeForSmsField(profile.full_name) || "there";
    const when = formatLocalTime(event.occurred_at);
    const deviceInfo = event.platform
      ? `${event.platform}${event.app_version ? " " + event.app_version : ""}`
      : "a new device";

    const subject = "New sign-in to your Cenaiva account";
    const body =
      `Hi ${guestName}, we noticed a new sign-in to your Cenaiva account ` +
      `from ${deviceInfo} on ${when}. If that was you, no action needed. ` +
      `If not, change your password immediately at cenaiva.com/forgot-password.`;

    try {
      const result = await sendSmsOrEmail({
        phone: profile.phone,
        email: profile.email,
        smsBody: body,
        emailSubject: subject,
        emailBody: body,
      });

      await supabaseAdmin
        .from("security_alert_queue")
        .update({
          status: result.status === "sent" ? "sent" : "failed",
          attempts: alert.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          sent_at: result.status === "sent" ? new Date().toISOString() : null,
          error: result.error ?? null,
        })
        .eq("id", alert.id);

      // Also stamp the original event so the user-facing
      // "review activity" feature can show "alert dispatched".
      if (result.status === "sent") {
        await supabaseAdmin
          .from("auth_sign_in_events")
          .update({ alert_dispatched_at: new Date().toISOString() })
          .eq("id", event.id);
      }

      await logCommunication({
        supabase: supabaseAdmin,
        guest_id: null,
        restaurant_id: null as unknown as string, // not restaurant-scoped
        channel: result.channel,
        type: "new_device_sign_in",
        subject,
        body,
        status: result.status,
        campaign_id: alert.id,
      });

      if (result.status === "sent") sent += 1;
      else failed += 1;
    } catch (err) {
      await supabaseAdmin
        .from("security_alert_queue")
        .update({
          status: alert.attempts + 1 >= MAX_ATTEMPTS ? "failed" : "pending",
          attempts: alert.attempts + 1,
          last_attempt_at: new Date().toISOString(),
          error: err instanceof Error ? err.message : String(err),
        })
        .eq("id", alert.id);
      failed += 1;
    }
  }

  return jsonRes({
    processed: rows.length,
    sent,
    failed,
    skipped,
  });
});
