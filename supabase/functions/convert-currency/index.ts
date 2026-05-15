// @ts-nocheck
// Currency conversion edge function. Looks up a live FX rate between two
// ISO 4217 currencies and returns the converted amount + rate metadata.
//
// Provider selection:
//   - If FX_PROVIDER_URL is set, it is treated as a templated GET endpoint.
//     `{from}`, `{to}`, and `{date}` placeholders get URL-encoded values.
//     The response is parsed as JSON and the first numeric value found at
//     one of the well-known shapes below is used as the rate.
//   - Otherwise the function defaults to exchangerate.host (no key needed):
//       https://api.exchangerate.host/convert?from=USD&to=CAD&amount=20
//
// FX_PROVIDER_AUTH_HEADER (optional): "Header-Name: value" — sent on the
// outbound rate request when the provider needs an API key.
//
// Response shape:
//   {
//     convertedAmount: number,  // amount in target currency
//     rate: number,             // 1 unit of source = `rate` units of target
//     sourceCurrency: "usd",
//     targetCurrency: "cad",
//     provider: "exchangerate.host" | <FX_PROVIDER_URL host>,
//     quotedAt: "2026-05-14T20:00:00.000Z",
//   }

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { buildCorsHeaders } from "../_shared/cors.ts";
import { checkAuth } from "../_shared/auth.ts";
import {
  readJsonObject,
  validationResponse,
  asMoney,
  asIsoDate,
} from "../_shared/input-validation.ts";

const DEFAULT_PROVIDER_URL =
  "https://api.exchangerate.host/convert?from={from}&to={to}&amount=1";

type Body = {
  amount?: unknown;
  from?: unknown;
  to?: unknown;
  date?: unknown;
};

function jsonResWithCors(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...buildCorsHeaders(req),
      "Content-Type": "application/json",
    },
  });
}

function normalizeCurrency(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(trimmed) ? trimmed : null;
}

function normalizeAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(trimmed) ? trimmed : null;
}

// Hard ceiling on the upstream FX call so the client never waits forever.
const FX_TIMEOUT_MS = 8_000;

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  ms: number,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Pull a numeric rate out of any of the common JSON response shapes.
// exchangerate.host returns `{ info: { rate }, result }`. Other providers
// often return `{ rates: { CAD: 1.37 } }` or `{ data: { CAD: 1.37 } }`.
function extractRate(
  json: Record<string, unknown>,
  to: string,
): number | null {
  if (typeof json.result === "number" && Number.isFinite(json.result)) {
    return json.result;
  }
  const info = json.info as Record<string, unknown> | undefined;
  if (info && typeof info.rate === "number" && Number.isFinite(info.rate)) {
    return info.rate;
  }
  const rates = json.rates as Record<string, unknown> | undefined;
  if (rates && typeof rates[to] === "number" && Number.isFinite(rates[to] as number)) {
    return rates[to] as number;
  }
  const data = json.data as Record<string, unknown> | undefined;
  if (data && typeof data[to] === "number" && Number.isFinite(data[to] as number)) {
    return data[to] as number;
  }
  if (typeof json.rate === "number" && Number.isFinite(json.rate)) {
    return json.rate;
  }
  return null;
}

function buildProviderUrl(template: string, from: string, to: string, date: string | null): string {
  return template
    .replace(/\{from\}/g, encodeURIComponent(from))
    .replace(/\{to\}/g, encodeURIComponent(to))
    .replace(/\{date\}/g, date ? encodeURIComponent(date) : "");
}

function providerNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.host;
  } catch {
    return "fx";
  }
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

  try {
    const body = (await readJsonObject(req)) as Body;

    const amount = asMoney(body.amount, "amount", { required: true, min: 0 });
    const from = normalizeCurrency(body.from);
    const to = normalizeCurrency(body.to);
    const date = body.date == null || body.date === "" ? null : asIsoDate(body.date, "date");

    if (amount == null || amount < 0) {
      return jsonResWithCors(req, { error: "invalid_amount" }, 400);
    }
    if (!from || !to) {
      return jsonResWithCors(req, { error: "invalid_currency" }, 400);
    }

    // Same-currency short-circuit. Skip the upstream call entirely so we
    // never burn an API request or risk a network failure for a no-op.
    if (from === to) {
      return jsonResWithCors(req, {
        convertedAmount: Math.round(amount * 100) / 100,
        rate: 1,
        sourceCurrency: from.toLowerCase(),
        targetCurrency: to.toLowerCase(),
        provider: "identity",
        quotedAt: new Date().toISOString(),
      });
    }

    const providerTemplate = (Deno.env.get("FX_PROVIDER_URL") ?? "").trim() || DEFAULT_PROVIDER_URL;
    const providerUrl = buildProviderUrl(providerTemplate, from, to, date);

    const headers: Record<string, string> = { "Accept": "application/json" };
    const authHeader = (Deno.env.get("FX_PROVIDER_AUTH_HEADER") ?? "").trim();
    if (authHeader.includes(":")) {
      const idx = authHeader.indexOf(":");
      const name = authHeader.slice(0, idx).trim();
      const value = authHeader.slice(idx + 1).trim();
      if (name && value) headers[name] = value;
    }

    const response = await fetchWithTimeout(providerUrl, { method: "GET", headers }, FX_TIMEOUT_MS);
    if (!response.ok) {
      return jsonResWithCors(
        req,
        { error: "fx_provider_error", status: response.status },
        502,
      );
    }
    const json = (await response.json()) as Record<string, unknown>;
    const rate = extractRate(json, to);
    if (rate == null || !Number.isFinite(rate) || rate <= 0) {
      return jsonResWithCors(req, { error: "fx_rate_unavailable" }, 502);
    }

    const converted = Math.round(amount * rate * 100) / 100;
    return jsonResWithCors(req, {
      convertedAmount: converted,
      rate,
      sourceCurrency: from.toLowerCase(),
      targetCurrency: to.toLowerCase(),
      provider: providerNameFromUrl(providerUrl),
      quotedAt: new Date().toISOString(),
    });
  } catch (err) {
    const validation = validationResponse(err, buildCorsHeaders(req));
    if (validation) return validation;
    console.error("convert-currency: fx lookup failed", err);
    return jsonResWithCors(
      req,
      { error: "fx_lookup_failed", message: String(err?.message ?? err) },
      502,
    );
  }
});
