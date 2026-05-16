// @ts-nocheck
// Receipt scanner v1 — extracts header-level data from a photo of a paper
// receipt. Called by the mobile app's expense-review screen on mount with
// a base64-encoded image. Returns a draft `Expense` for the owner to
// review and save. Never writes to the DB.

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkAuth } from "../_shared/auth.ts";
import { callOpenAIVision } from "../_shared/openai.ts";
import { supabaseAdmin } from "../_shared/supabase.ts";
import {
  enforceRateLimit,
  RateLimitError,
  rateLimitIdentifier,
} from "../_shared/rate-limit.ts";
import { CENAIVA_LIMITS, CENAIVA_RATE_LIMIT_CODES } from "../_shared/cenaiva-limits.ts";
import {
  readJsonObject,
  validationResponse,
  asText as validatedText,
} from "../_shared/input-validation.ts";

type Body = {
  image_base64?: unknown;
  image_mime_type?: unknown;
};

// MUST match the public.expenses.category CHECK constraint exactly.
const EXPENSE_CATEGORY_KEYS = [
  "food_cost",
  "food_supplies",
  "beverages",
  "utilities",
  "rent",
  "equipment",
  "marketing",
  "staff",
  "supplies",
  "maintenance",
  "cleaning",
  "sales",
  "preorders",
  "events",
  "catering",
  "delivery",
  "gift_cards",
  "other",
] as const;

const SYSTEM_PROMPT = `You are a receipt-extraction assistant for a restaurant accounting app.
Your job is to read a single paper-receipt photo and return structured JSON.

Rules:
- Money fields are decimal numbers in major currency units. $12.34 -> 12.34. Never include dollar signs.
- The three money fields have distinct meanings — do NOT conflate them:
  - amount        = SUBTOTAL before tax. The sum of line items only ("Subtotal" line on the receipt). NOT the final amount paid.
  - tax_amount    = the tax line(s) only (HST, GST, VAT, PST, sales tax, etc.). If the receipt shows multiple tax lines, SUM them into this one number.
  - total_amount  = the FINAL amount paid, after tax (and after any tips/rounding shown on the receipt). When all three are visible, total_amount should equal amount + tax_amount within a penny.
- Edge cases for the money trio:
  - If the receipt only shows a single grand-total line (no subtotal/tax breakdown), set amount = total_amount and tax_amount = null.
  - If you can read the total but not the tax line, set total_amount and leave both amount and tax_amount as null rather than guessing.
  - Never invent a tax rate — only return tax_amount if the receipt visibly shows it.
- expense_date must be ISO YYYY-MM-DD if visible on the receipt; otherwise null.
- currency is a lowercase ISO 4217 code ("usd", "cad", "eur", ...). Default to "cad" only if you cannot determine it.
- category MUST be one of: food_cost, food_supplies, beverages, utilities, rent, equipment, marketing, staff, supplies, maintenance, cleaning, sales, preorders, events, catering, delivery, gift_cards, other. Pick the best match for the vendor.
  - food_cost: ingredients used in cooking (produce, meat, fish, dairy, bakery, dry goods).
  - food_supplies: bulk food-service vendors (Sysco, US Foods, GFS, restaurant-supply houses).
  - beverages: alcohol, coffee, tea, soft drinks, juice, water service.
  - utilities: electricity, gas, water, internet, phone, telecom.
  - rent: monthly rent or lease payments for the premises.
  - equipment: kitchen equipment, refrigeration, POS hardware, capital purchases.
  - marketing: ads, printing, signage, promotions, PR, design services.
  - staff: payroll-adjacent expenses, uniforms, training, recruiting fees.
  - supplies: cleaning chemicals, paper goods, office supplies, takeout containers, kitchen smallware.
  - maintenance: hardware stores, plumber, electrician, HVAC service, repairs.
  - cleaning: contracted cleaning services, laundry, pest control.
  - sales: rare for paper receipts — sales-tax remittance or merchant fees.
  - preorders: customer pre-payment refunds or pre-order fulfillment costs.
  - events: private events, bookings-related costs (decor, rentals, off-site catering staff).
  - catering: catering supplies, off-premise event ingredients/equipment.
  - delivery: gas for delivery vehicles, courier/3rd-party delivery fees, vehicle service.
  - gift_cards: gift-card stock, gift-card processing fees.
  - other: anything that doesn't fit cleanly above.
- vendor: the merchant's display name as it appears on the receipt (e.g. "Shell #1234", "Sysco Foodservice"). Trim weird artifacts.
- payment_method: a short lowercase phrase describing how the receipt was paid, when visible. Examples: "visa ****4242", "mastercard", "amex", "cash", "interac", "debit", "apple pay". Prefer the actual card brand + last 4 if printed. Null if not visible.
- If you cannot read a field, return null for that field. Do NOT guess.
- If the image is not a receipt at all, return all nulls.`;

