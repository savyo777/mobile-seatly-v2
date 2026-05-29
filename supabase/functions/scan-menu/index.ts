// @ts-nocheck
// Menu scanner v1 — extracts a full restaurant menu from a single photo or
// scan of a printed menu page. Called by the owner-side menu-scan-review
// screen on mount with a base64-encoded image. Returns an array of
// MenuItemDraft rows for the owner to review, edit, and bulk-save into
// the `menu_items` table. Never writes to the DB itself.
//
// Mirrors the structure of scan-receipt: same auth + rate-limit + vision
// helper, with a menu-shaped system prompt and JSON schema. The output
// shape mirrors what `app/(staff)/menu-item-edit.tsx` would otherwise
// collect one item at a time.

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

const SYSTEM_PROMPT = `You are a menu-extraction assistant for a restaurant onboarding tool.
Your job is to read a single photo or scan of a restaurant menu page and
return a structured JSON list of every menu item you can see.

Rules for items:
- name: short item name as printed on the menu. Trim weird artifacts and
  remove any leading bullets or numbers. Keep dish names in their natural
  capitalization (e.g. "Beef Carpaccio", "Pad Thai"). Required.
- description: one short sentence describing the dish, copied (or
  paraphrased only when the menu uses cramped abbreviations) from the
  menu text. Null if the menu shows no description for this item.
- price_cents: integer dollars and cents in MAJOR currency converted to
  cents. "$12.50" → 1250. "$8" → 800. Use null if the price is illegible
  or marked "MP" / "Market Price" / "Ask server".
- category: the section header above this item on the menu — what the
  printer grouped it under. Common values: "Appetizers", "Starters",
  "Salads", "Soups", "Mains", "Entrees", "Pasta", "Pizza", "Sides",
  "Desserts", "Drinks", "Cocktails", "Wine", "Beer", "Kids". Use the
  EXACT text printed on the menu when possible (preserve the owner's
  voice). Null if the menu has no section headers.
- allergens: array of short lowercase allergen tags ONLY when the menu
  explicitly calls them out (typically with icons or footnote tags
  like "GF", "DF", "V", "VG", "contains nuts"). Map common ones:
    "gf" / "gluten free" / "GF" → "gluten-free"
    "df" / "dairy free" / "DF" → "dairy-free"
    "v" / "veg" / "vegetarian" → "vegetarian"
    "vg" / "vgn" / "vegan" → "vegan"
    "contains nuts" / "n" / "nut" → "nuts"
    "contains shellfish" / "s" → "shellfish"
  Empty array if nothing is called out. Do NOT guess from ingredients.

Rules for the response:
- Return items in the same top-to-bottom, left-to-right order they appear
  on the menu, grouped by their section. This makes the owner's review
  scroll match the source.
- Also return suggested_categories: an array of unique category names you
  used, in the same order they first appear on the menu. The owner uses
  this list to pre-create matching menu_categories rows.
- If the image is not a menu at all, or you cannot read any items
  confidently, return items: [] and suggested_categories: []. Don't
  invent.
- Combos / "Add a soup +$2" modifier lines: only emit them as items if
  they have their own name and a complete price. Otherwise skip — these
  are usually modifiers attached to a parent item.
- Daily-special boards / chalkboard photos: extract what's legible; skip
  the rest.
- Multi-language menus: prefer the English text when both languages are
  printed side by side. Otherwise use whichever language is present.
- Bilingual prices ("$12 / €11"): use the FIRST listed price.`;

const MENU_SCHEMA = {
  name: "menu_draft",
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items", "suggested_categories"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["name", "description", "price_cents", "category", "allergens"],
          properties: {
            name: { type: "string" },
            description: { type: ["string", "null"] },
            price_cents: { type: ["integer", "null"] },
            category: { type: ["string", "null"] },
            allergens: {
              type: "array",
              items: { type: "string" },
            },
          },
        },
      },
      suggested_categories: {
        type: "array",
        items: { type: "string" },
      },
    },
  },
} as const;

