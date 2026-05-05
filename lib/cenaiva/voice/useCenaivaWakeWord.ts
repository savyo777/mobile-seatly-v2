import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { isCenaivaImmediateWakePhrase } from '@/lib/cenaiva/voice/wakeWordPhrases';
import {
  UNKNOWN_VOICE_PERMISSION,
  resolveWakePermissionState,
  type CenaivaPermissionResult,
  type CenaivaVoicePermissionState,
} from '@/lib/cenaiva/voice/voicePermission';

type NativeSpeech = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<CenaivaPermissionResult>;
  getPermissionsAsync?: () => Promise<CenaivaPermissionResult>;
  getStateAsync?: () => Promise<'inactive' | 'starting' | 'recognizing' | 'stopping'>;
  requestMicrophonePermissionsAsync?: () => Promise<CenaivaPermissionResult>;
  getMicrophonePermissionsAsync?: () => Promise<CenaivaPermissionResult>;
  requestSpeechRecognizerPermissionsAsync?: () => Promise<CenaivaPermissionResult>;
  getSpeechRecognizerPermissionsAsync?: () => Promise<CenaivaPermissionResult>;
  isRecognitionAvailable?: () => boolean;
  addListener: (event: string, listener: (payload: unknown) => void) => { remove: () => void };
};

const RESTART_BASE_MS = 400;
const RESTART_MAX_MS = 10_000;
const RESTART_AFTER_END_MS = 400;
const MAX_CONSECUTIVE_ERRORS = 4;
const ROLLING_WAKE_WINDOW_MS = 3_500;
const ROLLING_WAKE_WORD_LIMIT = 18;
const USE_ON_DEVICE_WAKE_RECOGNITION = Platform.OS === 'ios';
const WAKE_CONTEXT_STRINGS = [
  'Cenaiva',
  'Hey Cenaiva',
  'Hey Caniva',
  'Hey Canniva',
  'Hey Cheneva',
  'Hey Chineva',
  'Hey Cindyiva',
  'Hey Coniva',
  'Hey Geneva',
  'Hey Genevia',
  'Hey Hasteniva',
  'Hey Hastenova',
  'Hey Jeaniva',
  'Hey Kennaiva',
  'Hey Saniva',
  'Hey Seneva',
  'Hey Senevia',
  'Hey Semiiva',
  'Hey Shaniva',
  'Hey Sinaiva',
  'Hey Siniva',
  'Hey Soniva',
  'Hey Son over',
  'Senaiva',
  'Saniva',
  'Soniva',
  'Sonova',
  'Anova',
  'Sin eye va',
  'Son over',
  'Hasanova',
  'Hastenova',
  'Cenaiva assistant',
  'restaurant',
  'reservation',
  'book a table',
];

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

function debugWake(message: string, details?: Record<string, unknown>) {
  if (process.env.EXPO_PUBLIC_CENAIVA_VOICE_DEBUG === 'true') {
    if (details) console.log(`[Cenaiva wake] ${message}`, details);
    else console.log(`[Cenaiva wake] ${message}`);
  }
}

function transcriptCandidateFromResult(result: unknown): string {
  if (!result) return '';
  if (typeof result === 'string') return result;
  if (Array.isArray(result)) {
    return result
      .map((item) => transcriptCandidateFromResult(item))
      .filter(Boolean)
      .join(' ');
  }
  const raw = result as {
    transcript?: unknown;
    alternatives?: Array<{ transcript?: string }>;
    0?: { transcript?: string };
  };
  if (typeof raw.transcript === 'string') return raw.transcript;
  if (typeof raw[0]?.transcript === 'string') return raw[0].transcript;
  return (raw.alternatives ?? [])
    .map((alternative) => alternative.transcript ?? '')
    .filter(Boolean)
    .join(' ');
}

function transcriptsFromResult(payload: unknown): string[] {
  const event = payload as {
    resultIndex?: number;
    results?: Array<unknown>;
    transcript?: string;
  };
  const transcripts: string[] = [];
  if (typeof event.transcript === 'string' && event.transcript.trim()) {
    transcripts.push(event.transcript);
  }
  const results = event.results ?? [];
  const startIndex = typeof event.resultIndex === 'number' ? event.resultIndex : 0;
  for (let i = startIndex; i < results.length; i += 1) {
    const transcript = transcriptCandidateFromResult(results[i]);
    if (transcript.trim()) transcripts.push(transcript);
  }
  if (results.length > 1) {
    const joined = results
      .map((result) => transcriptCandidateFromResult(result))
      .filter(Boolean)
      .join(' ');
    if (joined.trim()) transcripts.push(joined);
  }
  return [...new Set(transcripts.map((value) => value.trim()).filter(Boolean))];
}

