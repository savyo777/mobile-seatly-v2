#!/usr/bin/env node
import { spawn } from 'node:child_process';

const DEFAULT_ROUTES = [
  '/',
  '/discover',
  '/notifications',
  '/profile',
  '/profile/settings',
  '/profile/favorites',
  '/profile/loyalty',
  '/activity',
  '/booking/r1/step2-time',
  '/home',
  '/profile',
  '/settings',
  '/notifications?returnTo=home',
  '/staff-members',
  '/menu',
];

const DEFAULT_BUNDLE_IDS = [
  'com.cenaiva.app',
  'com.savyo.cenaiva',
];

const fatalPatterns = [
  /RCTFatal/i,
  /RedBox/i,
  /Fatal.*Exception/i,
  /Unhandled JS Exception/i,
  /Terminating app due to uncaught exception/i,
];

function routeToUrl(route) {
  return `cenaiva://${route.replace(/^\/+/, '')}`;
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'], ...options });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${command} ${args.join(' ')} failed (${code})\n${stderr || stdout}`));
    });
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const routes = (process.env.CENAIVA_SMOKE_ROUTES?.split(',').map((r) => r.trim()).filter(Boolean))
    ?? DEFAULT_ROUTES;
  const bundleIds = (process.env.CENAIVA_IOS_BUNDLE_ID?.split(',').map((id) => id.trim()).filter(Boolean))
    ?? DEFAULT_BUNDLE_IDS;
  const settleMs = Number(process.env.CENAIVA_SMOKE_SETTLE_MS ?? 1200);
  const logLines = [];

  const logStream = spawn('xcrun', [
    'simctl',
    'spawn',
    'booted',
    'log',
    'stream',
    '--style',
    'compact',
    '--level',
    'debug',
  ], { stdio: ['ignore', 'pipe', 'pipe'] });

  logStream.stdout.on('data', (chunk) => logLines.push(chunk.toString()));
  logStream.stderr.on('data', (chunk) => logLines.push(chunk.toString()));

  let installedBundleId = null;
  const bundleErrors = [];
  for (const bundleId of bundleIds) {
    try {
      await run('xcrun', ['simctl', 'get_app_container', 'booted', bundleId]);
      installedBundleId = bundleId;
      break;
    } catch (error) {
      bundleErrors.push(`${bundleId}: ${error.message}`);
    }
  }

  if (!installedBundleId) {
    logStream.kill('SIGTERM');
    throw new Error(
      `Cenaiva is not installed on the booted simulator. Run the iOS dev build first.\n${bundleErrors.join('\n')}`,
    );
  }

  process.stdout.write(`Using bundle ${installedBundleId}\n`);

  for (const route of routes) {
    const url = routeToUrl(route);
    process.stdout.write(`Opening ${url}\n`);
    await run('xcrun', ['simctl', 'openurl', 'booted', url]);
    await wait(settleMs);
  }

  logStream.kill('SIGTERM');
  await wait(250);

  const logs = logLines.join('\n');
  const fatal = fatalPatterns.find((pattern) => pattern.test(logs));
  if (fatal) {
    throw new Error(`Smoke run found a fatal crash marker: ${fatal}\n\n${logs.slice(-8000)}`);
  }

  process.stdout.write(`Smoke run completed: ${routes.length} routes opened with no fatal markers.\n`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
