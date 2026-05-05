import { useCallback, useEffect, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioSource } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { useCenaivaVoicePreference } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

type QueueEntry = {
  text: string;
  promise: Promise<TTSPlayable | null>;
  pacingAfterMs: number;
  onFirstAudioStart?: () => void;
};

type PlayResult = 'played' | 'failed' | 'stopped';

type StreamingChunkOptions = {
  pacingAfterMs?: number;
  onFirstAudioStart?: () => void;
};

type SpeakOptions = {
  onFirstAudioStart?: () => void;
};

type TTSPlayable = {
  source: AudioSource;
  cleanupUri?: string;
};

type UseMobileTTSOptions = {
  onFirstAudioStart?: () => void;
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let output = '';
  let i = 0;

  for (; i + 2 < bytes.length; i += 3) {
    output += alphabet[bytes[i] >> 2];
    output += alphabet[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
    output += alphabet[((bytes[i + 1] & 15) << 2) | (bytes[i + 2] >> 6)];
    output += alphabet[bytes[i + 2] & 63];
  }

  if (i < bytes.length) {
    output += alphabet[bytes[i] >> 2];
    if (i + 1 < bytes.length) {
      output += alphabet[((bytes[i] & 3) << 4) | (bytes[i + 1] >> 4)];
      output += alphabet[(bytes[i + 1] & 15) << 2];
      output += '=';
    } else {
      output += alphabet[(bytes[i] & 3) << 4];
      output += '==';
    }
  }

  return output;
}

function extensionFromContentType(contentType: string | null): string {
  if (contentType?.includes('mpeg') || contentType?.includes('mp3')) return 'mp3';
  if (contentType?.includes('wav')) return 'wav';
  if (contentType?.includes('ogg')) return 'ogg';
  return 'mp3';
}

function elevenLabsEnabled() {
  return process.env.EXPO_PUBLIC_ELEVENLABS_ENABLED !== 'false';
}

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function useMobileTTS(options: UseMobileTTSOptions = {}) {
  const { session } = useAuthSession();
  const { voiceId } = useCenaivaVoicePreference();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const tempFilesRef = useRef<string[]>([]);
  const queueRef = useRef<QueueEntry[]>([]);
  const queueGenerationRef = useRef(0);
  const queueRunningRef = useRef(false);
  const queueResolversRef = useRef<Array<() => void>>([]);
  const currentPlaybackResolverRef = useRef<((result: PlayResult) => void) | null>(null);
  const onFirstAudioStartRef = useRef(options.onFirstAudioStart);

  useEffect(() => {
    onFirstAudioStartRef.current = options.onFirstAudioStart;
  }, [options.onFirstAudioStart]);

  const markFirstAudioStart = useCallback((localCallback?: () => void) => {
    onFirstAudioStartRef.current?.();
    localCallback?.();
  }, []);

  const cleanupTempFiles = useCallback(async () => {
    const files = tempFilesRef.current;
    tempFilesRef.current = [];
    await Promise.all(
      files.map((uri) =>
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined),
      ),
    );
  }, []);

  const cleanupTempFile = useCallback(async (uri: string) => {
    tempFilesRef.current = tempFilesRef.current.filter((file) => file !== uri);
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined);
  }, []);

  const stopSpeaking = useCallback(() => {
    queueGenerationRef.current += 1;
    queueRef.current = [];
    queueRunningRef.current = false;
    currentPlaybackResolverRef.current?.('stopped');
    currentPlaybackResolverRef.current = null;
    try {
      playerRef.current?.pause();
    } catch {
      // Native player may have been released by Fast Refresh/unmount.
    }
    try {
      playerRef.current?.remove();
    } catch {
      // Native player may have been released by Fast Refresh/unmount.
    }
    playerRef.current = null;
    Speech.stop();
    for (const resolve of queueResolversRef.current) resolve();
    queueResolversRef.current = [];
    setIsSpeaking(false);
    void cleanupTempFiles();
  }, [cleanupTempFiles]);

  const createTTSStreamPlayable = useCallback(
    (text: string): TTSPlayable | null => {
      if (!elevenLabsEnabled() || !isSupabaseConfigured() || !session?.access_token) {
        return null;
      }
      const { url, anonKey } = getSupabaseEnv();
      const params = new URLSearchParams({ text });
      if (voiceId) params.set('voice_id', voiceId);
      return {
        source: {
          uri: `${url}/functions/v1/elevenlabs-tts?${params.toString()}`,
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
          },
        },
      };
    },
    [session?.access_token, voiceId],
  );

  const fetchTTSFile = useCallback(
    async (text: string): Promise<TTSPlayable | null> => {
      if (!elevenLabsEnabled() || !isSupabaseConfigured() || !session?.access_token || !FileSystem.cacheDirectory) {
        return null;
      }
      const { url, anonKey } = getSupabaseEnv();
      try {
        const response = await fetch(`${url}/functions/v1/elevenlabs-tts`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: anonKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text, voice_id: voiceId ?? undefined }),
        });
        if (!response.ok) return null;

        const contentType = response.headers.get('content-type');
        const ext = extensionFromContentType(contentType);
        const buffer = await response.arrayBuffer();
        if (!buffer.byteLength) return null;
        const target = `${FileSystem.cacheDirectory}cenaiva-tts-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const base64 = arrayBufferToBase64(buffer);
        await FileSystem.writeAsStringAsync(target, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const info = await FileSystem.getInfoAsync(target).catch(() => null);
        if (!info?.exists || !info.size) return null;
        if (!tempFilesRef.current.includes(target)) tempFilesRef.current.push(target);
        return { source: { uri: target }, cleanupUri: target };
      } catch {
        return null;
      }
    },
    [session?.access_token, voiceId],
  );

  const speakWithFallback = useCallback(
    async (text: string, options: SpeakOptions = {}) => {
      await new Promise<void>((resolve) => {
        let started = false;
        const markStarted = () => {
          if (started) return;
          started = true;
          markFirstAudioStart(options.onFirstAudioStart);
        };
        Speech.speak(text, {
          language: 'en',
          onStart: markStarted,
          onDone: resolve,
          onStopped: resolve,
          onError: () => resolve(),
        });
        setTimeout(markStarted, 0);
      });
    },
    [markFirstAudioStart],
  );

  const playSource = useCallback(
    async (playable: TTSPlayable, options: SpeakOptions = {}): Promise<PlayResult> => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
        });
        try {
          playerRef.current?.remove();
        } catch {
          // ignore stale player
        }
        const player = createAudioPlayer(playable.source, {
          downloadFirst: false,
          preferredForwardBufferDuration: 0.2,
        });
        playerRef.current = player;
        setIsSpeaking(true);

        const result = await new Promise<PlayResult>((resolve) => {
          let resolved = false;
          let firstAudioStarted = false;
          let timeout: ReturnType<typeof setTimeout> | null = null;
          let startTimeout: ReturnType<typeof setTimeout> | null = null;
          const markStarted = () => {
            if (resolved) return;
            if (firstAudioStarted) return;
            firstAudioStarted = true;
            if (startTimeout) {
              clearTimeout(startTimeout);
              startTimeout = null;
            }
            markFirstAudioStart(options.onFirstAudioStart);
          };
          const finish = (next: PlayResult) => {
            if (resolved) return;
            resolved = true;
            currentPlaybackResolverRef.current = null;
            sub?.remove?.();
            if (timeout) clearTimeout(timeout);
            if (startTimeout) clearTimeout(startTimeout);
            resolve(next);
          };
          currentPlaybackResolverRef.current = finish;
          const sub = (player as unknown as {
            addListener?: (
              event: string,
              listener: (status: {
                didJustFinish?: boolean;
                playing?: boolean;
                error?: string | null;
                playbackState?: string;
              }) => void,
            ) => { remove: () => void };
          }).addListener?.('playbackStatusUpdate', (status) => {
            if (status.error || status.playbackState === 'error') finish('failed');
            if (status.playing) markStarted();
            if (status.didJustFinish) finish('played');
          });
          try {
            player.play();
          } catch {
            finish('failed');
            return;
          }
          setTimeout(markStarted, 120);
          startTimeout = setTimeout(() => finish('failed'), 4_000);
          timeout = setTimeout(() => finish('failed'), 30_000);
        });

        return result;
      } catch {
        return 'failed';
      } finally {
        try {
          playerRef.current?.remove();
        } catch {
          // ignore stale player
        }
        playerRef.current = null;
        setIsSpeaking(false);
        if (playable.cleanupUri) await cleanupTempFile(playable.cleanupUri);
      }
    },
    [cleanupTempFile],
  );

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return true;
      stopSpeaking();
      const streamPlayable = createTTSStreamPlayable(trimmed);
      if (streamPlayable) {
        const result = await playSource(streamPlayable, options);
        if (result === 'played') return true;
        if (result === 'stopped') return false;
      }
      const file = await fetchTTSFile(trimmed);
      if (file) {
        const result = await playSource(file, options);
        if (result === 'played') return true;
        if (result === 'stopped') return false;
      }
      setIsSpeaking(true);
      await speakWithFallback(trimmed, options);
      setIsSpeaking(false);
      return false;
    },
    [createTTSStreamPlayable, fetchTTSFile, playSource, speakWithFallback, stopSpeaking],
  );

  const runQueue = useCallback(
    async (generation: number) => {
      if (queueRunningRef.current) return;
      queueRunningRef.current = true;
      setIsSpeaking(true);
      try {
        while (queueRef.current.length > 0) {
          if (queueGenerationRef.current !== generation) return;
          const entry = queueRef.current.shift();
          if (!entry) continue;
          const playable = await entry.promise;
          if (queueGenerationRef.current !== generation) return;
          if (playable) {
            const result = await playSource(playable, { onFirstAudioStart: entry.onFirstAudioStart });
            if (queueGenerationRef.current !== generation || result === 'stopped') return;
            if (result === 'failed') {
              const file = await fetchTTSFile(entry.text);
              if (queueGenerationRef.current !== generation) return;
              if (file) {
                const fallbackResult = await playSource(file, { onFirstAudioStart: entry.onFirstAudioStart });
                if (queueGenerationRef.current !== generation || fallbackResult === 'stopped') return;
                if (fallbackResult === 'failed') {
                  await speakWithFallback(entry.text, { onFirstAudioStart: entry.onFirstAudioStart });
                  if (queueGenerationRef.current !== generation) return;
                }
              } else {
                await speakWithFallback(entry.text, { onFirstAudioStart: entry.onFirstAudioStart });
                if (queueGenerationRef.current !== generation) return;
              }
            }
          } else {
            await speakWithFallback(entry.text, { onFirstAudioStart: entry.onFirstAudioStart });
            if (queueGenerationRef.current !== generation) return;
          }
          if (entry.pacingAfterMs > 0 && queueGenerationRef.current === generation) {
            await delay(entry.pacingAfterMs);
          }
        }
      } finally {
        if (queueGenerationRef.current === generation) {
          queueRunningRef.current = false;
          setIsSpeaking(false);
        }
        const resolvers = queueResolversRef.current;
        queueResolversRef.current = [];
        for (const resolve of resolvers) resolve();
      }
    },
    [fetchTTSFile, playSource, speakWithFallback],
  );

  const speakStreamingChunk = useCallback(
    (text: string, options: StreamingChunkOptions = {}) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const generation = queueGenerationRef.current;
      queueRef.current.push({
        text: trimmed,
        promise: Promise.resolve(createTTSStreamPlayable(trimmed)),
        pacingAfterMs: options.pacingAfterMs ?? 0,
        onFirstAudioStart: options.onFirstAudioStart,
      });
      void runQueue(generation);
    },
    [createTTSStreamPlayable, runQueue],
  );

  const discardStreamingSpeech = useCallback(() => {
    stopSpeaking();
  }, [stopSpeaking]);

  const drainStreamingSpeech = useCallback(
    () =>
      new Promise<void>((resolve) => {
        if (!queueRunningRef.current && queueRef.current.length === 0) {
          resolve();
          return;
        }
        queueResolversRef.current.push(resolve);
      }),
    [],
  );

  const ttsPrewarmedRef = useRef(false);
  const primeTTS = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // noop
    }
    // WS-1.7: Fire a tiny ElevenLabs request on assistant open so the first
    // real synthesis doesn't pay TLS + DNS + cold-edge cost. Request body is
    // a single token; we discard the audio. Best-effort, runs once per mount.
    if (ttsPrewarmedRef.current) return;
    ttsPrewarmedRef.current = true;
    if (!elevenLabsEnabled() || !isSupabaseConfigured() || !session?.access_token) return;
    try {
      const { url, anonKey } = getSupabaseEnv();
      void fetch(`${url}/functions/v1/elevenlabs-tts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: anonKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: '.', voice_id: voiceId ?? undefined, prewarm: true }),
      })
        .then((res) => res.arrayBuffer().catch(() => undefined))
        .catch(() => undefined);
    } catch {
      // ignore
    }
  }, [session?.access_token, voiceId]);

  return {
    isSpeaking,
    isStreamingTTSAvailable: true,
    speak,
    speakStreamingChunk,
    discardStreamingSpeech,
    drainStreamingSpeech,
    stopSpeaking,
    primeTTS,
  };
}
