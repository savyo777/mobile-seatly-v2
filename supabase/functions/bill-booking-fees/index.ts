// @ts-nocheck
// bill-booking-fees: cron-called sweeper that converts pending
// restaurant_booking_fees rows into Stripe invoice_items on each
// restaurant's subscription customer. Stripe automatically attaches
// pending invoice items to the customer's next monthly invoice, so
// each restaurant's monthly bill ends up as:
//
//   subscription line ($199.99/mo)
// + sum(booking fees @ $1.00 each) for the cycle
// = monthly invoice total
//
// Trial-period bookings are intentionally NOT billed: during the free
// trial we mark fee rows as 'trial_skipped' (terminal) so they don't
// silently accumulate onto the first post-trial invoice. This keeps
// '3 months free' truly free.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { buildCorsHeaders } from "../_shared/cors.ts";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

const BATCH_LIMIT = 500;
// Subscription statuses where we DO bill the per-booking fee. Trial is
// deliberately excluded so trial-month bookings never charge.
const BILLABLE_STATUSES = new Set(["active", "past_due", "incomplete"]);
const TRIAL_STATUSES = new Set(["trialing"]);

function jsonRes(req, body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function verifyCronSecret(req) {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret) return true;
  return req.headers.get("x-cron-secret") === secret;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: buildCorsHeaders(req) });
  if (req.method !== "POST") return jsonRes(req, { error: "POST only" }, 405);
  if (!verifyCronSecret(req)) return jsonRes(req, { error: "unauthorized" }, 401);

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) return jsonRes(req, { error: "Stripe is not configured" }, 500);

  try {
    const { data: pendingRaw, error: pendingErr } = await supabaseAdmin
      .from("restaurant_booking_fees")
      .select("id, restaurant_id, reservation_id, amount_cents, currency")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(BATCH_LIMIT);
    if (pendingErr) {
      console.error("[bill-booking-fees] select error", pendingErr);
      return jsonRes(req, { error: pendingErr.message }, 500);
    }

    const pending = pendingRaw ?? [];
    if (pending.length === 0) {
      return jsonRes(req, { billed: 0, failed: 0, skipped: 0, trial_skipped: 0, ok: true });
    }

    const restaurantIds = Array.from(new Set(pending.map((p) => p.restaurant_id)));
    const { data: restaurantsRaw, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, stripe_customer_id, subscription_status")
      .in("id", restaurantIds);
    if (restErr) {
      console.error("[bill-booking-fees] restaurants lookup error", restErr);
      return jsonRes(req, { error: restErr.message }, 500);
    }
    const restaurantMap = new Map(
      (restaurantsRaw ?? []).map((r) => [r.id, { stripe_customer_id: r.stripe_customer_id, subscription_status: r.subscription_status }]),
    );

    const { default: Stripe } = await import("npm:stripe@17");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    let billed = 0;
    let failed = 0;
    let skipped = 0;
    let trialSkipped = 0;

    for (const fee of pending) {
      const restaurant = restaurantMap.get(fee.restaurant_id);
      const customerId = restaurant?.stripe_customer_id ?? null;
      const subStatus = restaurant?.subscription_status ?? null;

      // No Stripe customer set — leave the row pending so the next sweep
      // picks it up once the customer record gets attached (e.g. when
      // the owner finishes onboarding).
      if (!customerId) { skipped += 1; continue; }

      // Free-trial bookings: mark as terminal 'trial_skipped' so the
      // sweeper doesn't retry, and so the analytics row stays around
      // for "how many trial-period bookings did this restaurant get".
      if (subStatus && TRIAL_STATUSES.has(subStatus)) {
        const { error: trialErr } = await supabaseAdmin
          .from("restaurant_booking_fees")
          .update({ status: "trial_skipped", cancelled_at: new Date().toISOString() })
          .eq("id", fee.id)
          .eq("status", "pending");
        if (trialErr) {
          console.error("[bill-booking-fees] trial-skip update error", { fee, err: trialErr });
          failed += 1; continue;
        }
        trialSkipped += 1;
        continue;
      }

      // Any other non-billable status (paused/cancelled/ended) — leave
      // pending; ownership of the restaurant could come back later.
      if (subStatus && !BILLABLE_STATUSES.has(subStatus)) {
        skipped += 1; continue;
      }

      try {
        const item = await stripe.invoiceItems.create({
          customer: customerId,
          amount: fee.amount_cents,
          currency: fee.currency,
          description: "Cenaiva booking fee",
          metadata: {
            reservation_id: fee.reservation_id,
            restaurant_id: fee.restaurant_id,
            booking_fee_id: fee.id,
          },
        });

        const { error: updateErr } = await supabaseAdmin
          .from("restaurant_booking_fees")
          .update({
            status: "billed",
            stripe_invoice_item_id: item.id,
            billed_at: new Date().toISOString(),
          })
          .eq("id", fee.id)
          .eq("status", "pending");
        if (updateErr) {
          console.error("[bill-booking-fees] update error", { fee, err: updateErr });
          failed += 1;
          continue;
        }
        billed += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[bill-booking-fees] stripe error", { fee, message });
        await supabaseAdmin
          .from("restaurant_booking_fees")
          .update({ status: "failed", failure_reason: message.slice(0, 500) })
          .eq("id", fee.id)
          .eq("status", "pending");
        failed += 1;
      }
    }

    return jsonRes(req, { ok: true, billed, failed, skipped, trial_skipped: trialSkipped, scanned: pending.length });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[bill-booking-fees] fatal", msg);
    return jsonRes(req, { error: msg }, 500);
  }
});
