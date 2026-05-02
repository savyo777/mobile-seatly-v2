export const WAKE_PHRASES = [
  'hey cenaiva', 'hey senaiva', 'hey seneva', 'hey ceneva', 'hey ceniva',
  'hey soneva', 'hey caniva', 'hey cenefa',
  'hey sin iva', 'hey sin eva', 'hey sine iva', 'hey sine eva',
  'hey sin eye va', 'hey sine eye va', 'hey sin i va',
  'hey sinai va', 'hey sinai vuh', 'hey sinai', 'hey sinaiva', 'hey siniva',
  'hey sin eye', 'hey sine eye',
  'hey saniva', 'hey sonaiva', 'hey synova',
  'hey son iva', 'hey son eva', 'hey son either', 'hey son over',
  'hey geneva', 'hey chennai', 'hey chennaiwa', 'hey cheniva',
  'hey canova', 'hey sana', 'hey sene',
  'hey seen a va', 'hey see neva', 'hey seena va', 'hey seen eva',
  'hey cinnabon', 'hey siri cinnabon', 'hey siri cenaiva', 'hey siri ceneva', 'hey siri ceniva',
  'hasanova', 'hasanov', 'hastenova', 'hasen over', 'hason over',
  'hasen ova', 'hason ova', 'hason', 'hasen', 'hasenov',
  'hasanovo', 'hasanave', 'hasenova',
  'hastenov', 'hasten over', 'hasten ova', 'hasten iv', 'hasten ivor',
  'a son over', 'a sin over', 'a son ova', 'a sen ova',
  'payson over', 'payson ova', 'payson',
];

const WAKE_HEY_REGEX = /\bhey[\s,.!?\-]+[csk][a-z]*[aeiouy][a-z]*[vfwb][a-z]*\b/i;
const WAKE_SLURRED_REGEX = /\bh[ae]s(?:[aeiou]n|ten|in)[a-z]*(?:ov|iv|av|ef|eff)[a-z]*\b/i;

export function isCenaivaWakePhrase(transcript: string): boolean {
  const cleaned = transcript.toLowerCase().replace(/[.,!?]/g, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) return false;
  if (WAKE_PHRASES.some((phrase) => cleaned.includes(phrase))) return true;
  if (WAKE_HEY_REGEX.test(cleaned)) return true;
  if (WAKE_SLURRED_REGEX.test(cleaned)) return true;
  return false;
}
