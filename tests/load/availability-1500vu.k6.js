// 1500-VU concurrent-user test for the Cenaiva mobile diner "browse a
// restaurant" hot path.
//
// Differences vs the older browse-availability.k6.js (200 VUs, single restaurant):
//
//   1. RESTAURANT POOL (15 IDs) — defeats single-row cache locality that
//      otherwise inflates pass rates. Real diners browse many restaurants.
//   2. WIDER DATE WINDOW (1..21 days) — spreads load across more cached
//      (restaurant, date) tuples to mimic real browsing patterns.
//   3. REALISTIC PARTY SIZES [2, 4, 6, 8] — actual distribution per
//      analytics; party-size 1/3/5 are rare so we skip them.
//   4. RAMP: 1 → 200 → 750 → 1500 VUs over 8 min, then sustain at 1500
//      for the actual test. Pre-rewrite this would crater; post-rewrite
//      (get-availability v114) should hold comfortably.
//   5. THRESHOLDS reflect the post-rewrite goal: p95 < 3s, error rate < 1%.
//      Hard abort at p95 > 5s for 60s OR error rate > 5%.
//
// Anon-callable endpoint, no writes, no Stripe/AI side effects. Safe to
// run against production. Worst case: surfaces 429s if rate limits kick
// in (none expected on this endpoint).
//
// Run:
//   export SUPABASE_URL="https://exbjodmnpdiayfzrdyux.supabase.co"
//   export SUPABASE_ANON_KEY="<EXPO_PUBLIC_SUPABASE_ANON_KEY from .env>"
//   k6 run tests/load/availability-1500vu.k6.js
//
// See CLAUDE_SKILLS.md §17 (k6 load-test runbook) for context.

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter } from 'k6/metrics';

const SUPABASE_URL = __ENV.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing env. Set SUPABASE_URL and SUPABASE_ANON_KEY before running.');
}

// 15 published restaurants — hard-coded from a `SELECT id FROM restaurants
// WHERE is_published = true LIMIT 15` snapshot 2026-05-21. If the pool
// changes in production this list goes stale but the test still works
// (just hits a slightly different subset; a missing id returns 404 which
// the classifier counts as 4xx, not a crash).
const RESTAURANT_POOL = [
  '428964af-02b8-45ca-8973-3617b91bd718', // Georgy Inc
  'a1000001-1111-1111-1111-000000000001', // Harbour Sixty Steakhouse
  'a1000006-1111-1111-1111-000000000006', // David Duncan House
  'a1000002-1111-1111-1111-000000000002', // The Keg Mansion
  'a1000003-1111-1111-1111-000000000003', // Bâton Rouge Eaton Centre
  'a1000008-1111-1111-1111-000000000008', // Ruth's Chris Steak House
  'a1000004-1111-1111-1111-000000000004', // Blue Blood Steakhouse
  'a1000007-1111-1111-1111-000000000007', // Jacobs & Co. Steakhouse
  'a1000005-1111-1111-1111-000000000005', // STK Toronto
  'b1a68afa-d2c2-4593-b060-510e3c240754', // Qoop
  '04cc5b2f-ca1d-4e5b-8c7f-0ac1bcdce0ae', // Webhook Test Pizza
  'b4f4cac0-2c14-483b-a2b7-cbcee9908f24', // qoop
  '6de80570-678d-40bd-94bf-560a1022111b', // qoop main
  'f457774b-4523-4100-a9ca-935ff5f670bc', // qoop v67
  'cace80e2-19c6-402a-bfcc-13854c5552e3', // leo
];

const PARTY_SIZES = [2, 4, 6, 8];

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
        { duration: '90s', target: 200 },  // warm-up: stabilize connection pool
        { duration: '2m', target: 750 },   // climb
        { duration: '2m', target: 1500 },  // ramp to target
        { duration: '3m', target: 1500 },  // sustain at 1500 — the actual test
      ],
      gracefulRampDown: '15s',
      tags: { endpoint: 'get-availability', test: '1500vu' },
    },
  },
  // Post-rewrite thresholds. Edge fn v114 calls the cached RPC directly +
  // adds in-memory cache + CDN-friendly Cache-Control headers.
  // Pre-rewrite baseline was p95 ≈ 2.45s at 200 VUs; we expect < 1s here.
  thresholds: {
    http_req_failed: [
      { threshold: 'rate<0.01', abortOnFail: false }, // pass criterion: < 1% errors
      { threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '60s' }, // hard abort
    ],
    http_req_duration: [
      { threshold: 'p(95)<3000', abortOnFail: false }, // pass criterion
      { threshold: 'p(95)<5000', abortOnFail: true, delayAbortEval: '60s' }, // hard abort
    ],
  },
};

function pickRestaurantId() {
  return RESTAURANT_POOL[Math.floor(Math.random() * RESTAURANT_POOL.length)];
}

function pickPartySize() {
  return PARTY_SIZES[Math.floor(Math.random() * PARTY_SIZES.length)];
}

function pickDateWithinThreeWeeks() {
  const offsetDays = Math.floor(Math.random() * 21) + 1; // 1..21 days out
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function classifyResponse(res) {
  const status = res.status;
  if (status >= 200 && status < 300) success2xx.add(1);
  else if (status === 429) rateLimit429.add(1);
  else if (status >= 500) server5xx.add(1);
  else if (status >= 400) client4xxOther.add(1);
}

export function hitGetAvailability() {
  const restaurantId = pickRestaurantId();
  const date = pickDateWithinThreeWeeks();
  const partySize = pickPartySize();
  const url =
    `${SUPABASE_URL}/functions/v1/get-availability` +
    `?restaurant_id=${encodeURIComponent(restaurantId)}` +
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
    'get-availability: 200': (r) => r.status === 200,
    'get-availability: not 5xx': (r) => r.status < 500,
  });

  // Realistic diner browsing cadence — 1.5 to 2.5 seconds between page
  // interactions. Without think-time the test devolves into a benchmark
  // of how fast k6 can issue requests, not a realistic user count.
  sleep(1.5 + Math.random());
}
