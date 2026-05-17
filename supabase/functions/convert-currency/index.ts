// @ts-nocheck
// Currency conversion edge function. Looks up a live FX rate between two
// ISO 4217 currencies and returns the converted amount + rate metadata.
//
// Provider selection:
//   - If FX_PROVIDER_URL is set, it is treated as a templated GET endpoint.
//     `{from}`, `{to}`, and `{date}` placeholders get URL-encoded values.
//     For "latest" rate, `{date}` is replaced with the literal "latest"
//     so providers like frankfurter that put the date in the path work
//     without an extra config knob.
//     The response is parsed as JSON and the first numeric value found at
//     one of the well-known shapes below is used as the rate.
//   - Otherwise the function defaults to frankfurter.app (free, no key,
//     ECB-sourced daily rates):
//       https://api.frankfurter.app/latest?from=USD&to=CAD
//     History via /{date}?from=...&to=...
//
//   NOTE: exchangerate.host was the prior default but stopped accepting
//   anonymous requests in 2024 (now returns `missing_access_key` error).
//
//   Last-resort fallback: a small in-code rate table (FALLBACK_RATES below)
//   so common pairs like USD↔CAD never hard-fail when the upstream FX
//   provider has a transient outage. Update the constants when the rates
//   drift more than ~5%.
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
  "https://api.frankfurter.app/{date}?from={from}&to={to}";

// Hostnames the function is allowed to call. Defense-in-depth against
// SSRF — even if FX_PROVIDER_URL is misconfigured (or somehow
// influenced by an attacker via env), the request never hits an
// internal IP, metadata service, or unrelated third party. Added
// 2026-05-17 in response to the security audit P1 finding.
const FX_PROVIDER_ALLOWED_HOSTS = new Set([
  "api.frankfurter.app",
  "api.exchangerate.host",
  "api.fxratesapi.com",
  "openexchangerates.org",
  "api.currencyapi.com",
]);

// Cap on the FX provider response body so a hostile or buggy upstream
// can't blow our memory budget. ~256 KB is comfortably more than any
// real FX response.
const FX_MAX_RESPONSE_BYTES = 256 * 1024;

function isAllowedFxHost(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Reject anything that isn't https — http leaks request contents
    // to local network observers, and the file:/ data:/ schemes are
    // useless for our purposes.
    if (parsed.protocol !== "https:") return false;
    return FX_PROVIDER_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

// Approximate fallback rates for the most common pairs we see in receipts.
// Used only when the upstream FX provider call fails — better to charge an
// approximate amount than to fail the receipt save. Update periodically
// (e.g. every quarter) when the real rates drift more than ~5%.
// Last updated: 2026-05-16.
const FALLBACK_RATES: Record<string, Record<string, number>> = {
  USD: { CAD: 1.37, EUR: 0.92, GBP: 0.79, AUD: 1.50, MXN: 17.0, JPY: 150.0 },
  CAD: { USD: 0.73, EUR: 0.67, GBP: 0.57, AUD: 1.10, MXN: 12.4, JPY: 109.5 },
  EUR: { USD: 1.09, CAD: 1.49, GBP: 0.86, AUD: 1.63 },
  GBP: { USD: 1.27, CAD: 1.74, EUR: 1.16 },
};

function lookupFallbackRate(from: string, to: string): number | null {
  return FALLBACK_RATES[from]?.[to] ?? null;
}

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
  // For providers (frankfurter.app, fixer historical, etc) that put the
  // date in the path, substitute "latest" when caller didn't specify a
  // date so the URL stays valid.
  return template
    .replace(/\{from\}/g, encodeURIComponent(from))
    .replace(/\{to\}/g, encodeURIComponent(to))
    .replace(/\{date\}/g, date ? encodeURIComponent(date) : "latest");
}

