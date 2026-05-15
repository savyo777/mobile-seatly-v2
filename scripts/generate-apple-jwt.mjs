#!/usr/bin/env node
// Generate the Sign in with Apple "client_secret" JWT that Supabase requires.
// Apple-issued secrets expire every 6 months — re-run this when the current
// one is close to expiring and paste the output into:
//   Supabase Dashboard -> Authentication -> Providers -> Apple -> Secret Key.
//
// Usage (either env vars or CLI flags work):
//
//   node scripts/generate-apple-jwt.mjs \
//     --team-id ABCDEFGHIJ \
//     --key-id KKKKKKKKKK \
//     --client-id com.cenaiva.app.web \
//     --key-file ~/Downloads/AuthKey_KKKKKKKKKK.p8
//
//   APPLE_TEAM_ID=... APPLE_KEY_ID=... APPLE_CLIENT_ID=... APPLE_KEY_FILE=... \
//     node scripts/generate-apple-jwt.mjs
//
// Tip: append "| pbcopy" to copy the JWT straight onto your clipboard.

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createSign } from 'node:crypto';

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i += 1) {
    const flag = argv[i];
    if (!flag.startsWith('--')) continue;
    const key = flag.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) continue;
    out[key] = value;
    i += 1;
  }
  return out;
}

function base64url(buf) {
  return Buffer.from(buf).toString('base64').replace(/=+$/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function expandTilde(p) {
  if (!p) return p;
  if (p.startsWith('~/')) return resolve(process.env.HOME ?? '', p.slice(2));
  return resolve(p);
}

function die(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function usage() {
  process.stderr.write(
    'Required: --team-id <TEAM_ID> --key-id <KEY_ID> --client-id <SERVICES_ID> --key-file <path/to/AuthKey.p8>\n' +
      'Or set env: APPLE_TEAM_ID, APPLE_KEY_ID, APPLE_CLIENT_ID, APPLE_KEY_FILE\n',
  );
}

const args = parseArgs(process.argv.slice(2));
const teamId = args['team-id'] ?? process.env.APPLE_TEAM_ID;
const keyId = args['key-id'] ?? process.env.APPLE_KEY_ID;
const clientId = args['client-id'] ?? process.env.APPLE_CLIENT_ID;
const keyFile = args['key-file'] ?? process.env.APPLE_KEY_FILE;

if (!teamId || !keyId || !clientId || !keyFile) {
  usage();
  die('Missing required value.');
}

let pem;
try {
  pem = readFileSync(expandTilde(keyFile), 'utf8');
} catch (err) {
  die(`Could not read key file at ${keyFile}: ${err.message}`);
}
if (!pem.includes('BEGIN PRIVATE KEY')) {
  die('Key file does not look like an Apple .p8 (no "BEGIN PRIVATE KEY" header).');
}

const now = Math.floor(Date.now() / 1000);
const sixMonths = 15777000; // Apple's documented maximum.
const exp = now + sixMonths;

const header = { alg: 'ES256', kid: keyId, typ: 'JWT' };
const payload = {
  iss: teamId,
  iat: now,
  exp,
  aud: 'https://appleid.apple.com',
  sub: clientId,
};

const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;

const signer = createSign('SHA256');
signer.update(signingInput);
signer.end();
const signature = signer.sign({ key: pem, dsaEncoding: 'ieee-p1363' });

const jwt = `${signingInput}.${base64url(signature)}`;

process.stdout.write(`${jwt}\n`);
process.stderr.write(`Expires: ${new Date(exp * 1000).toISOString()} (regenerate before then)\n`);
