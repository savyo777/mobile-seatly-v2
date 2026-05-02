import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Linking } from 'react-native';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
} from 'expo-audio';
import { isCenaivaWakePhrase } from '@/lib/cenaiva/voice/wakeWordPhrases';
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

const RESTART_BASE_MS = 500;
const RESTART_MAX_MS = 10_000;
const RESTART_AFTER_END_MS = 700;
const MAX_CONSECUTIVE_ERRORS = 4;
const DEBUG_TRANSCRIPT_INTERVAL_MS = 900;
const DEBUG_TRANSCRIPT_MAX_CHARS = 180;
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

function formatDebugTranscript(transcript: string): string {
  const cleaned = transcript.replace(/\s+/g, ' ').trim();
  return cleaned.length > DEBUG_TRANSCRIPT_MAX_CHARS
    ? `${cleaned.slice(0, DEBUG_TRANSCRIPT_MAX_CHARS)}...`
    : cleaned;
}

export function useCenaivaWakeWord(onWake: () => void, lang = 'en-US') {
  const [enabled, setEnabledState] = useState(false);
  const enabledRef = useRef(false);
  const onWakeRef = useRef(onWake);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const consecutiveErrorsRef = useRef(0);
  const restartDelayRef = useRef(RESTART_BASE_MS);
  const lastVolumeUpdateAtRef = useRef(0);
  const lastTranscriptRef = useRef('');
  const lastTranscriptDebugAtRef = useRef(0);
  const lastTranscriptLogRef = useRef('');
  const startingRef = useRef(false);
  const activeRef = useRef(false);
  const isSupported = !!NATIVE_SPEECH;
  const [permissionState, setPermissionState] = useState<CenaivaVoicePermissionState>(
    isSupported ? UNKNOWN_VOICE_PERMISSION : { status: 'unavailable', canAskAgain: false },
  );
  const [lastTranscript, setLastTranscript] = useState('');
  const [lastError, setLastError] = useState<string | null>(null);
  const [debugLines, setDebugLines] = useState<string[]>([]);
  const [noSpeechCount, setNoSpeechCount] = useState(0);
  const [lastAudioEvent, setLastAudioEvent] = useState('idle');
  const [audioLevel, setAudioLevel] = useState<number | null>(null);
  const [recognizerState, setRecognizerState] = useState('unknown');
  const [recognitionAvailable, setRecognitionAvailable] = useState<'unknown' | 'yes' | 'no'>(
    isSupported ? 'unknown' : 'no',
  );
  const [permissionDebug, setPermissionDebug] = useState('unknown');

  useEffect(() => {
    onWakeRef.current = onWake;
  });

  const appendDebugLine = useCallback((line: string) => {
    setDebugLines((current) => [line, ...current].slice(0, 6));
  }, []);

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
    stopNative(true, true);
    activeRef.current = false;
    startingRef.current = false;
  }, [stopNative]);

  const refreshNativeState = useCallback(async (label: string) => {
    if (!NATIVE_SPEECH?.getStateAsync) return 'unknown';
    try {
      const state = await NATIVE_SPEECH.getStateAsync();
      setRecognizerState(state);
      appendDebugLine(`${label}: ${state}`);
      return state;
    } catch {
      setRecognizerState('unknown');
      return 'unknown';
    }
  }, [appendDebugLine]);

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
        setPermissionDebug(
          `audio:${audioMic?.status ?? 'unknown'} speechMic:${speechMic?.status ?? 'unknown'} recognizer:${recognizer?.status ?? 'unknown'}`,
        );
        const next = resolveWakePermissionState({
          microphone: [audioMic, speechMic],
          speechRecognizer: recognizer,
        });
        setPermissionState(next);
        return next.status === 'granted';
      }

      const result = await NATIVE_SPEECH.requestPermissionsAsync();
      setPermissionDebug(`audio:${audioMic?.status ?? 'unknown'} combined:${result.status ?? 'unknown'}`);
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
        setPermissionDebug(
          `audio:${audioMic?.status ?? 'unknown'} speechMic:${speechMic?.status ?? 'unknown'} recognizer:${recognizer?.status ?? 'unknown'}`,
        );
        const next = resolveWakePermissionState({
          microphone: [audioMic, speechMic],
          speechRecognizer: recognizer,
        });
        setPermissionState(next);
        return next.status === 'granted';
      }

      if (!NATIVE_SPEECH.getPermissionsAsync) {
        setPermissionDebug(`audio:${audioMic?.status ?? 'unknown'}`);
        const next = resolveWakePermissionState({
          microphone: [audioMic],
        });
        setPermissionState(next);
        return next.status === 'granted';
      }
      const result = await NATIVE_SPEECH.getPermissionsAsync();
      setPermissionDebug(`audio:${audioMic?.status ?? 'unknown'} combined:${result.status ?? 'unknown'}`);
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
      appendDebugLine('Start skipped: recognizer busy');
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
        setRecognitionAvailable('no');
        setLastError('recognition-unavailable');
        appendDebugLine('Recognition unavailable');
        return;
      }
      setRecognitionAvailable(available === true ? 'yes' : 'unknown');

      const nativeState = await refreshNativeState('state before start');
      if (nativeState !== 'unknown' && nativeState !== 'inactive') {
        appendDebugLine(`Start skipped: native ${nativeState}`);
        return;
      }

      startingRef.current = true;
      setLastAudioEvent('starting recognition');
      NATIVE_SPEECH.start({
        lang,
        interimResults: true,
        continuous: false,
        maxAlternatives: 5,
        addsPunctuation: false,
        contextualStrings: WAKE_CONTEXT_STRINGS,
        iosTaskHint: 'search',
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
    } catch (err) {
      startingRef.current = false;
      activeRef.current = false;
      const message = err instanceof Error ? err.message : 'recognition-start-failed';
      setLastError(message);
      setLastAudioEvent('start failed');
      appendDebugLine(`Start failed: ${message}`);
      consecutiveErrorsRef.current += 1;
      restartDelayRef.current = Math.min(restartDelayRef.current * 2, RESTART_MAX_MS);
    }
  }, [appendDebugLine, hasPermission, lang, refreshNativeState, requestPermission]);

  const restartListening = useCallback(async () => {
    if (!NATIVE_SPEECH) return false;
    clearRestartTimer();
    consecutiveErrorsRef.current = 0;
    restartDelayRef.current = RESTART_BASE_MS;
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

    const eventSub = (eventName: string, label: string) =>
      NATIVE_SPEECH.addListener(eventName, () => {
        setLastAudioEvent(label);
        appendDebugLine(label);
      });

    const startSub = NATIVE_SPEECH.addListener('start', () => {
      activeRef.current = true;
      startingRef.current = false;
      setLastAudioEvent('recognition started');
      appendDebugLine('recognition started');
      void refreshNativeState('state after start');
    });
    const audioStartSub = eventSub('audiostart', 'audio started');
    const soundStartSub = eventSub('soundstart', 'sound started');
    const speechStartSub = eventSub('speechstart', 'speech started');
    const speechEndSub = eventSub('speechend', 'speech ended');
    const soundEndSub = eventSub('soundend', 'sound ended');
    const audioEndSub = eventSub('audioend', 'audio ended');
    const volumeSub = NATIVE_SPEECH.addListener('volumechange', (payload: unknown) => {
      const event = payload as { value?: number };
      if (typeof event.value !== 'number') return;
      const now = Date.now();
      if (now - lastVolumeUpdateAtRef.current < 300) return;
      lastVolumeUpdateAtRef.current = now;
      setAudioLevel(event.value);
      setLastAudioEvent(`volume ${event.value.toFixed(1)}`);
    });

    const resultSub = NATIVE_SPEECH.addListener('result', (payload: unknown) => {
      activeRef.current = true;
      startingRef.current = false;
      const transcript = transcriptFromResult(payload);
      const isWakePhrase = isCenaivaWakePhrase(transcript);
      if (transcript) {
        const now = Date.now();
        const changed = transcript !== lastTranscriptRef.current;
        lastTranscriptRef.current = transcript;
        setLastError(null);
        setNoSpeechCount(0);
        if (isWakePhrase || (changed && now - lastTranscriptDebugAtRef.current >= DEBUG_TRANSCRIPT_INTERVAL_MS)) {
          const logText = formatDebugTranscript(transcript);
          setLastTranscript(transcript);
          appendDebugLine(`Heard: ${logText}`);
          lastTranscriptDebugAtRef.current = now;
        }
        if (process.env.NODE_ENV !== 'production' && isWakePhrase && transcript !== lastTranscriptLogRef.current) {
          const logText = formatDebugTranscript(transcript);
          lastTranscriptLogRef.current = transcript;
          console.info('[Cenaiva wake transcript]', logText);
        }
      }
      if (!isWakePhrase) {
        if (consecutiveErrorsRef.current > 0) {
          consecutiveErrorsRef.current = 0;
          restartDelayRef.current = RESTART_BASE_MS;
        }
        return;
      }

      enabledRef.current = false;
      setEnabledState(false);
      activeRef.current = false;
      startingRef.current = false;
      consecutiveErrorsRef.current = 0;
      restartDelayRef.current = RESTART_BASE_MS;
      stopNative();
      onWakeRef.current();
    });

    const errorSub = NATIVE_SPEECH.addListener('error', (payload: unknown) => {
      const event = payload as { error?: string };
      const error = event.error ?? 'unknown';
      if (error === 'no-speech') {
        activeRef.current = false;
        startingRef.current = false;
        setLastError(error);
        setNoSpeechCount((current) => current + 1);
        setLastAudioEvent('no speech');
        return;
      }
      if (error === 'aborted') return;

      setLastError(error);
      setLastAudioEvent(`error ${error}`);
      activeRef.current = false;
      startingRef.current = false;
      appendDebugLine(`Error: ${error}`);
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
      setLastAudioEvent('recognition ended');
      void refreshNativeState('state after end');
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
      audioStartSub.remove();
      soundStartSub.remove();
      speechStartSub.remove();
      speechEndSub.remove();
      soundEndSub.remove();
      audioEndSub.remove();
      volumeSub.remove();
      resultSub.remove();
      errorSub.remove();
      endSub.remove();
      stopNative(true, true);
    };
  }, [appendDebugLine, clearRestartTimer, forceStop, refreshNativeState, startListening, stopNative]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) {
      consecutiveErrorsRef.current = 0;
      restartDelayRef.current = RESTART_BASE_MS;
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
    lastTranscript,
    lastError,
    debugLines,
    noSpeechCount,
    lastAudioEvent,
    audioLevel,
    recognizerState,
    recognitionAvailable,
    permissionDebug,
    setEnabled,
    forceStop,
    restartListening,
    requestPermission,
    hasPermission,
    openPermissionSettings,
  };
}
