import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { decodeJwtPayload } from "../_shared/jwt.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { resolveOwnedRestaurantScope } from "../_shared/owner-restaurants.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripeRequest, stripeDelete } from "../_shared/stripe.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

type UserRecord = {
  id: string;
  deleted_at?: string | null;
};

type MaybeErrorResult = {
  error?: { message?: string } | null;
};

type CleanupScope = {
  profileIds: string[];
  authUserId: string;
};

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function isMaybeErrorResult(value: unknown): value is MaybeErrorResult {
  return Boolean(value && typeof value === "object" && "error" in value);
}

async function bestEffort(label: string, action: () => PromiseLike<unknown> | unknown): Promise<void> {
  try {
    const result = await action();
    if (isMaybeErrorResult(result) && result.error) {
      console.warn(`${label} failed: ${result.error.message ?? "Unknown error"}`);
    }
  } catch (error) {
    console.warn(`${label} failed:`, error);
  }
}

async function selectIds(table: string, column: string, values: string[]): Promise<string[]> {
  if (!values.length) return [];
  try {
    const { data, error } = await supabaseAdmin
      .from(table)
      .select("id")
      .in(column, values);
    if (error) {
      console.warn(`${table}.${column} lookup failed: ${error.message}`);
      return [];
    }
    return (data ?? [])
      .map((row: { id?: unknown }) => (typeof row.id === "string" ? row.id : null))
      .filter((id: string | null): id is string => Boolean(id));
  } catch (error) {
    console.warn(`${table}.${column} lookup failed:`, error);
    return [];
  }
}

async function deleteRows(table: string, column: string, values: string[]): Promise<void> {
  if (!values.length) return;
  await bestEffort(`${table} cleanup`, () =>
    supabaseAdmin
      .from(table)
      .delete()
      .in(column, values)
  );
}

async function updateRows(
  table: string,
  column: string,
  values: string[],
  patch: Record<string, unknown>,
): Promise<void> {
  if (!values.length) return;
  await bestEffort(`${table} cleanup`, () =>
    supabaseAdmin
      .from(table)
      .update(patch)
      .in(column, values)
  );
}

async function getProfileIds(authUserId: string): Promise<string[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("user_profiles")
      .select("id")
      .eq("auth_user_id", authUserId);
    if (error) {
      console.warn(`user profile lookup failed: ${error.message}`);
      return [];
    }
    return (data ?? [])
      .map((row: { id?: unknown }) => (typeof row.id === "string" ? row.id : null))
      .filter((id: string | null): id is string => Boolean(id));
  } catch (error) {
    console.warn("user profile lookup failed:", error);
    return [];
  }
}

async function scrubProfiles(profileIds: string[], authUserId: string): Promise<void> {
  if (!profileIds.length) return;
  await bestEffort("user profile scrub", () =>
    supabaseAdmin
      .from("user_profiles")
      .update({
        email: "",
        full_name: "Deleted user",
        phone: null,
      })
      .eq("auth_user_id", authUserId)
  );
}

/**
 * Detach saved Stripe payment methods + delete the Stripe customer
 * before the auth row goes away. Without this, deleted-account
 * customers + cards would linger in Stripe forever, blocking future
 * re-registrations under the same email and quietly inflating the
 * Stripe customer count. Closed in the 2026-05-17 security audit.
 *
 * Every Stripe call is wrapped in bestEffort because a missing key /
 * already-detached card / deleted-customer-then-rerun shouldn't fail
 * the user's account-delete flow (the SQL side is what matters).
 */
