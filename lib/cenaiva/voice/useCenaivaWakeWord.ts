import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
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

const RESTART_BASE_MS = 180;
const RESTART_MAX_MS = 10_000;
const RESTART_AFTER_END_MS = 120;
const MAX_CONSECUTIVE_ERRORS = 4;
const WAKE_CONTEXT_STRINGS = [
  'Cenaiva',
  'Hey Cenaiva',
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

function transcriptFromResult(payload: unknown): string {
  const event = payload as {
    results?: Array<{ transcript?: string }>;
    transcript?: string;
  };
  if (typeof event.transcript === 'string') return event.transcript;
  return (event.results ?? [])
    .map((result) => result.transcript ?? '')
    .filter(Boolean)
    .join(' ');
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

  const forceStop = useCallback(() => {
    enabledRef.current = false;
    setEnabledState(false);
    consecutiveErrorsRef.current = 0;
    restartDelayRef.current = RESTART_BASE_MS;
    wakeActivatedRef.current = false;
    stopNative(true, true);
    activeRef.current = false;
    startingRef.current = false;
  }, [stopNative]);

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
      const recognizer = NATIVE_SPEECH.requestSpeechRecognizerPermissionsAsync
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
      const recognizer = NATIVE_SPEECH.getSpeechRecognizerPermissionsAsync
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
    if (startingRef.current || activeRef.current) {
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
        return;
      }

      startingRef.current = true;
      NATIVE_SPEECH.start({
        lang,
        interimResults: true,
        continuous: true,
        maxAlternatives: 5,
        addsPunctuation: false,
        contextualStrings: WAKE_CONTEXT_STRINGS,
        iosTaskHint: 'confirmation',
        iosVoiceProcessingEnabled: false,
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
  }, [getNativeState, hasPermission, lang, requestPermission]);

  const restartListening = useCallback(async () => {
    if (!NATIVE_SPEECH) return false;
    clearRestartTimer();
    consecutiveErrorsRef.current = 0;
    restartDelayRef.current = RESTART_BASE_MS;
    wakeActivatedRef.current = false;
    enabledRef.current = true;
    setEnabledState(true);
    if (activeRef.current || startingRef.current) {
      stopNative(true, true);
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    await startListening();
    return true;
  }, [clearRestartTimer, startListening, stopNative]);

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
    });

    const resultSub = NATIVE_SPEECH.addListener('result', (payload: unknown) => {
      activeRef.current = true;
      startingRef.current = false;
      const transcript = transcriptFromResult(payload);
      const isWakePhrase = isCenaivaImmediateWakePhrase(transcript);
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
      onWakeRef.current();
    });

    const errorSub = NATIVE_SPEECH.addListener('error', (payload: unknown) => {
      const event = payload as { error?: string };
      const error = event.error ?? 'unknown';
      if (error === 'no-speech') {
        activeRef.current = false;
        startingRef.current = false;
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
  }, [clearRestartTimer, forceStop, startListening, stopNative]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) {
      consecutiveErrorsRef.current = 0;
      restartDelayRef.current = RESTART_BASE_MS;
      wakeActivatedRef.current = false;
      void startListening();
    } else {
      stopNative(true, true);
    }
  }, [enabled, startListening, stopNative]);

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
