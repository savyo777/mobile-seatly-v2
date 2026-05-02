import { requireOptionalNativeModule } from 'expo';
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
const SILENCE_TIMEOUT_MS = 1_650;
const NO_SPEECH_TIMEOUT_MS = 6_000;
const TURN_TIMEOUT_MS = 30_000;
const NATIVE_TURN_TIMEOUT_MS = 12_000;
const METERING_SPEECH_DB = -50;
const MIN_RECORDING_MS = 2_400;

export type TranscriptionPhase =
  | 'idle'
  | 'requesting_permission'
  | 'recording'
  | 'transcribing';

type ListenResult = {
  transcript: string;
  stopped?: boolean;
};

type NativeSpeech = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted?: boolean; status?: string }>;
  addListener: (event: string, listener: (payload: unknown) => void) => { remove: () => void };
};

function initNativeSpeechModule(): NativeSpeech | null {
  const raw = requireOptionalNativeModule<NativeSpeech>('ExpoSpeechRecognition');
  if (!raw) return null;
  const stop = raw.stop.bind(raw);
  const abort = raw.abort.bind(raw);
  raw.stop = () => stop();
  raw.abort = () => abort();
  return raw;
}

const NATIVE_SPEECH = initNativeSpeechModule();

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

function nativeTranscriptFromResult(payload: unknown) {
  const event = payload as {
    isFinal?: boolean;
    results?: Array<{ transcript?: string }>;
    transcript?: string;
  };
  const transcript =
    event.results?.find((result) => result.transcript?.trim())?.transcript ??
    event.transcript ??
    '';
  return { transcript: transcript.trim(), isFinal: event.isFinal === true };
}

function isPermissionGranted(result: { granted?: boolean; status?: string }) {
  return result.granted === true || result.status === 'granted';
}

