function resolveVoiceId(envValue: string | undefined, fallback: string): string {
  const trimmed = envValue?.trim();
  return trimmed ? trimmed : fallback;
}

export const CENAIVA_TTS_VOICE_IDS = {
  female: resolveVoiceId(
    process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_FEMALE_ID,
    '8vf2Pg7VZD0Piv8GA8v9',
  ),
  male: resolveVoiceId(
    process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_MALE_ID,
    'f5HLTX707KIM4SzJYzSz',
  ),
} as const;

export type CenaivaTtsVoice = keyof typeof CENAIVA_TTS_VOICE_IDS;

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
