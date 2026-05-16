// Concurrency test for the Cenaiva mobile diner "browse a restaurant" hot path.
//
// Hits the one read endpoint every diner pulls when opening a restaurant's
// booking landing screen:
//
//   GET /functions/v1/get-availability?restaurant_id=...&date=...&party_size=...
//
// Anon-callable (publishable key only; no JWT required). Pure SELECT via
// PostgREST + RPC. No writes, no Stripe, no OpenAI / ElevenLabs / Deepgram.
// Safe against production.
//
// NOTE: `cenaiva-availability` was removed from this test — it has
// `verify_jwt=true` in supabase/config.toml so an anon publishable key returns
// 401 UNAUTHORIZED_INVALID_JWT_FORMAT. To test it we'd need a real diner JWT.
//
// Baseline latency (zero load, 2026-05-16): ~3.8s per request. Reflected in
// the relaxed p95 abort threshold below.
//
// Ramp: 1 -> 50 -> 100 -> 200 VUs over 5 minutes.
// Abort thresholds: p95 latency > 12s OR error rate > 10%.
//
// Run:
//   export SUPABASE_URL="https://exbjodmnpdiayfzrdyux.supabase.co"
//   export SUPABASE_ANON_KEY="<your EXPO_PUBLIC_SUPABASE_ANON_KEY>"
//   export RESTAURANT_ID="<a published restaurant uuid>"
//   k6 run tests/load/browse-availability.k6.js
//
// See /Users/stevengeorgy/.claude/plans/prancy-spinning-codd.md for context.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const RESTAURANT_ID = __ENV.RESTAURANT_ID || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !RESTAURANT_ID) {
  console.error(
    'Missing env. Set SUPABASE_URL, SUPABASE_ANON_KEY, and RESTAURANT_ID before running.',
  );
}

// Custom counters so the end-of-run summary tells us WHICH failure mode hit.
const rateLimit429 = new Counter('rate_limit_429');
const server5xx = new Counter('server_5xx');
const client4xxOther = new Counter('client_4xx_other');
const success2xx = new Counter('success_2xx');

export const options = {
  scenarios: {
    getAvailability: {
      executor: 'ramping-vus',
      exec: 'hitGetAvailability',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
      ],
      gracefulRampDown: '10s',
      tags: { endpoint: 'get-availability' },
    },
  },
  // Auto-abort if the system starts hurting. Latency threshold is generous
  // because baseline is already ~4s; we only want to abort on catastrophic
  // degradation, not normal slow responses.
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '30s' }],
    http_req_duration: [{ threshold: 'p(95)<12000', abortOnFail: true, delayAbortEval: '30s' }],
  },
};

function pickPartySize() {
  return Math.floor(Math.random() * 6) + 1; // 1..6
}

function pickDateWithinTwoWeeks() {
  const offsetDays = Math.floor(Math.random() * 14) + 1; // 1..14 days out
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function classifyResponse(res) {
  const status = res.status;
  if (status >= 200 && status < 300) {
    success2xx.add(1);
  } else if (status === 429) {
    rateLimit429.add(1);
  } else if (status >= 500) {
    server5xx.add(1);
  } else if (status >= 400) {
    client4xxOther.add(1);
  }
}

export function hitGetAvailability() {
  const date = pickDateWithinTwoWeeks();
  const partySize = pickPartySize();
  const url =
    `${SUPABASE_URL}/functions/v1/get-availability` +
    `?restaurant_id=${encodeURIComponent(RESTAURANT_ID)}` +
    `&date=${encodeURIComponent(date)}` +
    `&party_size=${partySize}`;

  const res = http.get(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    tags: { endpoint: 'get-availability' },
  });

  classifyResponse(res);
  check(res, {
    'get-availability: 200 or 429': (r) => r.status === 200 || r.status === 429,
    'get-availability: not 5xx': (r) => r.status < 500,
  });

  // Mimic a human pause between page interactions.
  sleep(1 + Math.random());
}
