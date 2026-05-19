/**
 * Drift guard: every Alert.alert / setError-family call that fires from
 * an error or warning context must route through friendlyError() from
 * lib/errors/friendlyError.ts. A future commit that swaps a literal for
 * err.message and forgets to wrap will fail this test in CI.
 *
 * The test walks the mobile JS bundle (app/, components/, hooks/, lib/,
 * modules/) and looks for `Alert.alert(...)` calls whose second arg
 * matches a known raw-error pattern WITHOUT a friendlyError wrapper.
 * Same for `setError(...)`, `setLastError(...)`, `setStatusError(...)`,
 * `setBanner({ ... message: ... })`.
 *
 * Patterns flagged (regex over the matched call):
 *   - `err.message` / `error.message` / `e.message`
 *   - `result.reason` / `reason ?? `
 *   - `String(err)` / `String(error)` / `String(e)`
 *   - `err?.message` / `error?.message` (optional-chained)
 *
 * Patterns allowed:
 *   - any text containing `friendlyError(`
 *   - any text containing `isUserCancellation(`
 *   - file-level escape hatch via `// allow-raw-error-message` on the
 *     SAME LINE as the Alert.alert/setError opener
 */

import { existsSync, readFileSync } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';

const REPO_ROOT = resolve(__dirname, '..', '..');
const SEARCH_DIRS = ['app', 'components', 'hooks', 'lib', 'modules'];

const EXCLUDED_PATH_FRAGMENTS = [
  'mobile-seatly-v2-2',
  'node_modules',
  '__tests__',
  '.expo',
  '.git',
  'plugins',
];

const FILE_EXTENSIONS = ['.ts', '.tsx'];

// Heuristic: the regex captures call-spans up to ~3 lines after the
// opener, which covers the common multi-line Alert.alert(...) pattern.
const CALL_OPENER = /\b(Alert\.alert|setError|setLastError|setStatusError|setBanner)\s*\(/g;

const RAW_PATTERNS = [
  /\b(err|error|e|caught|caughtErr)\??\.message\b/,
  /\bresult\.reason\b/,
  /\bString\((err|error|e)\)/,
  /\b(err|error|e)\?\.message\b/,
];

// Escape hatch: same-line `// allow-raw-error-message` suppresses the
// finding. Useful for the rare cases where the source string is known
// to be safe (e.g. a code already in the friendlyError dictionary).
const ESCAPE_HATCH = /\/\/\s*allow-raw-error-message/;

function listFilesRecursive(dir: string): string[] {
  const out: string[] = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (EXCLUDED_PATH_FRAGMENTS.some((frag) => full.includes(frag))) continue;
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFilesRecursive(full));
      continue;
    }
    if (FILE_EXTENSIONS.some((ext) => full.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

type Finding = { file: string; line: number; excerpt: string; matched: string };

function findLeaksInFile(file: string): Finding[] {
  const text = readFileSync(file, 'utf8');
  const lines = text.split('\n');
  const findings: Finding[] = [];

  // Walk every Alert.alert / setError opener, then capture up to ~5 lines
  // for the call body (multi-line calls are common after the prettier
  // pass). Skip closures that already include `friendlyError(`.
  let match: RegExpExecArray | null;
  CALL_OPENER.lastIndex = 0;
  while ((match = CALL_OPENER.exec(text)) !== null) {
    const openIdx = match.index;
    const before = text.slice(0, openIdx);
    const startLine = before.split('\n').length;

    // Slice forward and find the matching close-paren by depth tracking.
    let depth = 1;
    let cursor = openIdx + match[0].length;
    while (cursor < text.length && depth > 0) {
      const ch = text[cursor];
      if (ch === '(') depth += 1;
      else if (ch === ')') depth -= 1;
      cursor += 1;
    }
    const callText = text.slice(openIdx, cursor);

    if (callText.includes('friendlyError(') || callText.includes('isUserCancellation(')) {
      continue;
    }

    // Check the opener line for the escape hatch.
    const openerLine = lines[startLine - 1] ?? '';
    if (ESCAPE_HATCH.test(openerLine)) continue;

    for (const pat of RAW_PATTERNS) {
      const m = callText.match(pat);
      if (m) {
        findings.push({
          file: file.slice(REPO_ROOT.length + 1),
          line: startLine,
          excerpt: callText.replace(/\s+/g, ' ').slice(0, 160),
          matched: m[0],
        });
        break;
      }
    }
  }

  return findings;
}

describe('Error-leak drift guard', () => {
  it('every Alert.alert / setError-family call routes raw error sources through friendlyError', () => {
    const files = SEARCH_DIRS.flatMap((dir) =>
      listFilesRecursive(join(REPO_ROOT, dir)),
    );

    const findings: Finding[] = [];
    for (const file of files) {
      findings.push(...findLeaksInFile(file));
    }

    if (findings.length > 0) {
      const report = findings
        .map(
          (f) =>
            `  ${f.file}:${f.line}\n    matched: ${f.matched}\n    excerpt: ${f.excerpt}`,
        )
        .join('\n');
      throw new Error(
        `Found ${findings.length} Alert.alert / setError callsite(s) passing raw error fields ` +
          `without friendlyError. Wrap each with friendlyError(err, '...') from ` +
          `lib/errors/friendlyError.ts, OR add // allow-raw-error-message on the same line ` +
          `if the source is verified safe.\n\n${report}`,
      );
    }

    expect(findings).toEqual([]);
  });
});
