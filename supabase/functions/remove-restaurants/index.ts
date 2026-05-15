import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders } from "../_shared/cors.ts";
import {
  InputValidationError,
  asUuid,
  readJsonObject,
  stripUnsafeControlChars,
  validationResponse,
} from "../_shared/input-validation.ts";
import { resolveOwnedRestaurantScope } from "../_shared/owner-restaurants.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { stripeRequest } from "../_shared/stripe.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const MAX_RESTAURANTS_PER_REQUEST = 50;

type UserRecord = {
  id: string;
};

type RestaurantRow = {
  id: string;
  name: string | null;
  stripe_subscription_id: string | null;
  settings_json: Record<string, unknown> | null;
};

type RemovalResult = {
  restaurant_id: string;
  name?: string | null;
  removed: boolean;
  subscription_cancel_at_period_end?: boolean;
  subscription_current_period_end?: string | null;
  error?: string;
};

type RemovalConfirmation = {
  phrase: string | null;
  names: Map<string, string>;
};

function json(req: Request, body: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...buildCorsHeaders(req), "Content-Type": "application/json" },
  });
}

function getBearerToken(req: Request): string {
  const authHeader = req.headers.get("Authorization") ?? "";
  return authHeader.replace(/^Bearer\s+/i, "").trim();
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return value === true;
}

function asConfirmationName(value: unknown, field: string): string {
  if (typeof value !== "string") {
    throw new InputValidationError(
      "confirmation_required",
      "Type the restaurant name exactly as shown before removing it.",
      field,
    );
  }
  const cleaned = stripUnsafeControlChars(value)
    .replace(/\r\n?/g, "\n")
    .replace(/[\n\t]+/g, " ")
    .trim();
  if (!cleaned) {
    throw new InputValidationError(
      "confirmation_required",
      "Type the restaurant name exactly as shown before removing it.",
      field,
    );
  }
  if (cleaned.length > 160) {
    throw new InputValidationError(
      "too_long",
      "Restaurant confirmation must be 160 characters or fewer.",
      field,
    );
  }
  return cleaned;
}

function settingsObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function currentPeriodEndIso(subscription: Record<string, unknown>): string | null {
  const seconds = numberOrNull(subscription.current_period_end);
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function parseRestaurantIds(body: Record<string, unknown>): string[] {
  const rawIds = body.restaurant_ids;
  if (!Array.isArray(rawIds)) {
    throw new InputValidationError(
      "invalid_restaurant_ids",
      "Choose at least one restaurant to remove.",
      "restaurant_ids",
    );
  }
  if (rawIds.length === 0) {
    throw new InputValidationError(
      "required",
      "Choose at least one restaurant to remove.",
      "restaurant_ids",
    );
  }
  if (rawIds.length > MAX_RESTAURANTS_PER_REQUEST) {
    throw new InputValidationError(
      "too_many_restaurants",
      `Remove ${MAX_RESTAURANTS_PER_REQUEST} restaurants or fewer at once.`,
      "restaurant_ids",
    );
  }
  return Array.from(new Set(rawIds.map((value, index) =>
    asUuid(value, `restaurant_ids.${index}`, { required: true })!
  )));
}

function parseRemovalConfirmation(
  body: Record<string, unknown>,
  restaurantIds: string[],
): RemovalConfirmation {
  const rawPhrase = body.confirmation_phrase
    ?? body.confirmationPhrase
    ?? body.confirmationName
    ?? body.confirmation_name;
  if (rawPhrase != null) {
    return {
      phrase: asConfirmationName(rawPhrase, "confirmationName"),
      names: new Map(),
    };
  }

  const rawNames = body.confirmation_names;
  const names = new Map<string, string>();

  if (rawNames && typeof rawNames === "object" && !Array.isArray(rawNames)) {
    const record = rawNames as Record<string, unknown>;
    for (const restaurantId of restaurantIds) {
      names.set(
        restaurantId,
        asConfirmationName(record[restaurantId], `confirmation_names.${restaurantId}`),
      );
    }
    return { phrase: null, names };
  }

  throw new InputValidationError(
    "confirmation_required",
    "Type each selected restaurant name exactly as shown before removing restaurants.",
    "confirmation_names",
  );
}

function assertConfirmationNamesMatch(
  restaurantIds: string[],
  restaurants: Map<string, RestaurantRow>,
  confirmation: RemovalConfirmation,
): void {
  const expectedNames: string[] = [];
  for (const restaurantId of restaurantIds) {
    const restaurant = restaurants.get(restaurantId);
    if (!restaurant) continue;
    const expectedName = restaurant.name?.trim();
    if (!expectedName) {
      throw new InputValidationError(
        "confirmation_mismatch",
        "Type the restaurant name exactly as shown before removing it.",
        `confirmation_names.${restaurantId}`,
      );
    }
    expectedNames.push(expectedName);
  }

  if (confirmation.phrase != null) {
    if (confirmation.phrase !== expectedNames.join(", ")) {
      throw new InputValidationError(
        "confirmation_mismatch",
        "Type the restaurant name exactly as shown before removing it.",
        "confirmationName",
      );
    }
    return;
  }

  for (const restaurantId of restaurantIds) {
    const restaurant = restaurants.get(restaurantId);
    if (!restaurant) continue;
    const expectedName = restaurant.name?.trim();
    const confirmationName = confirmation.names.get(restaurantId);
    if (!expectedName || confirmationName !== expectedName) {
      throw new InputValidationError(
        "confirmation_mismatch",
        "Type the restaurant name exactly as shown before removing it.",
        `confirmation_names.${restaurantId}`,
      );
    }
  }
}

async function getAuthenticatedUser(req: Request): Promise<UserRecord | Response> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return json(req, {
      removed: false,
      error: "Restaurant removal is not configured.",
      code: "missing_config",
    }, 503);
  }

  const accessToken = getBearerToken(req);
  if (!accessToken) {
    return json(req, {
      removed: false,
      error: "Please sign in again before removing restaurants.",
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

  if (error || !user?.id) {
    return json(req, {
      removed: false,
      error: "Please sign in again before removing restaurants.",
      code: "unauthorized",
    }, 401);
  }
  return user as UserRecord;
}

async function cancelSubscriptionAtPeriodEnd(
  subscriptionId: string | null,
): Promise<{
  requested: boolean;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: string | null;
  status: string | null;
}> {
  if (!subscriptionId) {
    return {
      requested: false,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: null,
      status: "canceled",
    };
  }

  const subscription = await stripeRequest(
    `subscriptions/${encodeURIComponent(subscriptionId)}`,
    { cancel_at_period_end: "true" },
  );

  return {
    requested: true,
    cancelAtPeriodEnd: booleanValue(subscription.cancel_at_period_end),
    currentPeriodEnd: currentPeriodEndIso(subscription),
    status: stringOrNull(subscription.status),
  };
}

async function finalizeAccess(
  authUserId: string,
  removedRestaurantIds: string[],
  remainingRestaurantIds: string[],
): Promise<void> {
  if (removedRestaurantIds.length === 0) return;

  await supabaseAdmin
    .from("user_restaurant_roles")
    .delete()
    .in("restaurant_id", removedRestaurantIds);

  if (remainingRestaurantIds.length === 0) {
    await supabaseAdmin
      .from("user_profiles")
      .update({ restaurant_id: null, role: "customer" })
      .eq("auth_user_id", authUserId);
    return;
  }

  await supabaseAdmin
    .from("user_profiles")
    .update({ restaurant_id: remainingRestaurantIds[0], role: "owner" })
    .eq("auth_user_id", authUserId)
    .in("restaurant_id", removedRestaurantIds);
}

async function fetchRestaurantsById(ids: string[]): Promise<Map<string, RestaurantRow>> {
  const { data, error } = await supabaseAdmin
    .from("restaurants")
    .select("id, name, stripe_subscription_id, settings_json")
    .in("id", ids);
  if (error) throw error;

  return new Map(
    ((data ?? []) as Array<Record<string, unknown>>).map((row) => {
      const id = stringOrNull(row.id) ?? "";
      return [id, {
        id,
        name: stringOrNull(row.name),
        stripe_subscription_id: stringOrNull(row.stripe_subscription_id),
        settings_json: settingsObject(row.settings_json),
      }];
    }).filter(([id]) => Boolean(id)) as Array<[string, RestaurantRow]>,
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: buildCorsHeaders(req) });
  if (req.method !== "POST") {
    return json(req, { removed: false, error: "Method not allowed.", code: "method_not_allowed" }, 405);
  }

  try {
    const userOrResponse = await getAuthenticatedUser(req);
    if (userOrResponse instanceof Response) return userOrResponse;

    const body = await readJsonObject(req);
    const restaurantIds = parseRestaurantIds(body);
    const confirmation = parseRemovalConfirmation(body, restaurantIds);
    const scope = await resolveOwnedRestaurantScope(userOrResponse.id);
    const ownedSet = new Set(scope.ownedRestaurantIds);
    const unauthorizedIds = restaurantIds.filter((id) => !ownedSet.has(id));
    if (unauthorizedIds.length > 0) {
      return json(req, {
        removed: false,
        error: "You can only remove restaurants that you own.",
        code: "unauthorized_restaurants",
      }, 403);
    }

    const restaurants = await fetchRestaurantsById(restaurantIds);
    assertConfirmationNamesMatch(restaurantIds, restaurants, confirmation);
    const results: RemovalResult[] = [];
    const successfulIds: string[] = [];
    const now = new Date().toISOString();

    for (const restaurantId of restaurantIds) {
      const restaurant = restaurants.get(restaurantId);
      if (!restaurant) {
        results.push({
          restaurant_id: restaurantId,
          removed: false,
          error: "Restaurant not found.",
        });
        continue;
      }

      try {
        const cancellation = await cancelSubscriptionAtPeriodEnd(restaurant.stripe_subscription_id);
        const nextSettings = {
          ...restaurant.settings_json,
          restaurantRemoval: {
            removedAt: now,
            removedBy: userOrResponse.id,
            subscriptionCancelRequestedAt: cancellation.requested ? now : null,
            subscriptionCancelAtPeriodEnd: cancellation.cancelAtPeriodEnd,
            subscriptionCurrentPeriodEnd: cancellation.currentPeriodEnd,
          },
        };

        const { error: updateError } = await supabaseAdmin
          .from("restaurants")
          .update({
            is_active: false,
            is_published: false,
            owner_user_id: null,
            stripe_payment_method_id: null,
            billing_card_brand: null,
            billing_card_last4: null,
            billing_card_exp_month: null,
            billing_card_exp_year: null,
            subscription_status: cancellation.status,
            removed_at: now,
            removed_by: userOrResponse.id,
            subscription_cancel_requested_at: cancellation.requested ? now : null,
            subscription_cancel_at_period_end: cancellation.cancelAtPeriodEnd,
            subscription_current_period_end: cancellation.currentPeriodEnd,
            settings_json: nextSettings,
          })
          .eq("id", restaurantId);
        if (updateError) throw updateError;

        successfulIds.push(restaurantId);
        results.push({
          restaurant_id: restaurantId,
          name: restaurant.name,
          removed: true,
          subscription_cancel_at_period_end: cancellation.cancelAtPeriodEnd,
          subscription_current_period_end: cancellation.currentPeriodEnd,
        });
      } catch (error) {
        results.push({
          restaurant_id: restaurantId,
          name: restaurant.name,
          removed: false,
          error: error instanceof Error ? error.message : "Could not remove restaurant.",
        });
      }
    }

    const remainingRestaurantIds = scope.ownedRestaurantIds.filter((id) => !successfulIds.includes(id));
    if (successfulIds.length > 0) {
      await finalizeAccess(userOrResponse.id, successfulIds, remainingRestaurantIds);
    }

    const failed = results.filter((result) => !result.removed).length;
    return json(req, {
      removed: successfulIds.length,
      failed,
      results,
      remaining_restaurant_ids: remainingRestaurantIds,
    });
  } catch (error) {
    const validation = validationResponse(error, buildCorsHeaders(req));
    if (validation) return validation;
    const message = error instanceof Error ? error.message : "Could not remove restaurants.";
    return json(req, { removed: false, error: message, code: "remove_failed" }, 500);
  }
});
