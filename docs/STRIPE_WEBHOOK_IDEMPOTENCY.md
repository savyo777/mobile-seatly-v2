# Stripe webhook idempotency — integration guide

The `stripe-webhook` edge function lives in the **web Seatly repo** (`github.com/StevenGeorgy/Seatly`). The mobile repo provides the underlying idempotency table + RPC; the web team needs to wire the RPC into the webhook handler.

## What's already shipped (mobile repo side)

Migration `20260517XXXXXX_stripe_webhook_idempotency.sql` (applied to `exbjodmnpdiayfzrdyux`) creates:

- **Table:** `public.stripe_webhook_events (event_id text PK, event_type, received_at, request_id, source)` with RLS deny-all for everyone except service-role.
- **RPC:** `public.process_stripe_event_once(p_event_id, p_event_type, p_request_id, p_source)` returning `boolean`. Returns `true` if this is the first time we've seen this `event_id`, `false` on duplicate. Race-safe via the primary key.

## What the web team needs to add

In `supabase/functions/stripe-webhook/index.ts` (or wherever the handler lives), after Stripe signature verification succeeds but before doing any state-mutating work, call the RPC. If it returns `false`, respond `200 OK` and stop — Stripe will stop retrying.

### Drop-in snippet

```ts
import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  // ... existing CORS / method check ...

  // 1. Verify Stripe signature (existing code).
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  let event;
  try {
    event = stripe.webhooks.constructEventAsync(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET")!,
    );
  } catch (err) {
    return new Response("Invalid signature", { status: 400 });
  }

  // 2. NEW: idempotency guard. Short-circuit on duplicate event_id.
  const { data: shouldProcess, error: idempotencyErr } = await supabaseAdmin
    .rpc("process_stripe_event_once", {
      p_event_id: event.id,
      p_event_type: event.type,
      p_request_id: event.request?.id ?? null,
      p_source: "stripe-webhook",
    });
  if (idempotencyErr) {
    console.error("[stripe-webhook] idempotency RPC failed", idempotencyErr);
    // Fail closed: if we can't record the event, don't process it.
    // Stripe will retry; eventually the DB will be healthy and the
    // event lands cleanly.
    return new Response("Idempotency check failed", { status: 503 });
  }
  if (!shouldProcess) {
    // We've already processed this event. Acknowledge so Stripe
    // stops retrying.
    console.log("[stripe-webhook] duplicate event_id, short-circuiting", event.id);
    return new Response("Duplicate event, already processed", { status: 200 });
  }

  // 3. First-time-seen event — do the real work below (refund, charge
  //    update, subscription event, etc.).
  switch (event.type) {
    case "payment_intent.succeeded":
      // existing logic
      break;
    // ... other cases ...
  }

  return new Response("OK", { status: 200 });
});
```

## Why this matters

Stripe retries failed webhook deliveries up to ~3 days with the same `event_id`. Without idempotency:

- A `charge.refunded` event processed twice = refund double-applied (impossible to recover automatically).
- A `payment_intent.succeeded` event processed twice = duplicate `communication_log` rows, duplicate "your reservation is confirmed" emails to the customer.
- A `customer.subscription.deleted` event processed twice = lots of redundant cleanup work and possible cascade glitches.

The race condition matters too — if two Stripe retries arrive at the function within milliseconds, you'd get two parallel processings. The `INSERT ... ON CONFLICT DO NOTHING RETURNING true` pattern handles this atomically via the primary key — only ONE call gets `true`, all others get `false`.

## Testing

After the web team deploys the change:

1. Stripe Dashboard → Developers → Webhooks → your endpoint
2. Click **"Send test event"** → pick `payment_intent.succeeded`
3. Check response — should be 200.
4. Click **"Send test event"** again with the SAME event (Stripe lets you replay) — should get 200 again, and the function logs should say "duplicate event_id, short-circuiting".
5. SQL check:
   ```sql
   select event_id, event_type, received_at
   from public.stripe_webhook_events
   order by received_at desc limit 5;
   ```
   You should see the test event row, with `received_at` matching the FIRST delivery (not updated on the duplicate).

## Operational notes

- The table auto-purges rows older than 60 days via pg_cron.
- Service-role is the only role with EXECUTE on the RPC — anon and authenticated can't poke at the idempotency log.
- If the table is somehow lost or corrupted, the first POST-recovery Stripe retry of an in-flight event would re-process. Restore from PITR if you suspect this happened.
