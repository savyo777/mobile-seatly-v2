// @ts-nocheck
// Edge function: send-post-turn-review-prompts
//
// Cron-invoked. For every reservation whose turn time has elapsed
// (now > reserved_at + duration_minutes) and that doesn't already have
// a `post_turn_visit_requests` row with request_type='review' and a
// non-null `push_sent_at`, send a "How was <restaurant>?" push to the
// diner and stamp `push_sent_at` so future runs skip it.
//
// Replaces the device-local notification scheduled by lib/postVisit/push.ts:
// that was unreliable (device must be on, foregrounded, not killed).
// A server push survives device state changes.
//
// Auth: anon-callable, gated by X-Cron-Secret header. Reuses the existing
// RESERVATION_REMINDER_CRON_SECRET so we don't have to provision a new
// secret for an MVP cron. The two crons run on independent schedules in
// pg_cron — see the migration that registers this fn.
//
// Push goes via _shared/expo-push.ts. SMS/email NOT sent for this type
// (review reminders are a soft prompt; only push makes sense — diners
// don't want a text message asking them to leave a review).

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { logCommunication } from "../_shared/sms.ts";
import { sendExpoPush } from "../_shared/expo-push.ts";

const REQUEST_TYPE = "review";
const REMINDER_LOG_TYPE = "post_turn_review_request";
// Look back 14 days max so a cold-started cron doesn't try to push for
// reservations from months ago. Same upper bound the existing
// PostTurnPromptHost uses for its local sync window.
const MAX_LOOKBACK_DAYS = 14;
const PAGE_SIZE = 200;
const MAX_PAGES = 50;
// Fallback turn time when reservations.duration_minutes is null and the
// shift didn't propagate one. Mirrors the default Cenaiva uses elsewhere.
const FALLBACK_TURN_MINUTES = 90;

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
  const lookbackCutoff = new Date(now.getTime() - MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  let processed = 0;
  let cursor: string | null = null;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    let q = supabaseAdmin
      .from("reservations")
      .select(
        "id, restaurant_id, user_profile_id, reserved_at, duration_minutes, status, " +
          "restaurants(name)",
      )
      .gte("reserved_at", lookbackCutoff.toISOString())
      .lte("reserved_at", now.toISOString())
      .in("status", ["confirmed", "seated", "completed", "pending_payment"])
      .not("user_profile_id", "is", null)
      .order("reserved_at", { ascending: true })
      .order("id", { ascending: true })
      .limit(PAGE_SIZE);
    if (cursor) q = q.gt("reserved_at", cursor);

    const { data: candidates, error: candErr } = await q;
    if (candErr) {
      return jsonRes({ error: `Failed to fetch reservations: ${candErr.message}` }, 500);
    }
    const rows = candidates ?? [];
    if (rows.length === 0) break;

    // Filter rows whose turn time has actually elapsed. We can't do this
    // in the query because duration_minutes can be null and we need to
    // fall back. Keep it in JS for clarity.
    const eligibleRows = rows.filter((r) => {
      const reservedAt = new Date(r.reserved_at);
      const durationMinutes = typeof r.duration_minutes === "number"
        ? r.duration_minutes
        : FALLBACK_TURN_MINUTES;
      const turnEndsAt = new Date(reservedAt.getTime() + durationMinutes * 60 * 1000);
      return turnEndsAt < now;
    });

    if (eligibleRows.length === 0) {
      const last = rows[rows.length - 1]?.reserved_at;
      if (typeof last === "string") cursor = last;
      if (rows.length < PAGE_SIZE) break;
      continue;
    }

    // Look up existing push-sent review requests for these bookings — dedup.
    const bookingIds = eligibleRows.map((r) => r.id).filter(Boolean);
    const { data: existingRequests } = await supabaseAdmin
      .from("post_turn_visit_requests")
      .select("booking_id, push_sent_at")
      .eq("request_type", REQUEST_TYPE)
      .in("booking_id", bookingIds);
    const alreadyPushedBookingIds = new Set(
      (existingRequests ?? [])
        .filter((r) => r.push_sent_at != null)
        .map((r) => r.booking_id),
    );

    for (const r of eligibleRows) {
      processed += 1;
      if (alreadyPushedBookingIds.has(r.id)) {
        skipped += 1;
        continue;
      }

      try {
        // Look up the diner's expo_push_token.
        const { data: profileRow } = await supabaseAdmin
          .from("user_profiles")
          .select("id, expo_push_token")
          .eq("id", r.user_profile_id)
          .maybeSingle();
        const token = (profileRow as { expo_push_token?: string | null } | null)?.expo_push_token;
        const userProfileId = (profileRow as { id?: string } | null)?.id;
        if (!token || !userProfileId) {
          skipped += 1;
          continue;
        }

        const restaurantName =
          (r as { restaurants?: { name?: string } }).restaurants?.name ?? "your visit";

        const pushResult = await sendExpoPush({
          tokens: [token],
          title: `How was ${restaurantName}?`,
          body: "Tap to leave a quick review.",
          data: {
            kind: "review_request",
            reservationId: r.id,
            restaurantId: r.restaurant_id,
            bookingId: r.id,
          },
        });

        const pushOk = pushResult.sentCount > 0;
        const nowIso = new Date().toISOString();

        // UPSERT the post_turn_visit_requests row so it's deduped on
        // subsequent runs even if push itself failed. The mobile
        // PostTurnPromptHost reads this same table and will surface the
        // in-app modal as a fallback.
        await supabaseAdmin
          .from("post_turn_visit_requests")
          .upsert(
            {
              booking_id: r.id,
              user_id: userProfileId,
              restaurant_id: r.restaurant_id,
              request_type: REQUEST_TYPE,
              status: "pending",
              push_sent_at: pushOk ? nowIso : null,
            },
            { onConflict: "booking_id,user_id,request_type" },
          );

        await logCommunication({
          supabase: supabaseAdmin,
          guest_id: null,
          restaurant_id: r.restaurant_id,
          channel: "push",
          type: REMINDER_LOG_TYPE,
          subject: `How was ${restaurantName}?`,
          body: "Tap to leave a quick review.",
          status: pushOk ? "sent" : "failed",
          campaign_id: r.id,
        });

        if (pushOk) sent += 1;
        else failed += 1;
      } catch (err) {
        console.error("[post-turn-review-prompt] reservation", r.id, err);
        failed += 1;
      }
    }

    const last = rows[rows.length - 1]?.reserved_at;
    if (typeof last === "string") cursor = last;
    if (rows.length < PAGE_SIZE) break;
  }

  return jsonRes({
    processed,
    sent,
    skipped,
    failed,
    window: { lookback_cutoff: lookbackCutoff.toISOString(), now: now.toISOString() },
  });
});
