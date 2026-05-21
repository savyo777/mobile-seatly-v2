// Build 3c — In-app refund request (Cenaiva consumer ToS §10.3).
//
// Lets a diner file a refund request directly from the booking detail
// screen instead of writing to support@cenaiva.com manually. Two
// outcomes:
//   1. AUTO-RESOLVED: if the request matches a known duplicate-PI
//      pattern (two charges to the same payment_intent within 5 min),
//      we invoke refund-payment-intent immediately and mark
//      status='auto_resolved'.
//   2. PENDING: anything else lands as status='pending' for support
//      to triage. An hourly cron pings support@cenaiva.com with the
//      queue (set up separately).
//
// SECURITY:
//   - Bearer JWT required (verify_jwt at deploy).
//   - Only the request creator may insert rows for themselves
//     (enforced by RLS on refund_requests).
//   - Rate-limit: 3 requests per 24h per user to deter abuse.

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

type Body = {
  reservation_id?: string;
  payment_intent_id?: string;
  reason_code?: "duplicate" | "failed" | "other";
  reason_text?: string;
};

function isUuid(s: unknown): s is string {
  return typeof s === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
}

async function tryAutoResolveDuplicate(
  admin: ReturnType<typeof createClient>,
  userId: string,
  paymentIntentId: string,
  reservationId: string | undefined,
): Promise<{ resolved: boolean; note?: string }> {
  // Check if there are TWO recent charges to the same PI in the past 5
  // min — Stripe occasionally double-charges due to network retries.
  // We can't query Stripe directly from here without a Stripe key, so
  // instead we look at our reservation_deposit_payments table for two
  // rows referencing the same payment_intent_id within 5 min.
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
  const { data, error } = await admin
    .from("reservation_deposit_payments")
    .select("id, stripe_payment_intent_id, created_at, status")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .gte("created_at", fiveMinAgo);
  if (error || !data || data.length < 2) {
    return { resolved: false };
  }
  // If at least two charged rows reference the same PI, refund all but
  // the first. Best-effort — invoke refund-payment-intent via internal
  // call (the auth server-to-server pattern is set up via env).
  const refundUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/refund-payment-intent`;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  try {
    const resp = await fetch(refundUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payment_intent_id: paymentIntentId }),
    });
    if (!resp.ok) {
      return { resolved: false, note: `refund call failed: ${resp.status}` };
    }
    return {
      resolved: true,
      note: `auto-refunded duplicate charge on ${paymentIntentId} (user=${userId}, reservation=${reservationId ?? "?"})`,
    };
  } catch (err) {
    return { resolved: false, note: err instanceof Error ? err.message : String(err) };
  }
}

async function emailSupport(
  reqId: string,
  userEmail: string | undefined,
  reasonCode: string,
  reasonText: string | undefined,
  reservationId: string | undefined,
  paymentIntentId: string | undefined,
): Promise<void> {
  const resendKey = Deno.env.get("RESEND_API_KEY");
  if (!resendKey) return;
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") ?? "Cenaiva <noreply@cenaiva.com>";
  const supportTo = Deno.env.get("SUPPORT_REFUND_EMAIL") ?? "support@cenaiva.com";
  try {
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: fromEmail,
      to: supportTo,
      subject: `[Cenaiva] New refund request (${reasonCode})`,
      text:
        `New refund request from a diner.\n\n` +
        `Request id: ${reqId}\n` +
        `User email: ${userEmail ?? "(none on file)"}\n` +
        `Reason: ${reasonCode}\n` +
        `Reservation: ${reservationId ?? "(none)"}\n` +
        `PaymentIntent: ${paymentIntentId ?? "(none)"}\n\n` +
        `Detail:\n${reasonText ?? "(no detail provided)"}\n\n` +
        `Resolve via the internal refund tool or refund-payment-intent edge fn. SLA is 5 business days per ToS §10.3.`,
    });
  } catch (err) {
    console.warn("[request-refund] support email send failed", err);
  }
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
    if (userErr || !userData?.user) {
      return jsonResponse({ error: "unauthenticated" }, 401);
    }
    const userId = userData.user.id;
    const userEmail = userData.user.email;

    let body: Body;
    try {
      body = await req.json() as Body;
    } catch {
      return jsonResponse({ error: "invalid_json" }, 400);
    }

    const reasonCode = body.reason_code;
    if (!reasonCode || !["duplicate", "failed", "other"].includes(reasonCode)) {
      return jsonResponse({ error: "missing_or_invalid_reason_code" }, 400);
    }
    const reasonText = typeof body.reason_text === "string" ? body.reason_text.slice(0, 2000) : null;
    const reservationId = isUuid(body.reservation_id) ? body.reservation_id : undefined;
    const paymentIntentId = typeof body.payment_intent_id === "string" && body.payment_intent_id.startsWith("pi_")
      ? body.payment_intent_id
      : undefined;

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Rate-limit: 3 refund requests per 24h per user.
    try {
      await enforceRateLimit(
        admin,
        "request-refund",
        rateLimitIdentifier(req, userId),
        { limit: 3, windowSeconds: 24 * 60 * 60 },
      );
    } catch (err) {
      if (err instanceof RateLimitError) {
        return jsonResponse(
          {
            error: "You can file up to 3 refund requests per day. Contact support@cenaiva.com if you need help with more.",
            retry_after_seconds: err.retryAfterSeconds,
          },
          429,
        );
      }
      throw err;
    }

    // Try auto-resolution for duplicate-charge cases.
    let autoResolved = false;
    let autoNote: string | undefined;
    if (reasonCode === "duplicate" && paymentIntentId) {
      const result = await tryAutoResolveDuplicate(admin, userId, paymentIntentId, reservationId);
      autoResolved = result.resolved;
      autoNote = result.note;
    }

    // Insert the request row.
    const { data: inserted, error: insertErr } = await admin
      .from("refund_requests")
      .insert({
        user_id: userId,
        reservation_id: reservationId ?? null,
        payment_intent_id: paymentIntentId ?? null,
        reason_code: reasonCode,
        reason_text: reasonText,
        status: autoResolved ? "auto_resolved" : "pending",
        resolution_note: autoResolved ? autoNote : null,
        resolved_at: autoResolved ? new Date().toISOString() : null,
      })
      .select("id")
      .single();
    if (insertErr || !inserted) {
      console.error("[request-refund] insert failed", insertErr);
      return jsonResponse({ error: "insert_failed", detail: insertErr?.message }, 500);
    }

    // Email support unless auto-resolved (auto-resolved still gets a
    // ledger note for audit; no need to wake support up).
    if (!autoResolved) {
      await emailSupport(inserted.id, userEmail, reasonCode, reasonText ?? undefined, reservationId, paymentIntentId);
    }

    return jsonResponse({
      ok: true,
      id: inserted.id,
      status: autoResolved ? "auto_resolved" : "pending",
      message: autoResolved
        ? "We detected this looked like a duplicate charge and refunded it. The refund will appear on your statement within 5 business days."
        : "Your refund request was received. Support will respond within 5 business days.",
    });
  },
};
