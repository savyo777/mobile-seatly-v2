// @ts-nocheck
// Shared Stripe helpers. Previously two functions hit Stripe with two
// different API versions ("2024-06-20" in register-restaurant-owner,
// "2025-02-24.acacia" in cenaiva-orchestrate); centralizing here makes
// upgrading the API version a one-line change.
//
// Exception: `ephemeral_keys` for the mobile PaymentSheet must be
// created with a Stripe-Version the mobile SDK can interpret. The
// React Native SDK (package version 0.63.0) is built against the
// older locked API version `2024-06-20`. Mismatch → "Edge function
// returned a non-2xx status code" + Stripe rejection at the SDK
// layer. Use STRIPE_MOBILE_SDK_VERSION + stripeRequestWithVersion for
// that one call.

export const STRIPE_API_VERSION = "2025-02-24.acacia";
export const STRIPE_MOBILE_SDK_VERSION = "2024-06-20";

const STRIPE_BASE = "https://api.stripe.com/v1";

function stripeSecret(): string {
  const key = Deno.env.get("STRIPE_SECRET_KEY")?.trim() ?? "";
  if (!key) throw new Error("Missing STRIPE_SECRET_KEY.");
  return key;
}

export async function stripeRequestWithVersion(
  path: string,
  body: Record<string, string>,
  version: string,
): Promise<Record<string, unknown>> {
  const form = new URLSearchParams(body);
  const response = await fetch(`${STRIPE_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "Stripe-Version": version,
    },
    body: form.toString(),
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe request failed.");
  }
  return data;
}

export function stripeRequest(
  path: string,
  body: Record<string, string>,
): Promise<Record<string, unknown>> {
  return stripeRequestWithVersion(path, body, STRIPE_API_VERSION);
}

export async function stripeGet(path: string): Promise<Record<string, unknown>> {
  const response = await fetch(`${STRIPE_BASE}/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeSecret()}`,
      "Stripe-Version": STRIPE_API_VERSION,
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error?.message ?? "Stripe request failed.");
  }
  return data;
}
