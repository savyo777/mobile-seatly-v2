import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getSupabase } from '@/lib/supabase/client';
import {
  getCenaivaTtsVoiceId,
  normalizeCenaivaTtsVoice,
  type CenaivaTtsVoice,
} from '@/lib/cenaiva/voice/voicePreference';

type CenaivaVoicePreferenceContextValue = {
  voicePreference: CenaivaTtsVoice | null;
  voiceId: string | null;
  isLoading: boolean;
  isSaving: boolean;
  needsSelection: boolean;
  refresh: () => Promise<void>;
  setVoicePreference: (voice: CenaivaTtsVoice) => Promise<boolean>;
};

const CenaivaVoicePreferenceContext = createContext<CenaivaVoicePreferenceContextValue | null>(null);

export function useCenaivaVoicePreference() {
  const ctx = useContext(CenaivaVoicePreferenceContext);
  if (!ctx) {
    throw new Error(
      'useCenaivaVoicePreference must be used inside CenaivaVoicePreferenceProvider',
    );
  }
  return ctx;
}

function storageKeyForUser(authUserId: string) {
  return `@cenaiva/tts-voice/${authUserId}`;
}

export function CenaivaVoicePreferenceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuthSession();
  const currentUserId = user?.id ?? null;
  const [voicePreference, setVoicePreferenceState] = useState<CenaivaTtsVoice | null>(null);
  const [resolvedUserId, setResolvedUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const refresh = useCallback(async () => {
    const supabase = getSupabase();
    const authUserId = user?.id ?? '';

    if (!isAuthenticated || !authUserId) {
      setVoicePreferenceState(null);
      setIsLoading(false);
      setResolvedUserId(null);
      return;
    }

    const storageKey = storageKeyForUser(authUserId);
    setIsLoading(true);
    try {
      const cached = normalizeCenaivaTtsVoice(await AsyncStorage.getItem(storageKey));
      if (cached) {
        setVoicePreferenceState(cached);
        setResolvedUserId(authUserId);
      }

      if (!supabase) {
        if (!cached) setVoicePreferenceState(null);
        return;
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('cenaiva_tts_voice')
        .eq('auth_user_id', authUserId)
        .maybeSingle();

      if (error) {
        if (!cached) setVoicePreferenceState(null);
        return;
      }

      const remote = normalizeCenaivaTtsVoice(data?.cenaiva_tts_voice);
      if (remote) {
        setVoicePreferenceState(remote);
        await AsyncStorage.setItem(storageKey, remote);
        return;
      }

      await AsyncStorage.removeItem(storageKey).catch(() => undefined);
      setVoicePreferenceState(null);
    } catch {
      const cached = normalizeCenaivaTtsVoice(
        await AsyncStorage.getItem(storageKey).catch(() => null),
      );
      setVoicePreferenceState(cached);
    } finally {
      setIsLoading(false);
      setResolvedUserId(authUserId);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setVoicePreference = useCallback(
    async (voice: CenaivaTtsVoice) => {
      const supabase = getSupabase();
      const authUserId = user?.id ?? '';
      const storageKey = authUserId ? storageKeyForUser(authUserId) : '';

      if (!isAuthenticated || !authUserId) return false;

      setVoicePreferenceState(voice);
      setResolvedUserId(authUserId);
      setIsSaving(true);
      try {
        await AsyncStorage.setItem(storageKey, voice);

        if (!supabase) {
          return true;
        }

        const { error } = await supabase
          .from('user_profiles')
          .update({ cenaiva_tts_voice: voice })
          .eq('auth_user_id', authUserId);

        return !error;
      } catch {
        return true;
      } finally {
        setIsSaving(false);
      }
    },
    [isAuthenticated, user?.id],
  );

  const effectiveLoading =
    isLoading || (isAuthenticated && resolvedUserId !== currentUserId);

  const value = useMemo<CenaivaVoicePreferenceContextValue>(
    () => ({
      voicePreference,
      voiceId: effectiveLoading ? null : getCenaivaTtsVoiceId(voicePreference),
      isLoading: effectiveLoading,
      isSaving,
      needsSelection:
        isAuthenticated &&
        resolvedUserId === currentUserId &&
        !effectiveLoading &&
        voicePreference == null,
      refresh,
      setVoicePreference,
    }),
    [
      currentUserId,
      effectiveLoading,
      isAuthenticated,
      isSaving,
      refresh,
      resolvedUserId,
      setVoicePreference,
      voicePreference,
    ],
  );

  return (
    <CenaivaVoicePreferenceContext.Provider value={value}>
      {children}
    </CenaivaVoicePreferenceContext.Provider>
  );
}