function shouldFallbackToNative(error: unknown) {
  if (!NATIVE_SPEECH) return false;
  const message = error instanceof Error ? error.message : String(error);
  return (
    !message.includes('not-allowed') &&
    !message.includes('voice-stt-unavailable') &&
    !message.includes('deepgram-')
  );
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
  const [lastError, setLastError] = useState<string | null>(null);
  const [phase, setPhase] = useState<TranscriptionPhase>('idle');

  const resolveRef = useRef<((value: ListenResult) => void) | null>(null);
  const rejectRef = useRef<((reason?: Error) => void) | null>(null);
  const isListeningRef = useRef(false);
  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hardStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const noSpeechRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stoppedRef = useRef(false);
  const speechDetectedRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const hintsRef = useRef<string[]>([]);
  const nativeCancelRef = useRef<((manualStop: boolean) => void) | null>(null);

  const setListening = useCallback((value: boolean) => {
    isListeningRef.current = value;
    setIsListening(value);
  }, []);

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

  const cancelNativeListening = useCallback((manualStop: boolean) => {
    nativeCancelRef.current?.(manualStop);
    nativeCancelRef.current = null;
  }, []);

  const startNativeSpeechRecognition = useCallback(
    async (hints: string[]): Promise<ListenResult> => {
      if (!NATIVE_SPEECH) throw new Error('native-speech-unavailable');

      setPhase('requesting_permission');
      const permission = await NATIVE_SPEECH.requestPermissionsAsync();
      if (!isPermissionGranted(permission)) {
        setPhase('idle');
        setPermissionDenied(true);
        setLastError('not-allowed');
        throw new Error('not-allowed');
      }

      return new Promise<ListenResult>((resolve, reject) => {
        let done = false;
        let timeout: ReturnType<typeof setTimeout> | null = null;
        let transcript = '';
        const subscriptions: Array<{ remove: () => void }> = [];

        const cleanup = () => {
          if (timeout) clearTimeout(timeout);
          timeout = null;
          for (const sub of subscriptions) sub.remove();
          nativeCancelRef.current = null;
        };

        const finish = (result: ListenResult, error?: Error) => {
          if (done) return;
          done = true;
          cleanup();
          setListening(false);
          setPhase('idle');
          if (error) {
            reject(error);
            return;
          }
          resolve(result);
        };

        const cancel = (manualStop: boolean) => {
          try {
            if (manualStop) NATIVE_SPEECH.stop();
            else NATIVE_SPEECH.abort();
          } catch {
            // ignore
          }
          finish({ transcript: '', stopped: manualStop });
        };

        nativeCancelRef.current = cancel;
        subscriptions.push(
          NATIVE_SPEECH.addListener('start', () => {
          setListening(true);
          setPhase('recording');
          setUnavailable(false);
          setPermissionDenied(false);
          setLastError(null);
          }),
          NATIVE_SPEECH.addListener('result', (payload: unknown) => {
            const next = nativeTranscriptFromResult(payload);
            if (next.transcript) {
              transcript = next.transcript;
              setLiveTranscript(next.transcript);
            }
            if (next.isFinal) finish({ transcript });
          }),
          NATIVE_SPEECH.addListener('error', (payload: unknown) => {
            const event = payload as { error?: string; message?: string };
            const code = event.error ?? 'native-speech-error';
            if (code === 'no-speech' || code === 'speech-timeout' || code === 'aborted') {
              finish({ transcript });
              return;
            }
            if (code === 'not-allowed') setPermissionDenied(true);
            if (code === 'service-not-allowed' || code === 'language-not-supported') setUnavailable(true);
            setLastError(code);
            finish({ transcript: '' }, new Error(code));
          }),
          NATIVE_SPEECH.addListener('end', () => {
            finish({ transcript });
          }),
        );

        timeout = setTimeout(() => {
          try {
            NATIVE_SPEECH.stop();
          } catch {
            finish({ transcript });
          }
        }, NATIVE_TURN_TIMEOUT_MS);

        try {
          setListening(true);
          setLiveTranscript('');
          setUnavailable(false);
          setPermissionDenied(false);
          setLastError(null);
          NATIVE_SPEECH.start({
            lang: 'en-US',
            interimResults: true,
            continuous: false,
            maxAlternatives: 3,
            contextualStrings: normalizeKeyterms(hints),
            addsPunctuation: true,
            iosTaskHint: 'search',
            iosVoiceProcessingEnabled: true,
            androidIntentOptions: {
              EXTRA_LANGUAGE_MODEL: 'free_form',
              EXTRA_PARTIAL_RESULTS: true,
              EXTRA_MAX_RESULTS: 3,
            },
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : 'native-speech-start-failed';
          setLastError(message);
          setPhase('idle');
          finish({ transcript: '' }, new Error(message));
        }
      });
    },
    [setListening],
  );

  const finish = useCallback(
    async (manualStop: boolean) => {
      clearTimers();
      if (!isListeningRef.current && !recorder.isRecording) return;
      stoppedRef.current = manualStop;
      setListening(false);

      try {
        await recorder.stop();
      } catch {
        // Recorder may already be stopped.
      }

      const uri = recorder.uri;
      if (manualStop || !uri) {
        setPhase('idle');
        resolveRef.current?.({ transcript: '', stopped: manualStop });
      } else {
        try {
          setPhase('transcribing');
          const transcript = await transcribe(uri);
          setLiveTranscript(transcript);
          setLastError(null);
          setPhase('idle');
          resolveRef.current?.({ transcript });
        } catch (err) {
          const error = err instanceof Error ? err : new Error(String(err));
          setLastError(error.message);
          setPhase('idle');
          rejectRef.current?.(error);
        }
      }

      resolveRef.current = null;
      rejectRef.current = null;
    },
    [clearTimers, recorder, setListening, transcribe],
  );

  const stopListening = useCallback(() => {
    cancelNativeListening(true);
    void finish(true);
  }, [cancelNativeListening, finish]);

  const startListening = useCallback(
    async (hints: string[] = []): Promise<ListenResult> => {
      if (!deepgramEnabled()) {
        if (NATIVE_SPEECH) return startNativeSpeechRecognition(hints);
        setUnavailable(true);
        setLastError('deepgram-stt-unavailable');
        throw new Error('deepgram-stt-unavailable');
      }
      if (!session?.access_token || !isSupabaseConfigured()) {
        setUnavailable(true);
        setLastError('voice-stt-unavailable');
        throw new Error('voice-stt-unavailable');
      }

      cancelNativeListening(true);
      await finish(true);
      hintsRef.current = hints;
      setUnavailable(false);
      setPermissionDenied(false);
      setLiveTranscript('');
      setLastError(null);
      setPhase('requesting_permission');
      stoppedRef.current = false;
      speechDetectedRef.current = false;
      lastSpeechAtRef.current = 0;
      recordingStartedAtRef.current = 0;

      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setPhase('idle');
        setPermissionDenied(true);
        setLastError('not-allowed');
        throw new Error('not-allowed');
      }

      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
          shouldPlayInBackground: false,
        });
        await recorder.prepareToRecordAsync();
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        const error = new Error(`recording-prepare-failed:${message}`);
        setLastError(error.message);
        setPhase('idle');
        if (shouldFallbackToNative(error)) return startNativeSpeechRecognition(hints);
        throw error;
      }

      const deepgramTurn = new Promise<ListenResult>((resolve, reject) => {
        resolveRef.current = resolve;
        rejectRef.current = reject;

        try {
          recorder.record();
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          const error = new Error(`recording-start-failed:${message}`);
          setLastError(error.message);
          resolveRef.current = null;
          rejectRef.current = null;
          reject(error);
          return;
        }
        setListening(true);
        setPhase('recording');
        recordingStartedAtRef.current = Date.now();

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
            now - recordingStartedAtRef.current > MIN_RECORDING_MS &&
            now - lastSpeechAtRef.current > SILENCE_TIMEOUT_MS
          ) {
            void finish(false);
          }
        }, 120);
      });

      try {
        return await deepgramTurn;
      } catch (err) {
        clearTimers();
        setListening(false);
        setPhase('idle');
        if (shouldFallbackToNative(err)) {
          return startNativeSpeechRecognition(hints);
        }
        throw err;
      }
    },
    [cancelNativeListening, clearTimers, finish, recorder, session?.access_token, startNativeSpeechRecognition],
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
    phase,
    permissionDenied,
    unavailable,
    lastError,
    startListening,
    stopListening,
  };
}
