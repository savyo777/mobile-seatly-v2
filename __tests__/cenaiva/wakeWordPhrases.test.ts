import {
  WAKE_PHRASES,
  isCenaivaImmediateWakePhrase,
  isCenaivaWakePhrase,
} from '@/lib/cenaiva/voice/wakeWordPhrases';

describe('isCenaivaWakePhrase', () => {
  it('recognizes canonical Hey Cenaiva phrasing', () => {
    expect(isCenaivaWakePhrase('Hey Cenaiva')).toBe(true);
    expect(isCenaivaWakePhrase('okay, hey cenaiva!')).toBe(true);
  });

  it('recognizes common phonetic variants from speech recognition', () => {
    expect(isCenaivaWakePhrase('hey sin eye va')).toBe(true);
    expect(isCenaivaWakePhrase('hey seneva')).toBe(true);
    expect(isCenaivaWakePhrase('hasen over')).toBe(true);
  });

  it('recognizes every configured wake phrase variant', () => {
    for (const phrase of WAKE_PHRASES) {
      expect(isCenaivaWakePhrase(phrase)).toBe(true);
    }
  });

  it('recognizes early partial wake variants for immediate activation', () => {
    expect(isCenaivaImmediateWakePhrase('hey cena')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey sene')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('okay hey sin eye')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey siri ceni')).toBe(true);
  });

  it('does not wake on unrelated restaurant speech', () => {
    expect(isCenaivaWakePhrase('book a table for two tonight')).toBe(false);
    expect(isCenaivaWakePhrase('show me italian restaurants nearby')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('hey can you book a table')).toBe(false);
  });
});