export function useCenaivaWakeWord(onWake: () => void, lang = 'en-US') {
  const [enabled, setEnabledState] = useState(false);
  const enabledRef = useRef(false);
  const onWakeRef = useRef(onWake);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const restartDelayRef = useRef(RESTART_BASE_MS);
  const startingRef = useRef(false);
  const activeRef = useRef(false);
  const wakeActivatedRef = useRef(false);
  const rollingTranscriptRef = useRef('');
  const rollingTranscriptAtRef = useRef(0);
  const isSupported = !!NATIVE_SPEECH;
  const [permissionState, setPermissionState] = useState<CenaivaVoicePermissionState>(
    isSupported ? UNKNOWN_VOICE_PERMISSION : { status: 'unavailable', canAskAgain: false },
  );

  useEffect(() => {
    onWakeRef.current = onWake;
  });

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const stopNative = useCallback((abort = false, force = false) => {
    clearRestartTimer();
    if (!NATIVE_SPEECH) return;
    if (!force && !activeRef.current && !startingRef.current) return;
    try {
      if (abort) NATIVE_SPEECH.abort();
      else NATIVE_SPEECH.stop();
    } catch {
      // ignore
    } finally {
      activeRef.current = false;
      startingRef.current = false;
    }
  }, [clearRestartTimer]);

  const resetRollingTranscript = useCallback(() => {
    rollingTranscriptRef.current = '';
    rollingTranscriptAtRef.current = 0;
  }, []);

  const buildWakeCandidates = useCallback((transcripts: string[]) => {
    const now = Date.now();
    if (now - rollingTranscriptAtRef.current > ROLLING_WAKE_WINDOW_MS) {
      rollingTranscriptRef.current = '';
    }
    rollingTranscriptAtRef.current = now;

    const combined = [rollingTranscriptRef.current, ...transcripts]
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
    rollingTranscriptRef.current = combined
      .split(/\s+/)
      .slice(-ROLLING_WAKE_WORD_LIMIT)
      .join(' ');

    return [...new Set([...transcripts, rollingTranscriptRef.current].filter(Boolean))];
  }, []);

  const forceStop = useCallback(() => {
    enabledRef.current = false;
    setEnabledState(false);
    consecutiveErrorsRef.current = 0;
    restartDelayRef.current = RESTART_BASE_MS;
    wakeActivatedRef.current = false;
    resetRollingTranscript();
    stopNative(true, true);
    activeRef.current = false;
    startingRef.current = false;
  }, [resetRollingTranscript, stopNative]);

  const getNativeState = useCallback(async () => {
    if (!NATIVE_SPEECH?.getStateAsync) return 'unknown';
    try {
      return await NATIVE_SPEECH.getStateAsync();
    } catch {
      return 'unknown';
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!NATIVE_SPEECH) {
      setPermissionState({ status: 'unavailable', canAskAgain: false });
      return false;
    }

    try {
      const audioMic = await requestRecordingPermissionsAsync().catch(() => null);
      const speechMic = NATIVE_SPEECH.requestMicrophonePermissionsAsync
        ? await NATIVE_SPEECH.requestMicrophonePermissionsAsync().catch(() => null)
        : null;
      const recognizer = !USE_ON_DEVICE_WAKE_RECOGNITION && NATIVE_SPEECH.requestSpeechRecognizerPermissionsAsync
        ? await NATIVE_SPEECH.requestSpeechRecognizerPermissionsAsync().catch(() => null)
        : null;

      if (speechMic || recognizer) {
        const next = resolveWakePermissionState({
          microphone: [audioMic, speechMic],
          speechRecognizer: recognizer,
        });
        setPermissionState(next);
        return next.status === 'granted';
      }

      const result = await NATIVE_SPEECH.requestPermissionsAsync();
      const next = resolveWakePermissionState({
        microphone: [audioMic, result],
      });
      setPermissionState(next);
      return next.status === 'granted';
    } catch {
      setPermissionState({ status: 'unavailable', canAskAgain: false });
      return false;
    }
  }, []);

  const hasPermission = useCallback(async () => {
    if (!NATIVE_SPEECH) {
      setPermissionState({ status: 'unavailable', canAskAgain: false });
      return false;
    }

    try {
      const audioMic = await getRecordingPermissionsAsync().catch(() => null);
      const speechMic = NATIVE_SPEECH.getMicrophonePermissionsAsync
        ? await NATIVE_SPEECH.getMicrophonePermissionsAsync().catch(() => null)
        : null;
      const recognizer = !USE_ON_DEVICE_WAKE_RECOGNITION && NATIVE_SPEECH.getSpeechRecognizerPermissionsAsync
        ? await NATIVE_SPEECH.getSpeechRecognizerPermissionsAsync().catch(() => null)
        : null;

      if (speechMic || recognizer) {
        const next = resolveWakePermissionState({
          microphone: [audioMic, speechMic],
          speechRecognizer: recognizer,
        });
        setPermissionState(next);
        return next.status === 'granted';
      }

      if (!NATIVE_SPEECH.getPermissionsAsync) {
        const next = resolveWakePermissionState({
          microphone: [audioMic],
        });
        setPermissionState(next);
        return next.status === 'granted';
      }
      const result = await NATIVE_SPEECH.getPermissionsAsync();
      const next = resolveWakePermissionState({
        microphone: [audioMic, result],
      });
      setPermissionState(next);
      return next.status === 'granted';
    } catch {
      setPermissionState({ status: 'unavailable', canAskAgain: false });
      return false;
    }
  }, []);

  const openPermissionSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch {
      // ignore
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!NATIVE_SPEECH || !enabledRef.current) return;
    clearRestartTimer();
    if (startingRef.current || activeRef.current) {
      debugWake('start skipped; already active');
      return;
    }
    let granted = await hasPermission();
    if (!granted && enabledRef.current) {
      granted = await requestPermission();
    }
    if (!granted || !enabledRef.current) {
      enabledRef.current = false;
      setEnabledState(false);
      return;
    }

    try {
      const available = NATIVE_SPEECH.isRecognitionAvailable?.();
      if (available === false) {
        return;
      }

      const nativeState = await getNativeState();
      if (nativeState !== 'unknown' && nativeState !== 'inactive') {
        activeRef.current = nativeState === 'recognizing';
        startingRef.current = nativeState === 'starting';
        debugWake('native state already active', { nativeState });
        return;
      }

      startingRef.current = true;
      resetRollingTranscript();
      debugWake('start listening');
      NATIVE_SPEECH.start({
        lang,
        interimResults: true,
        continuous: true,
        maxAlternatives: 1,
        requiresOnDeviceRecognition: USE_ON_DEVICE_WAKE_RECOGNITION,
        addsPunctuation: false,
        contextualStrings: WAKE_CONTEXT_STRINGS,
        iosTaskHint: 'search',
        volumeChangeEventOptions: { enabled: true, intervalMillis: 150 },
        androidIntentOptions: {
          EXTRA_LANGUAGE_MODEL: 'free_form',
          EXTRA_PARTIAL_RESULTS: true,
          EXTRA_MAX_RESULTS: 3,
          EXTRA_SPEECH_INPUT_COMPLETE_SILENCE_LENGTH_MILLIS: 1_000,
          EXTRA_SPEECH_INPUT_POSSIBLY_COMPLETE_SILENCE_LENGTH_MILLIS: 700,
        },
      });
    } catch {
      startingRef.current = false;
      activeRef.current = false;
      consecutiveErrorsRef.current += 1;
      restartDelayRef.current = Math.min(restartDelayRef.current * 2, RESTART_MAX_MS);
    }
  }, [clearRestartTimer, getNativeState, hasPermission, lang, requestPermission, resetRollingTranscript]);

  const restartListening = useCallback(async () => {
    if (!NATIVE_SPEECH) return false;
    clearRestartTimer();
    consecutiveErrorsRef.current = 0;
    restartDelayRef.current = RESTART_BASE_MS;
    wakeActivatedRef.current = false;
    resetRollingTranscript();
    enabledRef.current = true;
    setEnabledState(true);
    if (activeRef.current || startingRef.current) {
      stopNative(true, true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await startListening();
    return true;
  }, [clearRestartTimer, resetRollingTranscript, startListening, stopNative]);

  const setEnabled = useCallback((value: boolean) => {
    if (!NATIVE_SPEECH) return;
    enabledRef.current = value;
    setEnabledState(value);
    if (!value) stopNative(true, true);
  }, [stopNative]);

  useEffect(() => {
    if (!NATIVE_SPEECH) return undefined;

    const startSub = NATIVE_SPEECH.addListener('start', () => {
      activeRef.current = true;
      startingRef.current = false;
      debugWake('native start');
    });

    const resultSub = NATIVE_SPEECH.addListener('result', (payload: unknown) => {
      activeRef.current = true;
      startingRef.current = false;
      const transcripts = transcriptsFromResult(payload);
      const wakeCandidates = buildWakeCandidates(transcripts);
      const isWakePhrase = wakeCandidates.some((transcript) => isCenaivaImmediateWakePhrase(transcript));
      const longestTranscript = transcripts.reduce(
        (longest, transcript) => (transcript.length > longest.length ? transcript : longest),
        '',
      );
      if (longestTranscript) {
        debugWake('result', {
          isWakePhrase,
          length: longestTranscript.length,
          transcript: longestTranscript,
        });
      }
      if (!isWakePhrase) {
        if (consecutiveErrorsRef.current > 0) {
          consecutiveErrorsRef.current = 0;
          restartDelayRef.current = RESTART_BASE_MS;
        }
        return;
      }
      if (wakeActivatedRef.current) return;

      wakeActivatedRef.current = true;
      enabledRef.current = false;
      setEnabledState(false);
      activeRef.current = false;
      startingRef.current = false;
      consecutiveErrorsRef.current = 0;
      restartDelayRef.current = RESTART_BASE_MS;
      resetRollingTranscript();
      onWakeRef.current();
      try {
        NATIVE_SPEECH.abort();
      } catch {
        // Native recognizer may have already stopped after emitting the wake result.
      }
    });

    const errorSub = NATIVE_SPEECH.addListener('error', (payload: unknown) => {
      const event = payload as { error?: string };
      const error = event.error ?? 'unknown';
      debugWake('error', { error });
      if (error === 'no-speech' || error === 'speech-timeout') {
        activeRef.current = false;
        startingRef.current = false;
        if (enabledRef.current) {
          clearRestartTimer();
          restartTimerRef.current = setTimeout(() => {
            restartTimerRef.current = null;
            void startListening();
          }, Math.max(restartDelayRef.current, RESTART_AFTER_END_MS));
        }
        return;
      }
      if (error === 'aborted') return;

      activeRef.current = false;
      startingRef.current = false;
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[Cenaiva wake error]', error);
      }
      if (error === 'not-allowed' || error === 'service-not-allowed') {
        setPermissionState(
          error === 'service-not-allowed'
            ? { status: 'unavailable', canAskAgain: false }
            : { status: 'blocked', canAskAgain: false },
        );
        forceStop();
        return;
      }
      consecutiveErrorsRef.current += 1;
      restartDelayRef.current = Math.min(restartDelayRef.current * 2, RESTART_MAX_MS);
    });

    const endSub = NATIVE_SPEECH.addListener('end', () => {
      activeRef.current = false;
      startingRef.current = false;
      debugWake('native end', { enabled: enabledRef.current });
      if (!enabledRef.current) return;
      if (consecutiveErrorsRef.current >= MAX_CONSECUTIVE_ERRORS) {
        forceStop();
        return;
      }
      clearRestartTimer();
      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;
        void startListening();
      }, Math.max(restartDelayRef.current, RESTART_AFTER_END_MS));
    });

    return () => {
      startSub.remove();
      resultSub.remove();
      errorSub.remove();
      endSub.remove();
      stopNative(true, true);
    };
  }, [buildWakeCandidates, clearRestartTimer, forceStop, resetRollingTranscript, startListening, stopNative]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) {
      consecutiveErrorsRef.current = 0;
      restartDelayRef.current = RESTART_BASE_MS;
      wakeActivatedRef.current = false;
      resetRollingTranscript();
      void startListening();
    } else {
      stopNative(true, true);
    }
  }, [enabled, resetRollingTranscript, startListening, stopNative]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        forceStop();
      }
    });
    return () => sub.remove();
  }, [forceStop]);

  return {
    enabled,
    isSupported,
    permissionState,
    permissionStatus: permissionState.status,
    canAskAgain: permissionState.canAskAgain,
    setEnabled,
    forceStop,
    restartListening,
    requestPermission,
    hasPermission,
    openPermissionSettings,
  };
}
