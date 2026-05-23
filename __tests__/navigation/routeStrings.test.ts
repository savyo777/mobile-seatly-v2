import * as fs from 'node:fs';
import * as path from 'node:path';

const repoRoot = path.resolve(__dirname, '../..');
const sourceRoots = ['app', 'components', 'lib'];
const ignoredRouteFragments = new Set([
  '/post-review',
  '/camera',
  '/booking',
  '/checkout',
  '/register-restaurant',
  '/(auth)',
]);

function walk(dir: string): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    if (!/\.(ts|tsx)$/.test(entry.name)) return [];
    return [full];
  });
}

function stripRouteNoise(route: string): string {
  return route
    .replace(/\$\{[^}]+\}/g, '__DYNAMIC__')
    .replace(/[?#].*$/, '')
    .replace(/\/+$/, '') || '/';
}

function publicRoute(route: string): string {
  const out = route
    .split('/')
    .filter((segment) => segment && !/^\(.+\)$/.test(segment))
    .join('/');
  return out ? `/${out}` : '/';
}

function fileRouteCandidates(file: string): string[] {
  if (!file.startsWith(path.join(repoRoot, 'app'))) return [];
  if (file.endsWith('_layout.tsx') || file.endsWith('_layout.ts')) return [];

  const rel = path.relative(path.join(repoRoot, 'app'), file).replace(/\.(tsx|ts)$/, '');
  const segments = rel.split(path.sep);
  const withoutIndex = segments[segments.length - 1] === 'index' ? segments.slice(0, -1) : segments;
  const grouped = withoutIndex.length ? `/${withoutIndex.join('/')}` : '/';
  return Array.from(new Set([grouped, publicRoute(grouped)]));
}

function routeToRegExp(route: string): RegExp {
  const escaped = route
    .split('/')
    .map((segment) => {
      if (!segment) return '';
      if (segment === '__DYNAMIC__' || /^\[.+\]$/.test(segment)) return '[^/]+';
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    })
    .join('/');
  return new RegExp(`^${escaped}$`);
}

// String fragments that LOOK like routes (begin with `/`) but are NOT
// router targets. The audit regex is intentionally broad so it catches
// drift; this list documents the false positives explicitly so the
// signal stays useful.
//
// Added 2026-05-23 (test was already broken before the audit cleanup
// — these matched in the source but had no Expo Router file behind
// them because they were never routes to begin with):
const KNOWN_NON_ROUTE_FRAGMENTS = new Set([
  '/__DYNAMIC__',                      // template literals truncated by stripRouteNoise — eg `/${id}`
  '/<slug>',                           // doc placeholder in lib/alerts/parseSlotOpenedRoute.ts
  '/[anything]',                       // doc placeholder in lib/auth/deepLinkPolicy.ts
  '/deals',                            // doc-string example in parseSlotOpenedRoute.ts
  '/review',                           // post-visit deep-link prefix, not a router file
  '/visit-photos',                     // storage subpath in lib/reviews/deleteMyReview.ts
  '/g, \'',                            // regex literal: .replace(/g, '...')
  '/ mo',                              // date format string in settings.tsx
  '/ month',                           // same
  '/booking/__DYNAMIC__/step2-time${qs.length ', // truncated template literal
]);

function extractRouteStrings(file: string): string[] {
  const source = fs.readFileSync(file, 'utf8');
  const out: string[] = [];
  const literal = /(['"`])(\/(?:\\.|(?!\1)[^\\])*?)\1/g;
  let match: RegExpExecArray | null;
  while ((match = literal.exec(source))) {
    const raw = match[2];
    if (!raw || raw.startsWith('//') || raw.includes('\n')) continue;
    if (raw.startsWith('/rest/') || raw.startsWith('/v1/')) continue;
    const stripped = stripRouteNoise(raw);
    if (KNOWN_NON_ROUTE_FRAGMENTS.has(stripped)) continue;
    out.push(stripped);
  }
  return Array.from(new Set(out));
}

describe('route string audit', () => {
  const files = sourceRoots.flatMap((root) => walk(path.join(repoRoot, root)));
  const routePatterns = files
    .flatMap(fileRouteCandidates)
    .map(routeToRegExp);

  it('keeps navigation route strings aligned with Expo Router files', () => {
    const failures: string[] = [];

    for (const file of files) {
      for (const route of extractRouteStrings(file)) {
        if (ignoredRouteFragments.has(route)) continue;
        const isAppRoute = routePatterns.some((pattern) => pattern.test(route));
        if (!isAppRoute) {
          failures.push(`${path.relative(repoRoot, file)} -> ${route}`);
        }
      }
    }

    expect(failures).toEqual([]);
  });
});