const RECEIPT_SCHEMA = {
  name: "expense_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "vendor",
      "expense_date",
      "amount",
      "tax_amount",
      "total_amount",
      "currency",
      "category",
      "payment_method",
    ],
    properties: {
      vendor: { type: ["string", "null"] },
      expense_date: { type: ["string", "null"] },
      amount: {
        type: ["number", "null"],
        description: "SUBTOTAL before tax. Sum of line items only. Not the final amount paid.",
      },
      tax_amount: {
        type: ["number", "null"],
        description: "Tax line(s) only (HST/GST/VAT/PST/sales tax). Sum if multiple tax lines. Null if no tax visible.",
      },
      total_amount: {
        type: ["number", "null"],
        description: "Final amount paid after tax. Should equal amount + tax_amount within a penny when both are visible.",
      },
      currency: { type: ["string", "null"] },
      category: {
        type: ["string", "null"],
        enum: [...EXPENSE_CATEGORY_KEYS, null],
      },
      payment_method: { type: ["string", "null"] },
    },
  },
} as const;

interface ReceiptModelOutput {
  vendor: string | null;
  expense_date: string | null;
  amount: number | null;
  tax_amount: number | null;
  total_amount: number | null;
  currency: string | null;
  category: string | null;
  payment_method: string | null;
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

  // Per-user rate-limit gate. Vision is the most expensive call we make;
  // these defaults are env-overridable via _shared/cenaiva-limits.ts.
  const rateIdent = rateLimitIdentifier(req, auth.authUserId);
  try {
    await enforceRateLimit(supabaseAdmin, CENAIVA_LIMITS.scanReceipt.minute.scope, rateIdent, {
      limit: CENAIVA_LIMITS.scanReceipt.minute.limit,
      windowSeconds: CENAIVA_LIMITS.scanReceipt.minute.windowSeconds,
    });
  } catch (rlErr) {
    if (rlErr instanceof RateLimitError) {
      return jsonResWithCors(
        req,
        { error: CENAIVA_RATE_LIMIT_CODES.minute, retry_after: CENAIVA_LIMITS.scanReceipt.minute.windowSeconds },
        429,
      );
    }
    throw rlErr;
  }
  try {
    await enforceRateLimit(supabaseAdmin, CENAIVA_LIMITS.scanReceipt.day.scope, rateIdent, {
      limit: CENAIVA_LIMITS.scanReceipt.day.limit,
      windowSeconds: CENAIVA_LIMITS.scanReceipt.day.windowSeconds,
    });
  } catch (rlErr) {
    if (rlErr instanceof RateLimitError) {
      return jsonResWithCors(
        req,
        { error: CENAIVA_RATE_LIMIT_CODES.day, retry_after: CENAIVA_LIMITS.scanReceipt.day.windowSeconds },
        429,
      );
    }
    throw rlErr;
  }

  try {
    const body = (await readJsonObject(req, { maxBytes: 8 * 1024 * 1024 })) as Body;

    const imageBase64 = validatedText(body.image_base64, "image_base64", {
      required: true,
      maxLength: 7_500_000,
    }) ?? "";
    if (!imageBase64) {
      return jsonResWithCors(req, { error: "missing_image_base64" }, 400);
    }
    const imageMimeType = validatedText(body.image_mime_type, "image_mime_type", {
      maxLength: 64,
    }) ?? "image/jpeg";
    if (!/^image\/(?:jpeg|jpg|png|webp|heic|heif)$/i.test(imageMimeType)) {
      return jsonResWithCors(req, { error: "invalid_image_mime_type" }, 400);
    }

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
    if (parsed.amount !== null) extractedFields.push("amount");
    if (parsed.tax_amount !== null) extractedFields.push("taxAmount");
    if (parsed.total_amount !== null) extractedFields.push("totalAmount");
    if (parsed.currency !== null) extractedFields.push("currency");
    if (parsed.category !== null) extractedFields.push("category");
    if (parsed.payment_method !== null) extractedFields.push("paymentMethod");

    return jsonResWithCors(req, {
      draft: {
        vendor: parsed.vendor,
        expenseDate: parsed.expense_date,
        amount: parsed.amount,
        taxAmount: parsed.tax_amount,
        totalAmount: parsed.total_amount,
        currency: parsed.currency ? String(parsed.currency).toLowerCase() : null,
        category: parsed.category,
        paymentMethod: parsed.payment_method
          ? String(parsed.payment_method).trim().toLowerCase()
          : null,
      },
      extractedFields,
      aiRaw: raw,
    });
  } catch (err) {
    const validation = validationResponse(err, buildCorsHeaders(req));
    if (validation) return validation;
    console.error("scan-receipt: vision call failed", err);
    return jsonResWithCors(
      req,
      { error: "vision_failed", message: String(err?.message ?? err) },
      502,
    );
  }
});
