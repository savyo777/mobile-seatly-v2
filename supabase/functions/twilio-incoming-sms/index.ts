// Build 3a — Twilio inbound-SMS webhook for STOP/HELP/UNSUBSCRIBE
// handling. Required for TCPA compliance per Cenaiva consumer ToS §15.
//
// HOW TO REGISTER THIS WEBHOOK (one-time manual ops step):
//   1. Twilio Console → Phone Numbers → Manage → Active numbers
//   2. Click the Cenaiva number (from TWILIO_PHONE_NUMBER env)
//   3. Messaging → "A message comes in" → Webhook
//      URL: https://exbjodmnpdiayfzrdyux.supabase.co/functions/v1/twilio-incoming-sms
//      HTTP: POST
//   4. Save. Twilio will form-POST every inbound SMS to this URL.
//
// REQUEST SHAPE (Twilio sends application/x-www-form-urlencoded):
//   From=%2B14165551234  (E.164)
//   Body=STOP            (raw text)
//   ...plus many other Twilio fields we ignore
//
// RESPONSE: TwiML <Response> with optional <Message> reply.
//   - STOP / UNSUBSCRIBE / CANCEL / END / QUIT: set sms_opt_out=true,
//     no reply (Twilio auto-replies per its built-in handler).
//   - HELP / INFO: reply with help text (we override Twilio's default
//     to surface the support email).
//   - START / UNSTOP / YES: set sms_opt_out=false (re-subscribe).
//   - Anything else: ignore silently.
//
// SECURITY: Twilio signature validation is MANDATORY. Without it, any
// caller could POST `From=<victim>&Body=STOP` and force-opt-out a user
// from SMS. We enforce TWILIO_AUTH_TOKEN being set at boot (fail-closed)
// and reject any request whose X-Twilio-Signature header doesn't match
// the HMAC-SHA1 of (request_url + sorted_form_params) keyed by the
// auth token. Previously the validation was conditional — that's the
// 2026-05-22 security-audit fix.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// Twilio signature scheme:
//   1. Take the full URL of the request (incl. query string).
//   2. Sort POST form params alphabetically by key.
//   3. Concatenate: URL + each (key + value) in sorted order.
//   4. HMAC-SHA1 with TWILIO_AUTH_TOKEN as the key, base64-encode.
//   5. Compare to the X-Twilio-Signature header.
// Docs: https://www.twilio.com/docs/usage/security#validating-requests
async function isValidTwilioSignature(
  url: string,
  formParams: URLSearchParams,
  signature: string,
  authToken: string,
): Promise<boolean> {
  const sortedKeys = Array.from(new Set(Array.from(formParams.keys()))).sort();
  let stringToSign = url;
  for (const k of sortedKeys) {
    // Twilio joins multi-value params, but inbound SMS webhooks never
    // include duplicates — take the first value to match canonical form.
    stringToSign += k + (formParams.get(k) ?? "");
  }

  const enc = new TextEncoder();
  const keyData = await crypto.subtle.importKey(
    "raw",
    enc.encode(authToken),
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", keyData, enc.encode(stringToSign));
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // Constant-time compare to defeat timing side-channels (matters less
  // for a base64 sig but free to do right).
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

const TWIML_HEADERS = { "Content-Type": "application/xml; charset=utf-8" };
const STOP_KEYWORDS = new Set(["STOP", "UNSUBSCRIBE", "CANCEL", "END", "QUIT"]);
const START_KEYWORDS = new Set(["START", "UNSTOP", "YES"]);
const HELP_KEYWORDS = new Set(["HELP", "INFO"]);

const HELP_REPLY =
  "Cenaiva: For help, visit cenaiva.com/help or email support@cenaiva.com. Reply STOP to unsubscribe.";

function twiml(messageBody?: string): Response {
  if (!messageBody) {
    return new Response("<Response/>", { status: 200, headers: TWIML_HEADERS });
  }
  // Escape & to &amp; so the XML stays valid; nothing else needs escaping
  // for our help text.
  const safe = messageBody.replace(/&/g, "&amp;");
  return new Response(
    `<Response><Message>${safe}</Message></Response>`,
    { status: 200, headers: TWIML_HEADERS },
  );
}

function getServiceClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function setOptOut(phoneE164: string, optOut: boolean): Promise<void> {
  const supabase = getServiceClient();
  if (!supabase) {
    console.error("[twilio-incoming-sms] supabase client not configured");
    return;
  }
  // Match on the stored E.164 phone. Some legacy rows may store the
  // number without the leading + — tolerate both.
  const candidates = phoneE164.startsWith("+")
    ? [phoneE164, phoneE164.slice(1)]
    : [phoneE164, `+${phoneE164}`];
  const { error } = await supabase
    .from("user_profiles")
    .update({ sms_opt_out: optOut })
    .in("phone", candidates);
  if (error) {
    console.error("[twilio-incoming-sms] update sms_opt_out failed", {
      phone: phoneE164,
      optOut,
      error: error.message,
    });
  } else {
    console.info("[twilio-incoming-sms] sms_opt_out updated", {
      phoneTail: phoneE164.slice(-4),
      optOut,
    });
  }
}

export default {
  async fetch(req: Request): Promise<Response> {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // MANDATORY signature validation. Fail-closed: if auth token isn't
    // configured on this deployment we MUST refuse all inbound traffic,
    // because the alternative is letting anyone force-opt-out users.
    const authToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    if (!authToken) {
      console.error("[twilio-incoming-sms] TWILIO_AUTH_TOKEN not configured — refusing all inbound");
      return new Response("Service misconfigured", { status: 503 });
    }

    let form: URLSearchParams;
    let rawBody: string;
    try {
      rawBody = await req.text();
      form = new URLSearchParams(rawBody);
    } catch (err) {
      console.error("[twilio-incoming-sms] parse failed", err);
      return twiml(); // empty response — don't expose internals to spoofed callers
    }

    const signature = req.headers.get("x-twilio-signature");
    if (!signature) {
      console.warn("[twilio-incoming-sms] missing X-Twilio-Signature header");
      return new Response("Unauthorized", { status: 401 });
    }

    // The URL Twilio signed against is the EXACT URL configured in the
    // Twilio Console, including query string. If you've put the function
    // behind a custom domain or proxy, set TWILIO_WEBHOOK_URL_OVERRIDE
    // to that public URL so the HMAC matches what Twilio computed.
    const signedUrl = Deno.env.get("TWILIO_WEBHOOK_URL_OVERRIDE") ?? req.url;
    const valid = await isValidTwilioSignature(signedUrl, form, signature, authToken);
    if (!valid) {
      console.warn("[twilio-incoming-sms] signature mismatch", { url: signedUrl, sigTail: signature.slice(-8) });
      return new Response("Unauthorized", { status: 401 });
    }

    const from = form.get("From") ?? "";
    const body = (form.get("Body") ?? "").trim().toUpperCase();
    if (!from || !body) return twiml();

    // First word only — Twilio's TCPA-compliance docs require us to
    // accept any message that BEGINS with STOP/HELP/etc.
    const keyword = body.split(/\s+/)[0] ?? "";

    if (STOP_KEYWORDS.has(keyword)) {
      await setOptOut(from, true);
      // No reply — Twilio sends a default "You have been unsubscribed"
      // reply automatically on STOP keywords, which satisfies TCPA.
      return twiml();
    }
    if (START_KEYWORDS.has(keyword)) {
      await setOptOut(from, false);
      return twiml(
        "Cenaiva: You're re-subscribed to transactional SMS. Reply STOP to unsubscribe.",
      );
    }
    if (HELP_KEYWORDS.has(keyword)) {
      return twiml(HELP_REPLY);
    }

    // Unknown inbound — ignore silently. Don't reply to arbitrary text
    // since that could be perceived as harassment / auto-responder spam.
    return twiml();
  },
};
