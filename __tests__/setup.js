// Jest setup. Runs before any test module loads. Use this to populate
// EXPO_PUBLIC_* env vars that tests depend on but Node doesn't have
// otherwise (Expo only sets these at build time via babel-preset-expo
// dotenv injection).
//
// 2026-05-23 audit fix: the voicePreference test asserts the prod
// female/male ElevenLabs IDs end-to-end, and AccountSecurity-style
// tests can hit env-gated branches. Mirror the values in .env here.
process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_FEMALE_ID =
  process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_FEMALE_ID ?? '8vf2Pg7VZD0Piv8GA8v9';
process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_MALE_ID =
  process.env.EXPO_PUBLIC_CENAIVA_TTS_VOICE_MALE_ID ?? 'f5HLTX707KIM4SzJYzSz';

// Demo mode must be OFF for production-shape tests to be meaningful.
process.env.EXPO_PUBLIC_CENAIVA_DEMO_MODE = 'false';
