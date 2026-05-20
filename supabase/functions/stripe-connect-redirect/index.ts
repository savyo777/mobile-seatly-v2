// @ts-nocheck
// stripe-connect-redirect
//
// Stripe's accountLinks.create rejects non-http(s) URLs with
// `Not a valid URL`, so the mobile Connect onboarding flow can't pass
// the `cenaiva://stripe/connect/return` deep link directly to Stripe as
// `return_url`. This anon-callable HTTPS endpoint exists solely to act
// as the http→deep-link bounce: Stripe sends the owner here, we serve a
// tiny HTML page that immediately `window.location.replace`s to the
// real `cenaiva://...` scheme so iOS/Android open the app.
//
// GET https://<project>.supabase.co/functions/v1/stripe-connect-redirect?action=return&restaurant_id=<id>
//   -> 200 text/html that redirects to cenaiva://stripe/connect/return?restaurant_id=<id>
//
// `action` must be `return` or `refresh` (matches the deep links the
// mobile app already handles).

const ALLOWED_ACTIONS = new Set(["return", "refresh"]);

Deno.serve((req: Request) => {
  if (req.method !== "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  const url = new URL(req.url);
  const action = (url.searchParams.get("action") ?? "return").trim();
  if (!ALLOWED_ACTIONS.has(action)) {
    return new Response("Bad request", { status: 400 });
  }

  const passthrough = new URLSearchParams();
  const restaurantId = url.searchParams.get("restaurant_id");
  if (restaurantId) passthrough.set("restaurant_id", restaurantId);

  const deepLink = `cenaiva://stripe/connect/${action}${passthrough.toString() ? `?${passthrough}` : ""}`;

  // Native HTTP 302 to the cenaiva:// deep link. Supabase Edge Functions
  // strip text/html responses to text/plain and apply a `default-src
  // 'none'; sandbox` CSP, so meta-refresh + inline JS bounce HTML
  // rendered as raw source instead of redirecting. iOS Safari View
  // Controller / Android Chrome Custom Tab honor a 302 Location pointing
  // at a custom scheme — the browser hands the deep link to the OS and
  // expo-web-browser.openAuthSessionAsync resolves with type='success'.
  return new Response(null, {
    status: 302,
    headers: {
      Location: deepLink,
      "Cache-Control": "no-store",
    },
  });
});
