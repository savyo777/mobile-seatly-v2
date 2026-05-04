/**
 * Strict wake-word matcher.
 *
 * Earlier versions matched a huge fuzzy list including "hey gene", "hey jeni", "hes anova",
 * "heres anova", "survivor is anova", etc. Background TV / music / button sounds were enough
 * to trip those, which silently popped open the assistant (and its map) on login or random
 * button taps. The matcher below only fires for phrases that explicitly start with a known
 * greeting prefix and contain a token close to "cenaiva". No bare-word fallbacks, no broad
 * regexes.
 */

const GREETING_PREFIXES = ['hey', 'hi', 'hello', 'ok', 'okay', 'yo', 'hola', 'bonjour'] as const;

const CENAIVA_TARGETS = [
  'cenaiva',
  'cenaeva',
  'ceneiva',
  'senaiva',
  'sinaiva',
  'sanaiva',
  'sonaiva',
  'sanayva',
  'sinayva',
  'sinaiwa',
  'cenaivah',
  'senaivah',
] as const;

const FILLER_WORDS = new Set(['a', 'an', 'the', 'to', 's']);

export const WAKE_PHRASES = GREETING_PREFIXES.flatMap((prefix) =>
  CENAIVA_TARGETS.map((target) => `${prefix} ${target}`),
);

export const WAKE_FILLER_WORDS = FILLER_WORDS;

function normalizeTranscript(transcript: string): string {
  return transcript
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[.,!?]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function wordsFromTranscript(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  const current = new Array<number>(b.length + 1);

  for (let i = 1; i <= a.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + cost,
      );
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }

  return previous[b.length];
}

/** A token is "cenaiva-like" only when it almost spells one of the targets. */
function isCenaivaToken(value: string): boolean {
  if (value.length < 6 || value.length > 12) return false;
  return CENAIVA_TARGETS.some((target) => {
    if (value === target) return true;
    return editDistance(value, target) <= 1;
  });
}

function startsWithGreeting(words: string[]): number {
  if (!words.length) return -1;
  const first = words[0];
  return (GREETING_PREFIXES as readonly string[]).includes(first) ? 0 : -1;
}

/**
 * Strict: transcript must start with a greeting prefix and the next 1–3 (filler-skipped)
 * words must combine into a "cenaiva-like" token. No bare matches like "geneva",
 * "anova", "cinnabon", etc.
 */
function hasStrictWake(transcript: string): boolean {
  const words = wordsFromTranscript(transcript);
  const greetingIndex = startsWithGreeting(words);
  if (greetingIndex < 0) return false;

  const candidates = words
    .slice(greetingIndex + 1, greetingIndex + 6)
    .filter((word) => !FILLER_WORDS.has(word));
  if (!candidates.length) return false;

  for (let size = 1; size <= 3 && size <= candidates.length; size += 1) {
    const merged = candidates.slice(0, size).join('');
    if (isCenaivaToken(merged)) return true;
  }
  return false;
}

export function isCenaivaWakePhrase(transcript: string): boolean {
  const cleaned = normalizeTranscript(transcript);
  if (!cleaned) return false;
  if (WAKE_PHRASES.some((phrase) => cleaned === phrase || cleaned.endsWith(` ${phrase}`) || cleaned.startsWith(`${phrase} `) || cleaned.includes(` ${phrase} `))) {
    return true;
  }
  return hasStrictWake(cleaned);
}

/**
 * Same as `isCenaivaWakePhrase` — we no longer accept "early" partial guesses
 * because they were the main source of false positives.
 */
export function isCenaivaImmediateWakePhrase(transcript: string): boolean {
  return isCenaivaWakePhrase(transcript);
}
