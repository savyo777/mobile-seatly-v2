ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS cenaiva_tts_voice text
CHECK (cenaiva_tts_voice IN ('female', 'male'));
