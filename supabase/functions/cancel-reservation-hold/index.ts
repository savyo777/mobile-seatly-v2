// @ts-nocheck
// cancel-reservation-hold — explicit user-initiated cancel (back
// button, page close beacon, "give up my hold" click).
//
// Anon-callable. Fire-and-forget on the client side via
// navigator.sendBeacon, so the response may never be observed — we
// always return ok: true unless the request itself is malformed.
// cancel_reservation_hold is idempotent (UPDATE … WHERE status IN
// ('active','converting')), so repeated calls are safe.
//
// Bug #8 hardening (2026-05-20): if the hold has a PaymentIntent
// attached (mobile minted one but never converted because
// confirm-hold-paid failed for any reason — missing identity, race,
// schema-validation hiccup), we ALSO issue a Stripe refund as part of
// cancellation. Without this, a diner could end up with a real charge
// against a hold that never became a reservation. Refund failures are
// logged but do NOT fail the cancellation — the cron expire path
// catches abandoned holds, and the FE side wants an immediate ok back.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  enforceRateLimit,
  rateLimitIdentifier,
  RateLimitError,
} from "../_shared/rate-limit.ts";
import { parseJsonBody } from "../_shared/validation/parse.ts";
import { CancelReservationHoldSchema } from "../_shared/validation/reservation-hold.ts";

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

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

// Best-effort orphan PI refund. Returns silently on any error — the
// cancellation itself already succeeded, we do NOT want to fail the
// user-facing request just because Stripe is down. The webhook +
// nightly reconciliation paths can catch stragglers.
async function refundOrphanPaymentIntent(
  paymentIntentId: string | null,
  holdId: string,
): Promise<void> {
  if (!paymentIntentId) return;
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  if (!stripeKey) {
    console.warn("[cancel-reservation-hold] no STRIPE_SECRET_KEY set, skipping refund", { holdId });
    return;
  }
  try {
    const { default: Stripe } = await import("npm:stripe@17");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    if (pi.status !== "succeeded") {
      // Nothing captured to refund — uncaptured PIs are auto-released
      // by Stripe when not captured within 7 days, no action needed.
      console.log("[cancel-reservation-hold] PI not succeeded, no refund needed", {
        holdId,
        pi_status: pi.status,
      });
      return;
    }
    // Reverse the destination charge: refund the diner AND pull the app_fee back
    // from the platform AND reverse the transfer to the restaurant. The hold
    // never became a reservation, so the restaurant owes nothing and Cenaiva
    // earned no fee.
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      reason: "requested_by_customer",
      refund_application_fee: true,
      reverse_transfer: true,
    });
    console.log("[cancel-reservation-hold] refunded orphan PI", {
      holdId,
      pi: paymentIntentId,
      refund_id: refund.id,
      amount: refund.amount,
    });
  } catch (err) {
    console.error("[cancel-reservation-hold] orphan refund failed (non-fatal)", {
      holdId,
      pi: paymentIntentId,
      err: err instanceof Error ? err.message : String(err),
    });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "POST required" }, 405);

  try {
    const parsed = await parseJsonBody(req, CancelReservationHoldSchema, {
      jsonRes: (b, s) => jsonResponse(b as Record<string, unknown>, s),
    });
    if ("response" in parsed) return parsed.response;
    const holdId = parsed.data.hold_id;

    let userProfileId: string | null = null;
    const authorization = req.headers.get("authorization");
    const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? null;
    if (token) {
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
      if (!authError && user) {
        const { data: profile } = await supabaseAdmin
          .from("user_profiles")
          .select("id")
          .eq("auth_user_id", user.id)
          .maybeSingle();
        userProfileId = profile?.id ?? null;
      }
    }

    try {
      await enforceRateLimit(
        supabaseAdmin,
        "cancel-reservation-hold:min",
        rateLimitIdentifier(req, userProfileId),
        { limit: 30, windowSeconds: 60 },
      );
    } catch (err) {
      if (err instanceof RateLimitError) {
        return jsonResponse({ error: err.message, unavailable_reason: "rate_limited" }, 429);
      }
      throw err;
    }

    // Read the hold's PI BEFORE flipping status so we still know what
    // to refund even after the cancel SQL succeeds. Also guard against
    // refunding a hold that already converted (its PI now belongs to a
    // real reservation, not orphaned).
    const { data: holdRow } = await supabaseAdmin
      .from("reservation_holds")
      .select("id, status, stripe_payment_intent_id, converted_reservation_id")
      .eq("id", holdId)
      .maybeSingle();

    const { error } = await supabaseAdmin.rpc("cancel_reservation_hold", {
      p_hold_id: holdId,
    });

    if (error) {
      console.warn("[cancel-reservation-hold] rpc error:", error.message);
    }

    // Issue refund only if:
    //   1. The hold existed
    //   2. It has a PI attached (mobile minted one mid-flow)
    //   3. It was NEVER converted (orphan charge, not legit reservation)
    //   4. SQL cancel above succeeded (status flipped from active/converting)
    // Per addendum §A6 the diner deserves their money back in this case.
    if (
      holdRow
      && holdRow.stripe_payment_intent_id
      && !holdRow.converted_reservation_id
      && !error
    ) {
      // Don't block the response — schedule it so the FE gets ok: true
      // immediately and Stripe gets called in the background.
      EdgeRuntime.waitUntil(
        refundOrphanPaymentIntent(holdRow.stripe_payment_intent_id, holdId),
      );
    }

    return jsonResponse({ ok: true });
  } catch (err) {
    return jsonResponse({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
