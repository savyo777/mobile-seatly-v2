// @ts-nocheck
// Shared SMS / email dispatch for transactional notifications.
//
// Twilio + Resend credentials are server-only. Callers pass intent
// (phone, email, body, subject) and we pick the best channel — SMS
// first, email fallback, both optional. Never throws to the caller:
// dispatching a notification must not crash the booking / cancel /
// reminder flow.

import { Resend } from "npm:resend@4.0.0";
import twilio from "npm:twilio@5.0.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { normalizePhoneToE164 } from "./phone.ts";

type TwilioClient = ReturnType<typeof twilio>;

export type SmsChannel = "sms" | "email" | null;
export type SmsStatus = "sent" | "skipped" | "failed";

export type SmsOrEmailResult = {
  channel: SmsChannel;
  status: SmsStatus;
  error?: string;
};

export type CommunicationType =
  | "reservation_confirmation"
  | "reservation_reminder_24h"
  | "waitlist_ready"
  | (string & {});

/**
 * Sanitize a user-controlled field (guest_name, restaurant_name, etc.)
 * before it's interpolated into an SMS body or email subject/body.
 *
 *  1. Strips ASCII control characters (incl. CR/LF/TAB) — no SMTP
 *     header smuggling, no SMS body interleaving. Built from a string
 *     via the RegExp constructor so the escape sequences survive
 *     editor / tool round-trips that would otherwise collapse the
 *     literal control bytes inside a regex character class.
 *  2. Replaces http/https URLs that aren't cenaiva.com with the
 *     literal "[link removed]" — no phishing payloads piggy-backed
 *     on legitimate notifications.
 *  3. Collapses runs of whitespace.
 *  4. Caps length at 64 chars.
 *
 * Added 2026-05-17 in response to the security audit P1 finding:
 * guest_name was interpolated directly into the SMS body so a guest
 * named "Click here for free pizza: http://evil.tld" could phish
 * other guests via the restaurant's outgoing reservation reminders.
 */
const CTRL_CHARS_RE = new RegExp("[\\u0000-\\u001F\\u007F]+", "g");

export function sanitizeForSmsField(value: string | null | undefined): string {
  if (!value) return "";
  let s = String(value);
  s = s.replace(CTRL_CHARS_RE, " ");
  s = s.replace(
    /https?:\/\/(?!(?:[a-z0-9-]+\.)*cenaiva\.com)[^\s]+/gi,
    "[link removed]",
  );
  s = s.replace(/\s+/g, " ").trim();
  if (s.length > 64) s = s.slice(0, 64).trim();
  return s;
}

function readTwilioEnv(): { sid: string; token: string; from: string } | null {
  const sid = Deno.env.get("TWILIO_ACCOUNT_SID");
  const token = Deno.env.get("TWILIO_AUTH_TOKEN");
  const from = Deno.env.get("TWILIO_PHONE_NUMBER");
  if (!sid || !token || !from) return null;
  return { sid, token, from };
}

export function getTwilioClient(): { client: TwilioClient; from: string } | null {
  const env = readTwilioEnv();
  if (!env) return null;
  try {
    const client = twilio(env.sid, env.token);
    return { client, from: env.from };
  } catch {
    return null;
  }
}

function getResendClient(): { resend: Resend; from: string } | null {
  const key = Deno.env.get("RESEND_API_KEY");
  if (!key) return null;
  const from = Deno.env.get("RESEND_FROM_EMAIL") ?? "Cenaiva <noreply@cenaiva.com>";
  try {
    return { resend: new Resend(key), from };
  } catch {
    return null;
  }
}

/**
 * Try SMS first, fall back to email. Returns the channel actually used
 * and whether the send succeeded. Never throws — the parent flow must
 * not be derailed by a notification failure.
 *
 * Phone is re-normalized to E.164 inside this helper so callers can pass
 * raw user input without pre-processing.
 */
export async function sendSmsOrEmail(args: {
  phone: string | null | undefined;
  email: string | null | undefined;
  smsBody: string;
  emailSubject: string;
  emailBody: string;
}): Promise<SmsOrEmailResult> {
  const { phone, email, smsBody, emailSubject, emailBody } = args;

  let smsError: string | undefined;
  const normalizedPhone = phone ? normalizePhoneToE164(String(phone).trim()) : null;
  const twilio = normalizedPhone ? getTwilioClient() : null;
  if (normalizedPhone && twilio) {
    try {
      await twilio.client.messages.create({
        body: smsBody,
        from: twilio.from,
        to: normalizedPhone,
      });
      return { channel: "sms", status: "sent" };
    } catch (err) {
      smsError = err instanceof Error ? err.message : String(err);
      console.error("[sms] Twilio send failed", smsError);
      // fall through to email fallback below
    }
  }

  if (email) {
    const resend = getResendClient();
    if (resend) {
      try {
        await resend.resend.emails.send({
          from: resend.from,
          to: email,
          subject: emailSubject,
          text: emailBody,
        });
        return { channel: "email", status: "sent" };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error("[sms] Resend send failed", message);
        return { channel: "email", status: "failed", error: message };
      }
    }
  }

  // Nothing to send through. Either no phone/email, or providers unconfigured.
  if (smsError) {
    return { channel: "sms", status: "failed", error: smsError };
  }
  return { channel: null, status: "skipped" };
}

/**
 * Insert a row into `communication_log`. Never throws — logging failures
 * must not break the parent flow. Errors go to stderr for ops visibility.
 *
 * Column shape matches the existing insert in create-public-booking, which
 * has been writing to this table in production. We mirror it exactly so a
 * single dashboard query covers every notification type.
 */
export async function logCommunication(args: {
  supabase: SupabaseClient;
  guest_id: string | null;
  restaurant_id: string;
  channel: SmsChannel;
  type: CommunicationType;
  subject: string;
  body: string;
  status: SmsStatus;
  campaign_id?: string | null;
}): Promise<void> {
  try {
    await args.supabase.from("communication_log").insert({
      guest_id: args.guest_id,
      restaurant_id: args.restaurant_id,
      channel: args.channel,
      type: args.type,
      subject: args.subject,
      body: args.body,
      status: args.status,
      sent_at: args.status === "sent" ? new Date().toISOString() : null,
      campaign_id: args.campaign_id ?? null,
    });
  } catch (err) {
    console.error("[sms] communication_log insert failed", err);
  }
}
