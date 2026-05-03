export const WAKE_PHRASES = [
  'hey cenaiva', 'hey senaiva', 'hey seneva', 'hey ceneva', 'hey ceniva',
  'hey cinaiva', 'hey cineva', 'hey cinava', 'hey ceneiva', 'hey cenaeva',
  'hey soneva', 'hey suneva', 'hey suniva', 'hey caniva', 'hey kaniva', 'hey keniva', 'hey cenefa',
  'hey sin iva', 'hey sin eva', 'hey sine iva', 'hey sine eva',
  'hey sin ava', 'hey sin aiva', 'hey sinner eva', 'hey cine eva',
  'hey sin eye va', 'hey sine eye va', 'hey sin i va', 'hey sign iva',
  'hey sinai va', 'hey sinai vuh', 'hey sinai', 'hey sinaiva', 'hey siniva',
  'hey sinayva', 'hey sinay vuh', 'hey sineva', 'hey syneva', 'hey syniva',
  'hey sin eye', 'hey sine eye',
  'hey saniva', 'hey sanaiva', 'hey sanai va', 'hey sanaya', 'hey sania', 'hey sanya',
  'hey senai va', 'hey senaya', 'hey say naiva',
  'hey se naiva', 'hey seh naiva', 'hey se nay va',
  'hey sonaiva', 'hey synova',
  'hey son iva', 'hey son eva', 'hey son either', 'hey son over', 'hey soniva', 'hey sonova', 'hey sonia',
  'hey son ava', 'hey son aiva', 'hey so naiva', 'hey sewn over',
  'hey geneva', 'hey genaiva', 'hey geniva', 'hey jeniva', 'hey janiva',
  'hey chennai', 'hey chennaiwa', 'hey cheniva', 'hey cheneva', 'hey sheniva',
  'hey canova', 'hey anova', 'hey a nova', 'hey enova', 'hey inova', 'hey nova',
  'hey sana', 'hey sene', 'hey zenaiva', 'hey zeniva', 'hey hacienda',
  'hey seen a va', 'hey see neva', 'hey seena va', 'hey seen eva', 'hey see nova',
  'hey cinnabon', 'hey siri cinnabon', 'hey siri cenaiva', 'hey siri ceneva', 'hey siri ceniva',
  'hi cenaiva', 'hi senaiva', 'hi seneva', 'hi geneva', 'hi sin eye va',
  'high cenaiva', 'high senaiva', 'high geneva', 'hiya cenaiva', 'hiya senaiva',
  'hello cenaiva', 'hello senaiva', 'hello geneva',
  'okay cenaiva', 'ok cenaiva', 'yo cenaiva',
  'hola cenaiva', 'hola senaiva', 'bonjour cenaiva', 'bonjour senaiva',
  'allo cenaiva', 'salut cenaiva',
  'hasanova', 'hasanov', 'hastenova', 'hasen over', 'hason over',
  'hasen ova', 'hason ova', 'hason', 'hasen', 'hasenov',
  'hasanovo', 'hasanave', 'hasenova',
  'hastenov', 'hasten over', 'hasten ova', 'hasten iv', 'hasten ivor',
  'a son over', 'a sin over', 'a son ova', 'a sen ova',
  'payson over', 'payson ova', 'payson',
];

const EARLY_WAKE_PHRASES = [
  'hey cena', 'hey cene', 'hey ceni', 'hey cenai', 'hey ceniv',
  'hey cina', 'hey cine', 'hey cinna', 'hey cinn',
  'hey sena', 'hey sene', 'hey seni', 'hey senai', 'hey say nai',
  'hey sina', 'hey sine', 'hey sinai', 'hey sin eye', 'hey sign',
  'hey sona', 'hey sone', 'hey suni', 'hey soni',
  'hey sana', 'hey sani', 'hey sanya', 'hey saniv', 'hey soniv',
  'hey seen', 'hey see ne', 'hey see na',
  'hey chena', 'hey chennai',
  'hey gene', 'hey genev', 'hey geni', 'hey jeni',
  'hi cena', 'hi sena', 'hi gene', 'high cena', 'hiya cena', 'hello cena', 'hello sena',
  'hola cena', 'bonjour cena',
  'hey siri cena', 'hey siri cene', 'hey siri ceni',
];

const NOISY_WAKE_PHRASES = [
  'heres the nova',
  'heres the nova hes anov',
  'heres the nova hes anova',
  'hes anov',
  'hes anova',
  'its an ivor',
  'um its an ivor',
  'survivor is anova',
  'survivor is an over',
  'ace and iva',
  'a soniva',
  'a sonova',
  'hes geneva',
  'hes anova',
  'hes a nova',
  'heres geneva',
  'heres anova',
  'heres a nova',
  'heres cenaiva',
  'heres senaiva',
  'here is cenaiva',
  'here is geneva',
];

const EARLY_NOISY_WAKE_PHRASES = [
  'heres the no',
  'heres the nov',
  'heres the nova',
  'hes anov',
  'its an ivor',
  'um its an ivor',
  'ace and iva',
  'a soniv',
  'a sonov',
  'hes genev',
  'hes anov',
  'heres genev',
  'heres anov',
];