interface MenuModelOutput {
  items: Array<{
    name: string;
    description: string | null;
    price_cents: number | null;
    category: string | null;
    allergens: string[];
  }>;
  suggested_categories: string[];
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

  // Per-user rate-limit gate. Menu scans ingest a full page (more tokens
  // than receipts) and return many output rows, so the caps are tighter
  // than scan-receipt's. Env-overridable via _shared/cenaiva-limits.ts.
  const rateIdent = rateLimitIdentifier(req, auth.authUserId);
  try {
    await enforceRateLimit(supabaseAdmin, CENAIVA_LIMITS.scanMenu.minute.scope, rateIdent, {
      limit: CENAIVA_LIMITS.scanMenu.minute.limit,
      windowSeconds: CENAIVA_LIMITS.scanMenu.minute.windowSeconds,
    });
  } catch (rlErr) {
    if (rlErr instanceof RateLimitError) {
      return jsonResWithCors(
        req,
        { error: CENAIVA_RATE_LIMIT_CODES.minute, retry_after: CENAIVA_LIMITS.scanMenu.minute.windowSeconds },
        429,
      );
    }
    throw rlErr;
  }
  try {
    await enforceRateLimit(supabaseAdmin, CENAIVA_LIMITS.scanMenu.day.scope, rateIdent, {
      limit: CENAIVA_LIMITS.scanMenu.day.limit,
      windowSeconds: CENAIVA_LIMITS.scanMenu.day.windowSeconds,
    });
  } catch (rlErr) {
    if (rlErr instanceof RateLimitError) {
      return jsonResWithCors(
        req,
        { error: CENAIVA_RATE_LIMIT_CODES.day, retry_after: CENAIVA_LIMITS.scanMenu.day.windowSeconds },
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

    const { parsed, raw } = await callOpenAIVision<MenuModelOutput>({
      imageBase64,
      imageMimeType,
      systemPrompt: SYSTEM_PROMPT,
      userPrompt:
        "Extract every menu item from this image and return them as JSON, grouped in the order they appear.",
      jsonSchema: MENU_SCHEMA,
      // Menus are long — bump above receipt's 600-token cap to fit
      // ~40 items with descriptions before the model truncates.
      maxTokens: 2400,
    });

    const items = Array.isArray(parsed.items) ? parsed.items : [];
    const suggestedCategories = Array.isArray(parsed.suggested_categories)
      ? parsed.suggested_categories.filter((c) => typeof c === "string" && c.trim().length > 0)
      : [];

    if (items.length === 0) {
      // Explicit, stable error code so the mobile friendlyError() table
      // can map to "Couldn't find menu items in that image. Try a clearer
      // photo of one section at a time."
      return jsonResWithCors(req, { error: "no_menu_items_detected" }, 422);
    }

    return jsonResWithCors(req, {
      draft: {
        items: items.map((item) => ({
          name: typeof item.name === "string" ? item.name.trim() : "",
          description: typeof item.description === "string" ? item.description.trim() : null,
          // price_cents → price in major-currency units, matching the
          // shape menu-item-edit.tsx already expects.
          price: typeof item.price_cents === "number" && Number.isFinite(item.price_cents)
            ? Math.round(item.price_cents) / 100
            : null,
          category: typeof item.category === "string" ? item.category.trim() : null,
          allergens: Array.isArray(item.allergens)
            ? item.allergens
                .filter((a) => typeof a === "string" && a.trim().length > 0)
                .map((a) => a.trim().toLowerCase())
            : [],
        })).filter((item) => item.name.length > 0),
        suggested_categories: suggestedCategories.map((c) => c.trim()),
      },
      aiRaw: raw,
    });
  } catch (err) {
    const validation = validationResponse(err, buildCorsHeaders(req));
    if (validation) return validation;
    console.error("scan-menu: vision call failed", err);
    return jsonResWithCors(
      req,
      { error: "vision_failed", message: String(err?.message ?? err) },
      502,
    );
  }
});
