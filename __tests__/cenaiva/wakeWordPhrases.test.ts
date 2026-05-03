import {
  WAKE_PHRASES,
  isCenaivaImmediateWakePhrase,
  isCenaivaWakePhrase,
} from '@/lib/cenaiva/voice/wakeWordPhrases';

describe('isCenaivaWakePhrase', () => {
  const pronunciationTranscriptions = [
    'hey cenaiva',
    'hey cinaiva',
    'hey senaiva',
    'hey seneva',
    'hey ceneva',
    'hey cineva',
    'hey cinava',
    'hey ceneiva',
    'hey cenaeva',
    'hey cenefa',
    'hey sin iva',
    'hey sin eva',
    'hey sin ava',
    'hey sin aiva',
    'hey sine iva',
    'hey sine eva',
    'hey sinner eva',
    'hey cine eva',
    'hey sign iva',
    'hey sin eye va',
    'hey sine eye va',
    'hey sin i va',
    'hey sinai va',
    'hey sinai vuh',
    'hey sinaiva',
    'hey siniva',
    'hey sinayva',
    'hey sinay vuh',
    'hey syneva',
    'hey syniva',
    'hey saniva',
    'hey sanaiva',
    'hey sanai va',
    'hey sanaya',
    'hey sania',
    'hey sanya',
    'hey senai va',
    'hey senaya',
    'hey say naiva',
    'hey se naiva',
    'hey seh naiva',
    'hey se nay va',
    'hey soneva',
    'hey suneva',
    'hey suniva',
    'hey sonaiva',
    'hey son iva',
    'hey son eva',
    'hey son either',
    'hey son over',
    'hey soniva',
    'hey sonova',
    'hey sonia',
    'hey son ava',
    'hey son aiva',
    'hey so naiva',
    'hey sewn over',
    'hey geneva',
    'hey genaiva',
    'hey geniva',
    'hey jeniva',
    'hey janiva',
    'hey chennai',
    'hey chennaiwa',
    'hey cheniva',
    'hey cheneva',
    'hey sheniva',
    'hey caniva',
    'hey kaniva',
    'hey keniva',
    'hey canova',
    'hey anova',
    'hey a nova',
    'hey enova',
    'hey inova',
    'hey nova',
    'hey see nova',
    'hey zenaiva',
    'hey zeniva',
    'hey hacienda',
  ];

  const accentAndGreetingTranscriptions = [
    'hi cenaiva',
    'hi senaiva',
    'hi seneva',
    'hi geneva',
    'hi sin eye va',
    'high cenaiva',
    'high senaiva',
    'high geneva',
    'hiya cenaiva',
    'hiya senaiva',
    'hello cenaiva',
    'hello senaiva',
    'hello geneva',
    'okay cenaiva',
    'ok cenaiva',
    'yo cenaiva',
    'hola cenaiva',
    'hola senaiva',
    'bonjour cenaiva',
    'bonjour senaiva',
    'allo cenaiva',
    'salut cenaiva',
    'hey cenaíva',
    'hey cénaiva',
    'hey scène iva',
    'hey sin naïva',
    'hey señaiva',
    'hey zénaiva',
  ];

  const appleNativeTranscriptions = [
    'he’s Geneva',
    "he's Geneva",
    'hes geneva',
    'hes anova',
    'hes a nova',
    "here's Geneva",
    'heres geneva',
    "here's anova",
    'heres anova',
    "here's a nova",
    'heres a nova',
    "here's Cenaiva",
    'heres cenaiva',
    'here is cenaiva',
    'here is geneva',
    'geneva hey',
    'chernobyl hey hey geneva',
    "hey son over he's an over he's an over he's a neighbor he's another",
  ];

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

  it('recognizes the main observed pronunciation and accent transcription families', () => {
    for (const transcript of [
      ...pronunciationTranscriptions,
      ...accentAndGreetingTranscriptions,
      ...appleNativeTranscriptions,
    ]) {
      expect(isCenaivaImmediateWakePhrase(transcript)).toBe(true);
    }
  });

  it('recognizes early partial wake variants for immediate activation', () => {
    expect(isCenaivaImmediateWakePhrase('hey cena')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey sene')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('okay hey sin eye')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey siri ceni')).toBe(true);
  });

  it('recognizes fuzzy wake variants after hey for mobile speech recognition', () => {
    expect(isCenaivaImmediateWakePhrase('hey cinava')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('okay hey seniva')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey see naiva')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey sonova')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('hey geneva')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('geneva hey')).toBe(true);
    expect(isCenaivaImmediateWakePhrase('chernobyl hey hey geneva')).toBe(true);
  });

  it('recognizes noisy cumulative native transcripts from mobile wake listening', () => {
    const noisyWakeTranscripts = [
      "here's the no",
      "here's the nova",
      "here's the nova he's",
      "here's the nova he's anov",
      "here's the nova he's anova",
      "here's the nova he's anova he's a neighbor",
      "here's the nova he's anova he's a neighbor jason",
      "here's the nova he's anova he's a neighbor he's a neighbor and he's another",
      "hey son over he's an over he's an over he's a neighbor he's another",
      "um it's an ivor",
      "um it's an ivor a sana",
      "um it's an ivor a survivor",
      "um it's an ivor a survivor is anova is an over",
      'um ace and iva a soniva a sonova is a nova',
      'hey saniv',
      'hey saniva',
      'hey saniva hey son',
      "hey soniva he's an evil",
    ];

    for (const transcript of noisyWakeTranscripts) {
      expect(isCenaivaImmediateWakePhrase(transcript)).toBe(true);
    }
  });

  it('does not wake on unrelated restaurant speech', () => {
    expect(isCenaivaWakePhrase('book a table for two tonight')).toBe(false);
    expect(isCenaivaWakePhrase('show me italian restaurants nearby')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('hey can you book a table')).toBe(false);
  });

  it('does not wake on generic one-word fragments from noisy recognition', () => {
    expect(isCenaivaImmediateWakePhrase('hello')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('here')).toBe(false);
    expect(isCenaivaImmediateWakePhrase("here's")).toBe(false);
    expect(isCenaivaImmediateWakePhrase('he')).toBe(false);
    expect(isCenaivaImmediateWakePhrase("he's")).toBe(false);
    expect(isCenaivaImmediateWakePhrase("he's a")).toBe(false);
    expect(isCenaivaImmediateWakePhrase('son')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('um')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('um a')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('um is an')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('hey')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('hi')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('high')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('hiya')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('okay')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('yo')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('hola')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('bonjour')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('salut')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('here is')).toBe(false);
    expect(isCenaivaImmediateWakePhrase('he is')).toBe(false);
  });
});
