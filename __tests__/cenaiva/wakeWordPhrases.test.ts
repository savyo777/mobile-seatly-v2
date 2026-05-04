import {
  WAKE_PHRASES,
  isCenaivaImmediateWakePhrase,
  isCenaivaWakePhrase,
} from '@/lib/cenaiva/voice/wakeWordPhrases';

/**
 * The wake matcher is intentionally strict: greeting prefix + a token that almost
 * spells "cenaiva". This was tightened after the lax fuzzy version triggered the
 * assistant (and its map) on background TV, music, and unrelated phrases like
 * "hes anova", "heres anova", "hey gene", "hey hacienda", "hey nova", etc.
 */
describe('isCenaivaWakePhrase (strict)', () => {
  const truePositives = [
    'hey cenaiva',
    'Hey Cenaiva',
    'okay, hey cenaiva!',
    'hey cenaeva',
    'hi cenaiva',
    'hello cenaiva',
    'okay cenaiva',
    'ok cenaiva',
    'yo cenaiva',
    'hola cenaiva',
    'bonjour cenaiva',
    'hey senaiva',
    'hey sanaiva',
    'hey sonaiva',
  ];

  const trueNegatives = [
    // Generic / fragments
    'hey',
    'hello',
    'okay',
    'hi',
    'hiya',
    'hola',
    'bonjour',
    "he's",
    'here',
    "here's",
    'he is',
    'um',
    // Unrelated speech
    'book a table for two tonight',
    'show me italian restaurants nearby',
    'hey can you book a table',
    // Previously false-positive opens
    'hey gene',
    'hey jeni',
    'hey nova',
    'hey geneva',
    'hey hacienda',
    'hey cinnabon',
    'hes anova',
    'heres anova',
    'survivor is anova',
    'here is geneva',
    'hes a nova',
    'a sonova',
    'um its an ivor',
    'chernobyl hey hey geneva',
  ];

  it('recognizes canonical greeting + cenaiva phrasing', () => {
    for (const phrase of truePositives) {
      expect(isCenaivaWakePhrase(phrase)).toBe(true);
      expect(isCenaivaImmediateWakePhrase(phrase)).toBe(true);
    }
  });

  it('recognizes every configured wake phrase variant', () => {
    for (const phrase of WAKE_PHRASES) {
      expect(isCenaivaWakePhrase(phrase)).toBe(true);
    }
  });

  it('does not wake on unrelated speech, fragments, or known false positives', () => {
    for (const phrase of trueNegatives) {
      expect(isCenaivaWakePhrase(phrase)).toBe(false);
      expect(isCenaivaImmediateWakePhrase(phrase)).toBe(false);
    }
  });
});
