import {
  getCenaivaTtsVoiceId,
  getCenaivaTtsVoiceLabel,
  normalizeCenaivaTtsVoice,
} from '@/lib/cenaiva/voice/voicePreference';

describe('voicePreference', () => {
  it('normalizes supported voice values', () => {
    expect(normalizeCenaivaTtsVoice('female')).toBe('female');
    expect(normalizeCenaivaTtsVoice('male')).toBe('male');
  });

  it('rejects unsupported values', () => {
    expect(normalizeCenaivaTtsVoice('girl')).toBeNull();
    expect(normalizeCenaivaTtsVoice('')).toBeNull();
    expect(normalizeCenaivaTtsVoice(null)).toBeNull();
  });

  it('maps semantic voices to elevenlabs ids', () => {
    expect(getCenaivaTtsVoiceId('female')).toBe('8vf2Pg7VZD0Piv8GA8v9');
    expect(getCenaivaTtsVoiceId('male')).toBe('f5HLTX707KIM4SzJYzSz');
    expect(getCenaivaTtsVoiceId(null)).toBeNull();
  });

  it('returns stable labels for UI surfaces', () => {
    expect(getCenaivaTtsVoiceLabel('female')).toBe('Female');
    expect(getCenaivaTtsVoiceLabel('male')).toBe('Male');
    expect(getCenaivaTtsVoiceLabel(null)).toBe('Choose voice');
  });
});
