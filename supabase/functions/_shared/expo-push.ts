// @ts-nocheck
// Expo push notification helper. Posts to https://exp.host/--/api/v2/push/send,
// chunks ≤100 messages per request, filters to valid ExponentPushToken[...]
// values, and NEVER throws — mirrors _shared/sms.ts so a push failure can't
// derail the parent edge fn (booking create / reminder / waitlist ready / etc.).
//
// Receipt polling deferred to post-MVP: when Expo eventually reports a token
// as `DeviceNotRegistered`, we should null it on user_profiles to stop
// re-pushing. For now we only log the ticket result (delivered to Expo's
// queue). Add a follow-up cron `expo-push-receipts-cron` to handle cleanup.
//
// Usage: see send-post-turn-review-prompts, send-reservation-reminders,
// send-waitlist-ready-sms, create-public-booking for the four call sites.

export type ExpoPushKind =
  | "booking_confirmed"
  | "reservation_reminder"
  | "waitlist_ready"
  | "review_request";

export interface ExpoPushDataPayload {
  kind: ExpoPushKind;
  reservationId?: string;
  restaurantId?: string;
  bookingId?: string;
  waitlistId?: string;
}

export interface ExpoPushMessage {
  /** Expo push tokens (`ExponentPushToken[xxx]`). Invalid tokens are filtered out. */
  tokens: (string | null | undefined)[];
  title: string;
  body: string;
  data: ExpoPushDataPayload;
  /** Android notification channel id. Defaults to 'default'. */
  channelId?: string;
  /** iOS badge increment. Omit to leave badge untouched. */
  badge?: number;
  /** Defaults to 'default'. Pass null to send silently. */
  sound?: "default" | null;
}

export interface ExpoPushTicket {
  id?: string;
  status: "ok" | "error";
  message?: string;
  details?: { error?: string };
}

export interface ExpoPushResult {
  tickets: ExpoPushTicket[];
  sentCount: number;
  errorCount: number;
}

const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
const EXPO_TOKEN_PATTERN = /^ExponentPushToken\[[A-Za-z0-9_-]+\]$/;
const MAX_BATCH_SIZE = 100;

function isValidExpoToken(value: string | null | undefined): value is string {
  return typeof value === "string" && EXPO_TOKEN_PATTERN.test(value);
}

function chunk<T>(items: T[], size: number): T[][] {
  if (items.length <= size) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

export async function sendExpoPush(msg: ExpoPushMessage): Promise<ExpoPushResult> {
  const validTokens = (msg.tokens ?? []).filter(isValidExpoToken);
  if (validTokens.length === 0) {
    return { tickets: [], sentCount: 0, errorCount: 0 };
  }

  // Build one message per token. Expo accepts an array of messages in a
  // single request; multiple tokens per message also works but per-token
  // messages give us cleaner per-token tickets back.
  const messages = validTokens.map((token) => ({
    to: token,
    sound: msg.sound === null ? null : (msg.sound ?? "default"),
    title: msg.title,
    body: msg.body,
    data: msg.data,
    channelId: msg.channelId ?? "default",
    ...(typeof msg.badge === "number" ? { badge: msg.badge } : {}),
  }));

  const tickets: ExpoPushTicket[] = [];
  let sentCount = 0;
  let errorCount = 0;

  for (const batch of chunk(messages, MAX_BATCH_SIZE)) {
    try {
      const response = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept-Encoding": "gzip, deflate",
          Accept: "application/json",
        },
        body: JSON.stringify(batch),
      });

      const json = await response.json().catch(() => null);
      if (!response.ok || !json) {
        // Whole batch rejected. Mark each message as errored.
        for (let i = 0; i < batch.length; i++) {
          tickets.push({ status: "error", message: `HTTP ${response.status}` });
          errorCount += 1;
        }
        console.error("[expo-push] batch failed", response.status, json);
        continue;
      }

      const batchTickets: ExpoPushTicket[] = Array.isArray(json.data)
        ? json.data
        : [];
      for (const ticket of batchTickets) {
        tickets.push(ticket);
        if (ticket?.status === "ok") sentCount += 1;
        else errorCount += 1;
      }
      // Defensive: if Expo returned fewer tickets than messages, pad errors.
      while (tickets.length < (Math.ceil(messages.length / MAX_BATCH_SIZE) - 1) * MAX_BATCH_SIZE + batch.length) {
        tickets.push({ status: "error", message: "missing_ticket" });
        errorCount += 1;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[expo-push] fetch threw", message);
      for (let i = 0; i < batch.length; i++) {
        tickets.push({ status: "error", message });
        errorCount += 1;
      }
    }
  }

  return { tickets, sentCount, errorCount };
}
