// Cenaiva-branded TTS voice IDs come from build-time env. We previously
// shipped literal default voice IDs as fallbacks, which meant a missing env
// would silently use stale ElevenLabs voices forever. Instead, return null
// when the env is not set — callers already handle the null case (UI hides
// the voice picker / falls back to the OS TTS).
//
// To enable Cenaiva voices, set:
//   EXPO_PUBLIC_CENAIVA_TTS_VOICE_FEMALE_ID
//   EXPO_PUBLIC_CENAIVA_TTS_VOICE_MALE_ID

function resolveVoiceId(envValue: string | undefined): string | null {
  const trimmed = envValue?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

const CENAIVA_TTS_VOICE_IDS = {
  female: resolveVoiceId(process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_FEMALE_ID),
  male: resolveVoiceId(process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_MALE_ID),
} as const;

export type CenaivaTtsVoice = 'female' | 'male';

export const CENAIVA_TTS_VOICE_OPTIONS: Array<{
  value: CenaivaTtsVoice;
  label: string;
  subtitle: string;
}> = [
  {
    value: 'female',
    label: 'Female',
    subtitle: 'A brighter Hey Cenaiva voice.',
  },
  {
    value: 'male',
    label: 'Male',
    subtitle: 'A deeper Hey Cenaiva voice.',
  },
];

export function isCenaivaTtsVoice(value: unknown): value is CenaivaTtsVoice {
  return value === 'female' || value === 'male';
}

export function normalizeCenaivaTtsVoice(value: unknown): CenaivaTtsVoice | null {
  return isCenaivaTtsVoice(value) ? value : null;
}

export function getCenaivaTtsVoiceId(voice: CenaivaTtsVoice | null | undefined): string | null {
  if (!voice) return null;
  return CENAIVA_TTS_VOICE_IDS[voice] ?? null;
}

export function getCenaivaTtsVoiceLabel(voice: CenaivaTtsVoice | null | undefined): string {
  if (voice === 'female') return 'Female';
  if (voice === 'male') return 'Male';
  return 'Choose voice';
}
