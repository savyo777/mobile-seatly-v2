// @ts-nocheck
// Receipt scanner v1 — extracts header-level data from a photo of a paper
// receipt. Called by the mobile app's expense-review screen on mount with
// a base64-encoded image. Returns a draft `Expense` for the owner to
// review and save. Never writes to the DB.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkAuth } from "../_shared/auth.ts";
import { callOpenAIVision } from "../_shared/openai.ts";

type Body = {
  image_base64?: unknown;
  image_mime_type?: unknown;
};

const EXPENSE_CATEGORY_KEYS = [
  "food_beverage",
  "alcohol",
  "fuel",
  "utilities",
  "repairs",
  "supplies",
  "marketing",
  "other",
] as const;

const SYSTEM_PROMPT = `You are a receipt-extraction assistant for a restaurant accounting app.
Your job is to read a single paper-receipt photo and return structured JSON.

Rules:
- Money fields are integer cents. $12.34 -> 1234. Never include dollar signs or decimals in the output.
- expense_date must be ISO YYYY-MM-DD if visible on the receipt; otherwise null.
- currency is an ISO 4217 code (USD, CAD, EUR, GBP, ...). Default to USD only if you see a "$" without other context.
- category MUST be one of: food_beverage, alcohol, fuel, utilities, repairs, supplies, marketing, other. Pick the best match for the vendor.
  - food_beverage: groceries, produce, meat, fish, bakery, coffee/dairy, bulk food suppliers (Costco for food, Sysco, US Foods, restaurant supply, farmers markets).
  - alcohol: liquor stores, beer/wine/spirits distributors.
  - fuel: gas stations (Shell, Chevron, BP, Costco gas, etc.).
  - utilities: power, gas, water, internet, telecom.
  - repairs: hardware stores, plumber, electrician, HVAC, equipment service.
  - supplies: cleaning, paper goods, office supplies, takeout containers, kitchen smallware.
  - marketing: ads, printing, signage, promotions, PR.
  - other: anything that doesn't fit cleanly above.
- payment_method: 'card' if a card brand or last-4 is visible, 'cash' if explicitly cash, 'other' otherwise. null if unknown.
- payment_method_last4: only the last 4 digits as a 4-character string, or null.
- vendor: the merchant's display name as it appears on the receipt (e.g. "Shell #1234", "Sysco Foodservice"). Trim weird artifacts.
- If you cannot read a field, return null for that field. Do NOT guess.
- If the image is not a receipt at all, return all nulls except total_cents which should also be null.`;

const RECEIPT_SCHEMA = {
  name: "expense_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "vendor",
      "expense_date",
      "subtotal_cents",
      "tax_cents",
      "tip_cents",
      "total_cents",
      "currency",
      "category",
      "payment_method",
      "payment_method_last4",
    ],
    properties: {
      vendor: { type: ["string", "null"] },
      expense_date: { type: ["string", "null"] },
      subtotal_cents: { type: ["integer", "null"] },
      tax_cents: { type: ["integer", "null"] },
      tip_cents: { type: ["integer", "null"] },
      total_cents: { type: ["integer", "null"] },
      currency: { type: ["string", "null"] },
      category: {
        type: ["string", "null"],
        enum: [...EXPENSE_CATEGORY_KEYS, null],
      },
      payment_method: {
        type: ["string", "null"],
        enum: ["card", "cash", "other", null],
      },
      payment_method_last4: { type: ["string", "null"] },
    },
  },
} as const;

interface ReceiptModelOutput {
  vendor: string | null;
  expense_date: string | null;
  subtotal_cents: number | null;
  tax_cents: number | null;
  tip_cents: number | null;
  total_cents: number | null;
  currency: string | null;
  category: string | null;
  payment_method: string | null;
  payment_method_last4: string | null;
}

function jsonResWithCors(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: buildCorsHeaders(req) });
  }
  if (req.method !== "POST") {
    return jsonResWithCors(req, { error: "method_not_allowed" }, 405);
  }

  const auth = checkAuth(req);
  if (!auth.ok) {
    return jsonResWithCors(req, { error: "unauthorized", reason: auth.reason }, 401);
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return jsonResWithCors(req, { error: "invalid_json" }, 400);
  }

  const imageBase64 =
    typeof body.image_base64 === "string" ? body.image_base64 : "";
  if (!imageBase64) {
    return jsonResWithCors(req, { error: "missing_image_base64" }, 400);
  }
  const imageMimeType =
    typeof body.image_mime_type === "string" ? body.image_mime_type : "image/jpeg";

  try {
    const { parsed, raw } = await callOpenAIVision<ReceiptModelOutput>({
      imageBase64,
      imageMimeType,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt:
        "Extract the receipt fields from this image and return them as JSON.",
      jsonSchema: RECEIPT_SCHEMA,
      maxTokens: 600,
    });

    const extractedFields: string[] = [];
    if (parsed.vendor !== null) extractedFields.push("vendor");
    if (parsed.expense_date !== null) extractedFields.push("expenseDate");
    if (parsed.subtotal_cents !== null) extractedFields.push("subtotalCents");
    if (parsed.tax_cents !== null) extractedFields.push("taxCents");
    if (parsed.tip_cents !== null) extractedFields.push("tipCents");
    if (parsed.total_cents !== null) extractedFields.push("totalCents");
    if (parsed.currency !== null) extractedFields.push("currency");
    if (parsed.category !== null) extractedFields.push("category");
    if (parsed.payment_method !== null) extractedFields.push("paymentMethod");
    if (parsed.payment_method_last4 !== null)
      extractedFields.push("paymentMethodLast4");

    return jsonResWithCors(req, {
      draft: {
        vendor: parsed.vendor,
        expenseDate: parsed.expense_date,
        subtotalCents: parsed.subtotal_cents,
        taxCents: parsed.tax_cents,
        tipCents: parsed.tip_cents,
        totalCents: parsed.total_cents,
        currency: parsed.currency,
        category: parsed.category,
        paymentMethod: parsed.payment_method,
        paymentMethodLast4: parsed.payment_method_last4,
      },
      extractedFields,
      aiRaw: raw,
    });
  } catch (err) {
    console.error("scan-receipt: vision call failed", err);
    return jsonResWithCors(
      req,
      { error: "vision_failed", message: String(err?.message ?? err) },
      502,
    );
  }
});