async function cleanupStripeArtifacts(profileIds: string[]): Promise<void> {
  if (!profileIds.length) return;

  // Saved cards table is optional — some deploys don't have it yet.
  // Tolerate "relation does not exist" and continue.
  let savedCards: Array<{ stripe_payment_method_id?: string | null; stripe_customer_id?: string | null }> = [];
  try {
    const { data, error } = await supabaseAdmin
      .from("saved_cards")
      .select("stripe_payment_method_id, stripe_customer_id")
      .in("user_profile_id", profileIds);
    if (error) {
      console.warn(`saved_cards lookup failed: ${error.message}`);
    } else if (Array.isArray(data)) {
      savedCards = data as typeof savedCards;
    }
  } catch (error) {
    console.warn("saved_cards lookup threw:", error);
  }

  const paymentMethodIds = Array.from(
    new Set(
      savedCards
        .map((row) => row.stripe_payment_method_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const customerIds = Array.from(
    new Set(
      savedCards
        .map((row) => row.stripe_customer_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  // Detach payment methods first. Stripe rejects deleting a customer
  // with attached subscriptions, but PMs can be detached at any time.
  for (const pmId of paymentMethodIds) {
    await bestEffort(`stripe detach ${pmId}`, () =>
      stripeRequest(`payment_methods/${pmId}/detach`, {}),
    );
  }

  // Cancel any active subscriptions on each customer, then delete the
  // customer. `customers/<id>?expand[]=subscriptions` is unavailable
  // via the lightweight stripeGet wrapper, so we list subs directly.
  for (const customerId of customerIds) {
    try {
      // List subscriptions for the customer (best-effort).
      const subsRes = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${encodeURIComponent(customerId)}&status=all&limit=100`,
        {
          headers: {
            Authorization: `Bearer ${Deno.env.get("STRIPE_SECRET_KEY") ?? ""}`,
            "Stripe-Version": "2025-02-24.acacia",
          },
        },
      );
      if (subsRes.ok) {
        const subsBody = (await subsRes.json()) as { data?: Array<{ id?: string; status?: string }> };
        for (const sub of subsBody.data ?? []) {
          if (!sub.id) continue;
          if (sub.status === "canceled" || sub.status === "incomplete_expired") continue;
          await bestEffort(`stripe cancel sub ${sub.id}`, () =>
            stripeDelete(`subscriptions/${sub.id}`),
          );
        }
      }
    } catch (error) {
      console.warn(`stripe subscriptions lookup failed for ${customerId}:`, error);
    }
    await bestEffort(`stripe delete customer ${customerId}`, () =>
      stripeDelete(`customers/${customerId}`),
    );
  }
}

async function cleanupProfileData(profileIds: string[], authUserId: string): Promise<void> {
  // Stripe cleanup happens FIRST — once auth + saved_cards rows are
  // gone the customer/PM IDs would be lost and we'd never be able to
  // reach them again.
  await cleanupStripeArtifacts(profileIds);

  const conversationIds = await selectIds("chat_conversations", "user_profile_id", profileIds);
  await deleteRows("chat_messages", "conversation_id", conversationIds);
  await deleteRows("chat_conversations", "id", conversationIds);
  await deleteRows("ai_conversations", "user_id", [authUserId]);

  await deleteRows("saved_cards", "user_profile_id", profileIds);
  await deleteRows("payments", "user_profile_id", profileIds);
  await deleteRows("notifications", "user_profile_id", profileIds);
  await deleteRows("availability_alerts", "user_profile_id", profileIds);
  await deleteRows("waitlist", "user_profile_id", profileIds);
  await deleteRows("user_restaurant_roles", "user_id", profileIds);
  await updateRows("expenses", "created_by", profileIds, { created_by: null });
  await updateRows("accountant_exports", "created_by", profileIds, { created_by: null });
  await updateRows("guests", "preferred_server_id", profileIds, { preferred_server_id: null });

  const guestIds = await selectIds("guests", "user_profile_id", profileIds);
  const orderIds = await selectIds("orders", "guest_id", guestIds);
  await deleteRows("payments", "order_id", orderIds);
  await deleteRows("order_items", "order_id", orderIds);
  await deleteRows("orders", "id", orderIds);
  await deleteRows("reservations", "guest_id", guestIds);
  await deleteRows("guests", "id", guestIds);
  await deleteRows("visit_photos", "user_id", [authUserId]);
  await deleteRows("post_turn_visit_requests", "user_id", [authUserId]);
  await deleteRows("cenaiva_feedback", "user_id", [authUserId]);

  await scrubProfiles(profileIds, authUserId);
  await deleteRows("user_profiles", "id", profileIds);
}

async function resolveCleanupScope(authUserId: string): Promise<CleanupScope> {
  return {
    profileIds: await getProfileIds(authUserId),
    authUserId,
  };
}

function runCleanupAfterResponse(scopePromise: Promise<CleanupScope>): void {
  void scopePromise
    .then((scope) => cleanupProfileData(scope.profileIds, scope.authUserId))
    .catch((error) => console.warn("delete-account cleanup failed:", error));
}

async function getAuthenticatedUser(req: Request): Promise<UserRecord | Response> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonRes({
      deleted: false,
      error: "Account deletion is not configured.",
      code: "missing_config",
    }, 503);
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return jsonRes({
      deleted: false,
      error: "Please sign in again before deleting your account.",
      code: "unauthorized",
    }, 401);
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();

  if ((user as UserRecord | null)?.deleted_at) {
    return jsonRes({ deleted: true, alreadyDeleted: true });
  }
  if (error || !user?.id) {
    const payload = decodeJwtPayload(accessToken);
    const authUserId = typeof payload?.sub === "string" ? payload.sub : "";
    if (authUserId) {
      const { data } = await supabaseAdmin.auth.admin.getUserById(authUserId);
      if ((data.user as UserRecord | null)?.deleted_at) {
        return jsonRes({ deleted: true, alreadyDeleted: true });
      }
    }
    return jsonRes({
      deleted: false,
      error: "Please sign in again before deleting your account.",
      code: "unauthorized",
    }, 401);
  }

  return user as UserRecord;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonRes({ deleted: false, error: "Method not allowed.", code: "method_not_allowed" }, 405);
  }

  try {
    const userOrResponse = await getAuthenticatedUser(req);
    if (userOrResponse instanceof Response) return userOrResponse;

    const ownerScope = await resolveOwnedRestaurantScope(userOrResponse.id);
    if (ownerScope.ownedRestaurantIds.length > 0) {
      return jsonRes({
        deleted: false,
        error: "Remove your restaurants before deleting this owner account.",
        code: "restaurants_remaining",
        restaurant_ids: ownerScope.ownedRestaurantIds,
      }, 409);
    }

    const cleanupScope = resolveCleanupScope(userOrResponse.id);

    // Soft delete avoids FK failures while Supabase anonymizes auth email/phone
    // so the person can register again with the same credentials later.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userOrResponse.id, true);
    if (error) {
      return jsonRes({
        deleted: false,
        error: error.message,
        code: "delete_failed",
      }, 400);
    }

    runCleanupAfterResponse(cleanupScope);
    return jsonRes({ deleted: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not delete account.";
    return jsonRes({ deleted: false, error: message, code: "delete_failed" }, 500);
  }
});
