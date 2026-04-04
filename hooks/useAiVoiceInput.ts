import { requireOptionalNativeModule } from 'expo';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';

const WAVE_LEN = 28;

function normalizeVolume(value: number): number {
  return Math.max(0.04, Math.min(1, (value + 2) / 12));
}

/** Safe init: never throws — missing in Expo Go until you use a dev build with the native module. */
function initNativeSpeechModule(): NativeSpeech | null {
  const raw = requireOptionalNativeModule<NativeSpeech>('ExpoSpeechRecognition');
  if (!raw) return null;
  const stop = raw.stop.bind(raw);
  const abort = raw.abort.bind(raw);
  raw.stop = () => stop();
  raw.abort = () => abort();
  return raw;
}

type NativeSpeech = {
  start: (options: Record<string, unknown>) => void;
  stop: () => void;
  abort: () => void;
  requestPermissionsAsync: () => Promise<{ granted: boolean }>;
  addListener: (event: string, listener: (payload: unknown) => void) => { remove: () => void };
};

const NATIVE_SPEECH = initNativeSpeechModule();

type WebRec = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getWebSpeechConstructor(): (new () => WebRec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => WebRec;
    webkitSpeechRecognition?: new () => WebRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type UseAiVoiceInputOptions = {
  lang: string;
  onSessionEnd: (text: string) => void;
};

/**
 * Speech-to-text without importing `expo-speech-recognition` (that package eagerly loads native code and crashes in Expo Go).
 * - Dev build / production with native module: ExpoSpeechRecognition via optional native module.
 * - Web without native: Web Speech API.
 * - Otherwise: graceful unavailable state.
 */
export function useAiVoiceInput({ lang, onSessionEnd }: UseAiVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const [waveform, setWaveform] = useState<number[]>(() => Array(WAVE_LEN).fill(0.08));
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const transcriptRef = useRef('');
  const onSessionEndRef = useRef(onSessionEnd);
  const listeningRef = useRef(false);
  const webRecognitionRef = useRef<WebRec | null>(null);
  const waveRafRef = useRef<number | null>(null);

  onSessionEndRef.current = onSessionEnd;

  const mode: 'native' | 'web' | 'none' = NATIVE_SPEECH
    ? 'native'
    : Platform.OS === 'web'
      ? 'web'
      : 'none';

  const commitEnd = useCallback(() => {
    listeningRef.current = false;
    setIsListening(false);
    const text = transcriptRef.current.trim();
    transcriptRef.current = '';
    setLiveTranscript('');
    if (text) onSessionEndRef.current(text);
  }, []);

  // --- Native: event subscriptions (no expo-speech-recognition import) ---
  useEffect(() => {
    if (mode !== 'native' || !NATIVE_SPEECH) return;

    const subResult = NATIVE_SPEECH.addListener('result', (e: unknown) => {
      const ev = e as { results?: { transcript?: string }[] };
      const t = ev.results?.[0]?.transcript ?? '';
      transcriptRef.current = t;
      setLiveTranscript(t);
    });

    const subError = NATIVE_SPEECH.addListener('error', (e: unknown) => {
      const ev = e as { error?: string };
      if (ev.error === 'not-allowed') setPermissionDenied(true);
      listeningRef.current = false;
      setIsListening(false);
    });

    const subStart = NATIVE_SPEECH.addListener('start', () => {
      listeningRef.current = true;
      setIsListening(true);
      transcriptRef.current = '';
      setLiveTranscript('');
      setPermissionDenied(false);
      setWaveform(Array(WAVE_LEN).fill(0.08));
    });

    const subEnd = NATIVE_SPEECH.addListener('end', () => {
      commitEnd();
    });

    const subVol = NATIVE_SPEECH.addListener('volumechange', (e: unknown) => {
      const ev = e as { value: number };
      const norm = normalizeVolume(ev.value);
      setWaveform((prev) => [...prev.slice(1), norm]);
    });

    return () => {
      subResult.remove();
      subError.remove();
      subStart.remove();
      subEnd.remove();
      subVol.remove();
    };
  }, [mode, commitEnd]);

  // --- Web: animated waveform when live (no native volume events) ---
  useEffect(() => {
    if (mode !== 'web' || !isListening) {
      if (waveRafRef.current != null) {
        cancelAnimationFrame(waveRafRef.current);
        waveRafRef.current = null;
      }
      return;
    }
    let t0 = Date.now();
    const tick = () => {
      const t = (Date.now() - t0) / 280;
      const v = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.7) * Math.sin(t * 2.3));
      setWaveform((prev) => [...prev.slice(1), Math.max(0.08, Math.min(1, v))]);
      waveRafRef.current = requestAnimationFrame(tick);
    };
    waveRafRef.current = requestAnimationFrame(tick);
    return () => {
      if (waveRafRef.current != null) cancelAnimationFrame(waveRafRef.current);
      waveRafRef.current = null;
    };
  }, [mode, isListening]);

  const stopWeb = useCallback(() => {
    try {
      webRecognitionRef.current?.stop();
    } catch {
      /* noop */
    }
    webRecognitionRef.current = null;
  }, []);

  const startNative = useCallback(async () => {
    if (!NATIVE_SPEECH) return;
    try {
      const perm = await NATIVE_SPEECH.requestPermissionsAsync();
      if (!perm.granted) {
        setPermissionDenied(true);
        return;
      }
      setUnavailable(false);
      NATIVE_SPEECH.start({
        lang,
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 85 },
        iosVoiceProcessingEnabled: true,
      });
    } catch {
      setUnavailable(true);
    }
  }, [lang]);

  const startWeb = useCallback(() => {
    const Ctor = getWebSpeechConstructor();
    if (!Ctor) {
      setUnavailable(true);
      return;
    }
    try {
      const rec = new Ctor();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = lang;

      rec.onstart = () => {
        listeningRef.current = true;
        setIsListening(true);
        transcriptRef.current = '';
        setLiveTranscript('');
        setPermissionDenied(false);
        setUnavailable(false);
        setWaveform(Array(WAVE_LEN).fill(0.08));
      };

      rec.onresult = (ev: Event) => {
        const resultEv = ev as unknown as {
          resultIndex: number;
          results: { length: number; item: (i: number) => { 0: { transcript: string }; isFinal: boolean } };
        };
        let text = '';
        for (let i = 0; i < resultEv.results.length; i++) {
          text += resultEv.results.item(i)[0].transcript;
        }
        transcriptRef.current = text;
        setLiveTranscript(text);
      };

      rec.onerror = (ev: Event) => {
        const err = ev as unknown as { error?: string };
        if (err.error === 'not-allowed') setPermissionDenied(true);
        listeningRef.current = false;
        setIsListening(false);
      };

      rec.onend = () => {
        webRecognitionRef.current = null;
        commitEnd();
      };

      webRecognitionRef.current = rec;
      rec.start();
    } catch {
      setUnavailable(true);
    }
  }, [lang, commitEnd]);

  const start = useCallback(async () => {
    if (mode === 'native') await startNative();
    else if (mode === 'web') startWeb();
    else setUnavailable(true);
  }, [mode, startNative, startWeb]);

  const stop = useCallback(() => {
    if (mode === 'native' && NATIVE_SPEECH) {
      try {
        NATIVE_SPEECH.stop();
      } catch {
        /* noop */
      }
      return;
    }
    if (mode === 'web') stopWeb();
  }, [mode, stopWeb]);

  const toggleListening = useCallback(async () => {
    if (listeningRef.current) {
      stop();
      return;
    }
    await start();
  }, [start, stop]);

  useEffect(() => {
    return () => {
      if (NATIVE_SPEECH) {
        try {
          NATIVE_SPEECH.abort();
        } catch {
          /* noop */
        }
      }
      stopWeb();
    };
  }, [stopWeb]);

  return {
    isListening,
    liveTranscript,
    waveform,
    permissionDenied,
    unavailable,
    toggleListening,
  };
}
