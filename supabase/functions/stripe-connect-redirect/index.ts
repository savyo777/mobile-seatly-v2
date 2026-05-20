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

function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

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
  const safeUrl = escapeAttr(deepLink);
  // Inline JS does the bounce on iOS/Android Safari/Chrome Custom Tab.
  // The <noscript> fallback + the meta refresh covers the JS-disabled
  // case, and the visible link gives the owner a manual tap target if
  // both bounce attempts fail.
  const html = `<!doctype html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Returning to Cenaiva…</title>
<meta http-equiv="refresh" content="0;url=${safeUrl}">
<style>body{font-family:-apple-system,system-ui,sans-serif;padding:48px;background:#0a0a0a;color:#f5f5f5;text-align:center}a{color:#c9a84c;font-weight:600}</style>
</head><body>
<p>Returning to Cenaiva…</p>
<p><a href="${safeUrl}">Tap here if nothing happens</a></p>
<script>window.location.replace(${JSON.stringify(deepLink)});</script>
</body></html>`;

  return new Response(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
});
