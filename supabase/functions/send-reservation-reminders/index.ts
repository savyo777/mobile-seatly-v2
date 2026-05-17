// @ts-nocheck
// Edge function: send-reservation-reminders
//
// Cron-invoked batch job. Sends a 24-hour-ahead reservation reminder to
// every diner whose reservation is between now+23.5h and now+24.5h, has
// a confirmed/pending_payment status, and has NOT already received a
// reservation_reminder_24h notification (dedup via communication_log).
//
// Auth: this endpoint is anon-callable to keep cron simple, but rejects
// any caller missing the X-Cron-Secret header. The secret is configured
// in Supabase function env as RESERVATION_REMINDER_CRON_SECRET and is
// also stored in Vault for pg_cron to use.
//
// SMS goes through Twilio first, falls back to email via Resend, never
// crashes the batch. One bad row never breaks subsequent rows.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { sendSmsOrEmail, logCommunication } from "../_shared/sms.ts";

const REMINDER_TYPE = "reservation_reminder_24h";
const WINDOW_LOWER_HOURS = 23.5;
const WINDOW_UPPER_HOURS = 24.5;
const PAGE_SIZE = 200;
// Safety cap so a runaway loop can't tie up the function. 50 pages ×
// 200 rows = 10k reservations / cron run. Real prod volume is well
// below this; if we ever exceed it, the next cron run picks up the
// remaining rows.
const MAX_PAGES = 50;

function formatLocalDateTime(iso: string, timeZone: string | null | undefined): string {
  try {
    const d = new Date(iso);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone ?? "America/Toronto",
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
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

  const now = new Date();
  const lower = new Date(now.getTime() + WINDOW_LOWER_HOURS * 60 * 60 * 1000);
  const upper = new Date(now.getTime() + WINDOW_UPPER_HOURS * 60 * 60 * 1000);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  let cursor: string | null = null;

  // Page through reservations in chronological order. Each page filters
  // out IDs that already have a reservation_reminder_24h
  // communication_log row, so we converge on zero remaining work
  // instead of repeatedly chewing on the first 200. Audit fix (Phase 3
  // 2026-05-17): the previous implementation capped at 200 rows per
  // run and re-fired the same first 200 on every cron tick, leaving
  // later rows orphaned indefinitely.
  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabaseAdmin
      .from("reservations")
      .select(
        "id, restaurant_id, reserved_at, party_size, confirmation_code, status, guest_id, " +
          "guests(full_name, phone, email), " +
          "restaurants(name, timezone)",
      )
      .gte("reserved_at", lower.toISOString())
      .lte("reserved_at", upper.toISOString())
      .in("status", ["confirmed", "pending_payment"])
      .order("reserved_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (cursor) {
      q = q.gt("reserved_at", cursor);
    }
    const { data: candidates, error: candErr } = await q;
    if (candErr) {
      return jsonRes({ error: `Failed to fetch reservations: ${candErr.message}` }, 500);
    }
    const rows = candidates ?? [];
    if (rows.length === 0) break;

    const reservationIds = rows.map((r) => r.id).filter(Boolean);
    let alreadyLoggedIds = new Set<string>();
    if (reservationIds.length > 0) {
      const { data: logs } = await supabaseAdmin
        .from("communication_log")
        .select("campaign_id")
        .eq("type", REMINDER_TYPE)
        .in("campaign_id", reservationIds);
      alreadyLoggedIds = new Set(
        (logs ?? [])
          .map((r) => (typeof r.campaign_id === "string" ? r.campaign_id : null))
          .filter((v): v is string => Boolean(v)),
      );
    }

    for (const r of rows) {
      processed += 1;
      if (!r.id || alreadyLoggedIds.has(r.id)) {
        skipped += 1;
        continue;
      }
      try {
      const guest = (r as { guests?: { full_name?: string; phone?: string; email?: string } }).guests ?? {};
      const restaurant = (r as { restaurants?: { name?: string; timezone?: string } }).restaurants ?? {};
      const restaurantName = restaurant.name ?? "the restaurant";
      const guestName = guest.full_name ?? "there";
      const localTime = formatLocalDateTime(r.reserved_at, restaurant.timezone);
      const party = Number(r.party_size ?? 1);
      const partyLabel = `${party} ${party === 1 ? "guest" : "guests"}`;
      const codeSuffix = r.confirmation_code ? ` Confirmation code: ${r.confirmation_code}.` : "";

      const smsBody =
        `Reminder: your reservation at ${restaurantName} is ${localTime} for ${partyLabel}.${codeSuffix}`;
      const emailSubject = `Reminder: your reservation at ${restaurantName}`;
      const emailBody = smsBody;

      const result = await sendSmsOrEmail({
        phone: guest.phone,
        email: guest.email,
        smsBody,
        emailSubject,
        emailBody,
      });

      // Log even on `skipped` (no contact info) so we don't retry the same
      // row on every cron run. The dedup is the log row, not the send.
      await logCommunication({
        supabase: supabaseAdmin,
        guest_id: r.guest_id ?? null,
        restaurant_id: r.restaurant_id,
        channel: result.channel,
        type: REMINDER_TYPE,
        subject: emailSubject,
        body: smsBody,
        status: result.status,
        campaign_id: r.id,
      });

      if (result.status === "sent") sent += 1;
      else if (result.status === "failed") failed += 1;
      else skipped += 1;
      } catch (err) {
        console.error("[reminder] reservation", r.id, err);
        failed += 1;
      }
    }

    // Advance the cursor for the next page. Combined with the
    // alreadyLoggedIds filter, this converges on zero remaining work
    // even if every row in the page was already reminded.
    if (rows.length < PAGE_SIZE) break;
    const lastReservedAt = rows[rows.length - 1]?.reserved_at;
    if (typeof lastReservedAt !== "string") break;
    cursor = lastReservedAt;
  }

  return jsonRes({
    processed,
    sent,
    skipped,
    failed,
    window: { lower: lower.toISOString(), upper: upper.toISOString() },
  });
});
