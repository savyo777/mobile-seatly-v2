import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// create-onboarding-link
//
// Returns a Stripe Account Link URL for the restaurant's Connect Express
// onboarding. The mobile app opens this URL in a Safari/Chrome session
// (expo-web-browser.openAuthSessionAsync) and Stripe redirects back via
// the cenaiva:// scheme when the diner finishes or bails.
//
// Auth: caller must be an owner of the restaurant. JWT decoded server-side.
// Per MOBILE_STRIPE_TRANSFER.md §C2 (Safari-popup Connect flow).
//
// Body:  { restaurant_id }
// Returns: { url, expires_at, account_id }
//
// Side-effect: if the restaurant has no stripe_account_id yet, this fn
// creates an Express account and stamps the row before minting the link.
// That keeps the mobile owner-side from needing two round-trips just to
// kick off onboarding.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonRes(body: unknown, status = 200): Response {
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

async function isOwner(authUserId: string, restaurantId: string): Promise<boolean> {
  const { data: profile } = await supabaseAdmin
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (!profile) return false;
  const { data: role } = await supabaseAdmin
    .from("user_restaurant_roles")
    .select("role")
    .eq("user_id", (profile as { id: string }).id)
    .eq("restaurant_id", restaurantId)
    .eq("role", "owner")
    .maybeSingle();
  return Boolean(role);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonRes({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
    if (!token) return jsonRes({ error: "Missing authorization token" }, 401);

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError || !user) return jsonRes({ error: "Invalid or expired session" }, 401);

    const payload = (await req.json().catch(() => ({}))) as { restaurant_id?: unknown };
    const restaurantId =
      typeof payload.restaurant_id === "string" && payload.restaurant_id.trim()
        ? payload.restaurant_id.trim()
        : null;
    if (!restaurantId) return jsonRes({ error: "restaurant_id is required" }, 400);

    if (!(await isOwner(user.id, restaurantId))) {
      return jsonRes({ error: "Not authorized for this restaurant" }, 403);
    }

    const { data: restaurantRow, error: restErr } = await supabaseAdmin
      .from("restaurants")
      .select("id, name, email, stripe_account_id")
      .eq("id", restaurantId)
      .maybeSingle();
    if (restErr || !restaurantRow) return jsonRes({ error: "Restaurant not found" }, 404);

    const restaurant = restaurantRow as {
      id: string;
      name: string | null;
      email: string | null;
      stripe_account_id: string | null;
    };

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) return jsonRes({ error: "Stripe is not configured on the server" }, 500);

    const { default: Stripe } = await import("npm:stripe@17");
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    let accountId = restaurant.stripe_account_id;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "CA",
        email: restaurant.email ?? undefined,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: restaurant.name ?? undefined,
          mcc: "5812",
        },
        metadata: { restaurant_id: restaurant.id, platform: "cenaiva" },
      });
      accountId = account.id;
      const { error: stampErr } = await supabaseAdmin
        .from("restaurants")
        .update({ stripe_account_id: accountId })
        .eq("id", restaurant.id);
      if (stampErr) return jsonRes({ error: stampErr.message }, 500);
    }

    // Stripe rejects non-http(s) URLs in accountLinks.create (the
    // `cenaiva://` deep link returns `url_invalid`), so the return /
    // refresh URLs point at the stripe-connect-redirect bounce edge fn
    // which 302s to the matching `cenaiva://stripe/connect/...` deep
    // link. expo-web-browser.openAuthSessionAsync on mobile detects
    // that scheme transition and resolves with type='success'.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const bounceBase = `${supabaseUrl.replace(/\/$/, "")}/functions/v1/stripe-connect-redirect`;
    const link = await stripe.accountLinks.create({
      account: accountId!,
      refresh_url: `${bounceBase}?action=refresh&restaurant_id=${encodeURIComponent(restaurant.id)}`,
      return_url: `${bounceBase}?action=return&restaurant_id=${encodeURIComponent(restaurant.id)}`,
      type: "account_onboarding",
    });

    return jsonRes({
      url: link.url,
      expires_at: link.expires_at,
      account_id: accountId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return jsonRes({ error: msg }, 500);
  }
});
