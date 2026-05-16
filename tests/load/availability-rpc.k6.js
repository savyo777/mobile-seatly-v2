// Concurrency test for the **actual** mobile-diner hot read path.
//
// The mobile app calls Supabase's PostgREST `rpc` endpoint directly via
// `supabase.rpc('get_available_slots_cached', { p_restaurant_id, p_date,
// p_party_size })` (see lib/booking/publicBookingApi.ts:303). That hits:
//
//   POST /rest/v1/rpc/get_available_slots_cached
//
// This script measures that path — distinct from the edge-function
// `/functions/v1/get-availability` that the prior k6 script tested.
// PostgREST runs the Postgres function in a single round-trip and returns
// the result; no N+1, no Deno cold-start overhead.
//
// Ramp: 1 -> 50 -> 100 -> 200 VUs over 5 minutes.
// Abort: p95 latency > 6s OR error rate > 10%.
//
// Run:
//   export SUPABASE_URL="https://exbjodmnpdiayfzrdyux.supabase.co"
//   export SUPABASE_ANON_KEY="<your EXPO_PUBLIC_SUPABASE_ANON_KEY>"
//   export RESTAURANT_ID="<a published restaurant uuid>"
//   k6 run tests/load/availability-rpc.k6.js

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

const rateLimit429 = new Counter('rate_limit_429');
const server5xx = new Counter('server_5xx');
const client4xxOther = new Counter('client_4xx_other');
const success2xx = new Counter('success_2xx');

export const options = {
  scenarios: {
    availabilityRpc: {
      executor: 'ramping-vus',
      exec: 'hitAvailabilityRpc',
      startVUs: 1,
      stages: [
        { duration: '1m', target: 50 },
        { duration: '2m', target: 100 },
        { duration: '2m', target: 200 },
      ],
      gracefulRampDown: '10s',
      tags: { endpoint: 'rpc-get_available_slots_cached' },
    },
  },
  thresholds: {
    http_req_failed: [{ threshold: 'rate<0.10', abortOnFail: true, delayAbortEval: '30s' }],
    // Direct RPC should be much faster than the edge function (no N+1). If
    // p95 is over 6s, the RPC itself has the same kind of issue and the test
    // should abort.
    http_req_duration: [{ threshold: 'p(95)<6000', abortOnFail: true, delayAbortEval: '30s' }],
  },
};

function pickPartySize() {
  return Math.floor(Math.random() * 6) + 1;
}

function pickDateWithinTwoWeeks() {
  const offsetDays = Math.floor(Math.random() * 14) + 1;
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

export function hitAvailabilityRpc() {
  const date = pickDateWithinTwoWeeks();
  const partySize = pickPartySize();
  // PostgREST RPC call — same shape supabase-js produces under the hood.
  const body = JSON.stringify({
    p_restaurant_id: RESTAURANT_ID,
    p_date: date,
    p_party_size: partySize,
  });

  const res = http.post(`${SUPABASE_URL}/rest/v1/rpc/get_available_slots_cached`, body, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      // Per supabase-js: tells PostgREST to return JSON directly, not an array.
      Accept: 'application/json',
    },
    tags: { endpoint: 'rpc-get_available_slots_cached' },
  });

  classifyResponse(res);
  check(res, {
    'rpc: 200 or 429': (r) => r.status === 200 || r.status === 429,
    'rpc: not 5xx': (r) => r.status < 500,
  });

  sleep(1 + Math.random());
}
