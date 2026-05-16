import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { jsonRes } from "../_shared/json-response.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import { CENAIVA_LIMITS } from "../_shared/cenaiva-limits.ts";
import { enforceRateLimit, rateLimitIdentifier, RateLimitError } from "../_shared/rate-limit.ts";
import {
  normalizePhoneToE164,
  readJsonObject,
  validationResponse,
} from "../_shared/input-validation.ts";

function normalizeMetadataPhone(value: unknown): string | null {
  try {
    return typeof value === "string" ? normalizePhoneToE164(value) : null;
  } catch {
    return null;
  }
}

async function findProfileUserIdByPhone(phone: string): Promise<{
  userId: string | null;
  conflict: boolean;
}> {
  const matches = new Set<string>();

  const { data: exactProfiles, error: exactError } = await supabaseAdmin
    .from("user_profiles")
    .select("auth_user_id")
    .eq("phone", phone)
    .limit(2);

  if (!exactError && exactProfiles?.length) {
    for (const profile of exactProfiles) {
      if (typeof profile.auth_user_id === "string" && profile.auth_user_id) {
        matches.add(profile.auth_user_id);
      }
    }
    if (matches.size > 1) return { userId: null, conflict: true };
    return { userId: matches.values().next().value ?? null, conflict: false };
  }

  for (let from = 0; from < 5000; from += 1000) {
    const { data: profiles, error } = await supabaseAdmin
      .from("user_profiles")
      .select("auth_user_id, phone")
      .not("phone", "is", null)
      .range(from, from + 999);
    if (error) break;

    for (const profile of profiles ?? []) {
      if (
        normalizeMetadataPhone(profile.phone) === phone &&
        typeof profile.auth_user_id === "string" &&
        profile.auth_user_id
      ) {
        matches.add(profile.auth_user_id);
        if (matches.size > 1) return { userId: null, conflict: true };
      }
    }

    if (!profiles?.length || profiles.length < 1000) break;
  }

  return { userId: matches.values().next().value ?? null, conflict: false };
}

async function findAuthUserIdByMetadataPhone(phone: string): Promise<{
  userId: string | null;
  conflict: boolean;
}> {
  const matches = new Set<string>();

  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: 100,
    });
    if (error) break;

    for (const user of data.users ?? []) {
      const metadata = user.user_metadata ?? {};
      if (normalizeMetadataPhone(metadata.phone) === phone) {
        matches.add(user.id);
        if (matches.size > 1) return { userId: null, conflict: true };
      }
    }

    if (!data.users?.length || data.users.length < 100) break;
  }

  return { userId: matches.values().next().value ?? null, conflict: false };
}

async function resolveLinkedAuthUserId(phone: string): Promise<{
  userId: string | null;
  conflict: boolean;
}> {
  const profileMatch = await findProfileUserIdByPhone(phone);
  if (profileMatch.userId || profileMatch.conflict) return profileMatch;
  return await findAuthUserIdByMetadataPhone(phone);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "Method not allowed." }, 405);

  try {
    const limit = CENAIVA_LIMITS.phoneLogin.minute;
    await enforceRateLimit(supabaseAdmin, limit.scope, rateLimitIdentifier(req), {
      limit: limit.limit,
      windowSeconds: limit.windowSeconds,
    });
  } catch (error) {
    if (error instanceof RateLimitError) {
      return new Response(
        JSON.stringify({
          linked: false,
          error: "Too many attempts. Please wait a moment and try again.",
          code: "rate_limited",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(CENAIVA_LIMITS.phoneLogin.minute.windowSeconds),
          },
        },
      );
    }
    throw error;
  }

  try {
    const body = await readJsonObject(req);
    const phone = normalizePhoneToE164(body.phone, "phone", { required: true });
    if (!phone) {
      return jsonRes({ linked: false, error: "Invalid phone number.", code: "invalid_phone" });
    }

    const linked = await resolveLinkedAuthUserId(phone);
    if (linked.conflict) {
      return jsonRes({
        linked: false,
        error: "This phone number is linked to more than one account.",
        code: "phone_link_conflict",
      });
    }
    if (!linked.userId) {
      return jsonRes({
        linked: false,
        error: "No account is linked to this phone number.",
        code: "phone_not_linked",
      });
    }

    const { data: authUser, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(linked.userId);
    if (getUserError || !authUser.user?.id || authUser.user.deleted_at) {
      return jsonRes({
        linked: false,
        error: "Linked account could not be found.",
        code: "phone_not_linked",
      });
    }

    const authPhone = normalizePhoneToE164(authUser.user.phone ?? "");
    if (authPhone && authPhone !== phone) {
      return jsonRes({
        linked: false,
        error: "This account is linked to a different verified phone number.",
        code: "phone_link_conflict",
      });
    }

    if (authPhone !== phone) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(linked.userId, {
        phone,
      });
      if (updateError) {
        return jsonRes({ linked: false, error: updateError.message, code: "phone_link_failed" });
      }
    }

    return jsonRes({ linked: true });
  } catch (error) {
    const validation = validationResponse(error, corsHeaders);
    if (validation) return validation;
    const message = error instanceof Error ? error.message : "Could not prepare SMS login.";
    return jsonRes({ linked: false, error: message, code: "phone_login_setup_failed" });
  }
});