function fallbackResponse(
  amount: number,
  from: string,
  to: string,
  rate: number,
): Record<string, unknown> {
  return {
    convertedAmount: Math.round(amount * rate * 100) / 100,
    rate,
    sourceCurrency: from.toLowerCase(),
    targetCurrency: to.toLowerCase(),
    provider: "fallback_static",
    quotedAt: new Date().toISOString(),
  };
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

    // Hostname allowlist (SSRF defense). Reject anything not in the
    // approved set — fall straight through to the in-code FALLBACK_RATES
    // so receipts still convert even if the env is misconfigured.
    if (!isAllowedFxHost(providerUrl)) {
      console.warn("convert-currency: rejected provider URL (not allowlisted)", providerUrl);
      const fallbackRate = lookupFallbackRate(from, to);
      if (fallbackRate != null) {
        const converted = Math.round(amount * fallbackRate * 100) / 100;
        return jsonResWithCors(req, {
          convertedAmount: converted,
          rate: fallbackRate,
          sourceCurrency: from.toLowerCase(),
          targetCurrency: to.toLowerCase(),
          provider: "fallback",
          quotedAt: new Date().toISOString(),
          warning: "fx_provider_not_allowed",
        });
      }
      return jsonResWithCors(req, {
        error: "fx_provider_not_allowed",
        message: "Currency conversion is temporarily unavailable.",
      }, 503);
    }

    const headers: Record<string, string> = { "Accept": "application/json" };
    const authHeader = (Deno.env.get("FX_PROVIDER_AUTH_HEADER") ?? "").trim();
    if (authHeader.includes(":")) {
      const idx = authHeader.indexOf(":");
      const name = authHeader.slice(0, idx).trim();
      const value = authHeader.slice(idx + 1).trim();
      if (name && value) headers[name] = value;
    }

    let response: Response | null = null;
    try {
      response = await fetchWithTimeout(providerUrl, { method: "GET", headers }, FX_TIMEOUT_MS);
    } catch (fetchErr) {
      console.warn("convert-currency: provider fetch threw", fetchErr);
      response = null;
    }

    if (response && response.ok) {
      // Reject responses larger than the cap so a misbehaving (or
      // hostile) upstream can't bloat our memory. Most FX responses
      // are well under 5 KB.
      const contentLength = Number(response.headers.get("content-length") ?? "0");
      if (contentLength > FX_MAX_RESPONSE_BYTES) {
        console.warn("convert-currency: provider response too large", contentLength);
        response = null;
      }
    }

    if (response && response.ok) {
      const bodyText = await response.text().catch(() => "");
      if (bodyText.length > FX_MAX_RESPONSE_BYTES) {
        console.warn("convert-currency: provider body exceeded cap after read", bodyText.length);
        response = null;
      }
      let json: Record<string, unknown> = {};
      if (response && bodyText) {
        try { json = JSON.parse(bodyText) as Record<string, unknown>; } catch {
          json = {};
        }
      }
      const rate = extractRate(json, to);
      if (rate != null && Number.isFinite(rate) && rate > 0) {
        const converted = Math.round(amount * rate * 100) / 100;
        return jsonResWithCors(req, {
          convertedAmount: converted,
          rate,
          sourceCurrency: from.toLowerCase(),
          targetCurrency: to.toLowerCase(),
          provider: providerNameFromUrl(providerUrl),
          quotedAt: new Date().toISOString(),
        });
      }
      console.warn("convert-currency: provider returned no usable rate", { from, to });
    } else if (response) {
      console.warn("convert-currency: provider non-2xx", response.status);
    }

    // Upstream failed. Try the static fallback so common pairs still
    // convert (better an approximate save than a hard-fail).
    const fallbackRate = lookupFallbackRate(from, to);
    if (fallbackRate != null) {
      return jsonResWithCors(req, fallbackResponse(amount, from, to, fallbackRate));
    }

    return jsonResWithCors(
      req,
      { error: response && !response.ok ? "fx_provider_error" : "fx_rate_unavailable" },
      502,
    );
  } catch (err) {
    const validation = validationResponse(err, buildCorsHeaders(req));
    if (validation) return validation;
    console.error("convert-currency: fx lookup failed", err);
    // Last-resort fallback even for unexpected errors.
    const body = (await req.clone().json().catch(() => ({}))) as Body;
    const amount = normalizeAmount(body.amount);
    const from = normalizeCurrency(body.from);
    const to = normalizeCurrency(body.to);
    if (amount != null && from && to && from !== to) {
      const fallbackRate = lookupFallbackRate(from, to);
      if (fallbackRate != null) {
        return jsonResWithCors(req, fallbackResponse(amount, from, to, fallbackRate));
      }
    }
    return jsonResWithCors(
      req,
      { error: "fx_lookup_failed", message: String(err?.message ?? err) },
      502,
    );
  }
});