const WAKE_HEY_REGEX = /\bhey[\s,.!?\-]+[csk][a-z]*[aeiouy][a-z]*[vfwb][a-z]*\b/i;
const WAKE_SLURRED_REGEX = /\bh[ae]s(?:[aeiou]n|ten|in)[a-z]*(?:ov|iv|av|ef|eff)[a-z]*\b/i;
const WAKE_PREFIX_WORDS = new Set([
  'hey',
  'hay',
  'hi',
  'hello',
  'ok',
  'okay',
  'yo',
  'high',
  'hiya',
  'hola',
  'bonjour',
  'allo',
  'salut',
  'hes',
  'heres',
]);
const WAKE_FILLER_WORDS = new Set(['a', 'an', 'the', 'to', 's']);
const FUZZY_WAKE_TARGETS = [
  'cenaiva',
  'cenaeva',
  'ceneiva',
  'senaiva',
  'ceneva',
  'ceniva',
  'cineva',
  'cinava',
  'cinaiva',
  'seneva',
  'seniva',
  'senayva',
  'sineva',
  'siniva',
  'sinaiva',
  'sinayva',
  'syneva',
  'syniva',
  'saniva',
  'sanaiva',
  'sonaiva',
  'soneva',
  'suneva',
  'suniva',
  'sonova',
  'soniva',
  'sania',
  'saniya',
  'sanya',
  'sanaya',
  'senaya',
  'sonia',
  'anova',
  'enova',
  'inova',
  'nova',
  'seenova',
  'geneva',
  'geniva',
  'genaiva',
  'jeniva',
  'janiva',
  'chennai',
  'cheneva',
  'sheniva',
  'cheniva',
  'caniva',
  'kaniva',
  'keniva',
  'canova',
  'zeniva',
  'zenaiva',
  'hacienda',
];

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

function containsPhrase(cleaned: string, phrase: string): boolean {
  return new RegExp(`(?:^|\\s)${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s)`).test(cleaned);
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

function isFuzzyWakeToken(value: string): boolean {
  if (value.length < 4 || value.length > 12) return false;
  return FUZZY_WAKE_TARGETS.some((target) => {
    if (value.includes(target) || target.includes(value)) return true;
    const maxDistance = target.length <= 6 ? 1 : 2;
    return editDistance(value, target) <= maxDistance;
  });
}

function compactCandidateWords(words: string[]): string[] {
  return words.filter((word) => !WAKE_FILLER_WORDS.has(word));
}

function hasFuzzyPrefixWake(transcript: string): boolean {
  const words = wordsFromTranscript(transcript);
  for (let i = 0; i < words.length; i += 1) {
    if (!WAKE_PREFIX_WORDS.has(words[i])) continue;
    const nextWords = compactCandidateWords(words.slice(i + 1, i + 6));
    for (let size = 1; size <= 4; size += 1) {
      const candidate = nextWords.slice(0, size).join('');
      if (isFuzzyWakeToken(candidate)) return true;
    }
  }
  return false;
}

function hasFuzzyWakeNearHey(transcript: string): boolean {
  const words = wordsFromTranscript(transcript);
  const heyIndexes = words
    .map((word, index) => (word === 'hey' ? index : -1))
    .filter((index) => index >= 0);
  if (!heyIndexes.length) return false;

  for (const heyIndex of heyIndexes) {
    const start = Math.max(0, heyIndex - 4);
    const end = Math.min(words.length, heyIndex + 5);
    for (let i = start; i < end; i += 1) {
      if (i === heyIndex) continue;
      for (let size = 1; size <= 4 && i + size <= end; size += 1) {
        const candidate = words.slice(i, i + size).join('');
        if (isFuzzyWakeToken(candidate)) return true;
      }
    }
  }

  return false;
}

export function isCenaivaWakePhrase(transcript: string): boolean {
  const cleaned = normalizeTranscript(transcript);
  if (!cleaned) return false;
  if (WAKE_PHRASES.some((phrase) => cleaned.includes(phrase))) return true;
  if (NOISY_WAKE_PHRASES.some((phrase) => containsPhrase(cleaned, phrase))) return true;
  if (WAKE_HEY_REGEX.test(cleaned)) return true;
  if (WAKE_SLURRED_REGEX.test(cleaned)) return true;
  if (hasFuzzyPrefixWake(cleaned)) return true;
  if (hasFuzzyWakeNearHey(cleaned)) return true;
  return false;
}

export function isCenaivaImmediateWakePhrase(transcript: string): boolean {
  const cleaned = normalizeTranscript(transcript);
  if (!cleaned) return false;
  if (isCenaivaWakePhrase(cleaned)) return true;
  if (EARLY_NOISY_WAKE_PHRASES.some((phrase) => containsPhrase(cleaned, phrase))) return true;
  return EARLY_WAKE_PHRASES.some((phrase) => containsPhrase(cleaned, phrase));
}
