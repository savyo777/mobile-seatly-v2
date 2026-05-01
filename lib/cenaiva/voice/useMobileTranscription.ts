import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

const DEEPGRAM_URL = 'https://api.deepgram.com/v1/listen';
const MAX_KEYTERMS = 12;
const SILENCE_TIMEOUT_MS = 700;
const NO_SPEECH_TIMEOUT_MS = 4_000;
const TURN_TIMEOUT_MS = 30_000;
const METERING_SPEECH_DB = -45;

type ListenResult = {
  transcript: string;
  stopped?: boolean;
};

function deepgramEnabled() {
  return process.env.EXPO_PUBLIC_DEEPGRAM_STT_ENABLED !== 'false';
}

function normalizeKeyterms(hints: string[] = []) {
  return Array.from(new Set(hints.map((hint) => hint.trim()).filter(Boolean))).slice(0, MAX_KEYTERMS);
}

function buildDeepgramUrl(hints: string[]) {
  const params = new URLSearchParams({
    model: 'nova-3',
    language: 'en',
    smart_format: 'true',
    punctuate: 'true',
  });
  for (const term of normalizeKeyterms(hints)) {
    params.append('keyterm', term);
  }
  return `${DEEPGRAM_URL}?${params.toString()}`;
}

export function useMobileTranscription() {
  const { session } = useAuthSession();
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const resolveRef = useRef<((value: ListenResult) => void) | null>(null);
  const rejectRef = useRef<((reason?: Error) => void) | null>(null);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const hintsRef = useRef<string[]>([]);

  const clearTimers = useCallback(() => {
    if (monitorRef.current) clearInterval(monitorRef.current);
    if (hardStopRef.current) clearTimeout(hardStopRef.current);
    if (noSpeechRef.current) clearTimeout(noSpeechRef.current);
    monitorRef.current = null;
    hardStopRef.current = null;
    noSpeechRef.current = null;
  }, []);

  const fetchDeepgramToken = useCallback(async () => {
    if (!isSupabaseConfigured() || !session?.access_token) return null;
    const { url, anonKey } = getSupabaseEnv();
    const response = await fetch(`${url}/functions/v1/deepgram-live-token`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        apikey: anonKey,
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { access_token?: string };
    return json.access_token ?? null;
  }, [session?.access_token]);

  const transcribe = useCallback(
    async (uri: string): Promise<string> => {
      const token = await fetchDeepgramToken();
      if (!token) throw new Error('deepgram-token-unavailable');
      const audio = await fetch(uri);
      const blob = await audio.blob();
      const response = await fetch(buildDeepgramUrl(hintsRef.current), {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': blob.type || 'audio/mp4',
        },
        body: blob,
      });
      if (!response.ok) throw new Error(`deepgram-http-${response.status}`);
      const json = (await response.json()) as {
        results?: { channels?: Array<{ alternatives?: Array<{ transcript?: string }> }> };
      };
      return json.results?.channels?.[0]?.alternatives?.[0]?.transcript?.trim() ?? '';
    },
    [fetchDeepgramToken],
  );

  const finish = useCallback(
    async (manualStop: boolean) => {
      clearTimers();
      if (!isListening && !recorder.isRecording) return;
      stoppedRef.current = manualStop;
      setIsListening(false);

      try {
        await recorder.stop();
      } catch {
        // Recorder may already be stopped.
      }

      const uri = recorder.uri;
      if (manualStop || !uri) {
        resolveRef.current?.({ transcript: '', stopped: manualStop });
      } else {
        try {
          const transcript = await transcribe(uri);
          setLiveTranscript(transcript);
          resolveRef.current?.({ transcript });
        } catch (err) {
          rejectRef.current?.(err instanceof Error ? err : new Error(String(err)));
        }
      }

      resolveRef.current = null;
      rejectRef.current = null;
    },
    [clearTimers, isListening, recorder, transcribe],
  );

  const stopListening = useCallback(() => {
    void finish(true);
  }, [finish]);

  const startListening = useCallback(
    async (hints: string[] = []): Promise<ListenResult> => {
      if (!deepgramEnabled()) {
        setUnavailable(true);
        throw new Error('deepgram-stt-unavailable');
      }
      if (!session?.access_token || !isSupabaseConfigured()) {
        setUnavailable(true);
        throw new Error('voice-stt-unavailable');
      }

      stopListening();
      hintsRef.current = hints;
      setUnavailable(false);
      setPermissionDenied(false);
      setLiveTranscript('');
      stoppedRef.current = false;
      speechDetectedRef.current = false;
      lastSpeechAtRef.current = 0;

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        throw new Error('not-allowed');
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        shouldPlayInBackground: false,
      });
      await recorder.prepareToRecordAsync();

      return new Promise<ListenResult>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        recorder.record();
        setIsListening(true);

        noSpeechRef.current = setTimeout(() => {
          void finish(false);
        }, NO_SPEECH_TIMEOUT_MS);

        hardStopRef.current = setTimeout(() => {
          void finish(false);
        }, TURN_TIMEOUT_MS);

        monitorRef.current = setInterval(() => {
          const status = recorder.getStatus();
          const metering = status.metering;
          const speaking = typeof metering === 'number' ? metering > METERING_SPEECH_DB : false;
          const now = Date.now();

          if (speaking) {
            speechDetectedRef.current = true;
            lastSpeechAtRef.current = now;
            if (noSpeechRef.current) {
              clearTimeout(noSpeechRef.current);
              noSpeechRef.current = null;
            }
          }

          if (
            speechDetectedRef.current &&
            lastSpeechAtRef.current > 0 &&
            now - lastSpeechAtRef.current > SILENCE_TIMEOUT_MS
          ) {
            void finish(false);
          }
        }, 120);
      });
    },
    [finish, recorder, session?.access_token, stopListening],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') stopListening();
    });
    return () => {
      sub.remove();
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    liveTranscript,
    permissionDenied,
    unavailable,
    startListening,
    stopListening,
  };
}
