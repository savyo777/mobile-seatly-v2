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

type PreparedAudio = {
  audio_base64: string;
  audio_content_type?: string | null;
};

type TTSPlayable = {
  source: AudioSource;
  cleanupUri?: string;
};

type UseMobileTTSOptions = {
  onFirstAudioStart?: () => void;
};

const TTS_CACHE_VERSION = 'flash25-mp3-44100-128-v1';
const TTS_CACHE_DIR = `${FileSystem.cacheDirectory ?? ''}cenaiva-tts-cache/`;
const COMMON_TTS_CACHE_TEXTS = [
  'One moment please.',
  'What restaurant or area should I book?',
  'How many guests?',
  'What date and time should I book?',
  'What date should I book?',
  'What time should I book?',
  'I could not check availability. Try another date and time.',
  'Something went wrong. Try again.',
  'Please sign in to continue.',
];

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

function normalizeCacheText(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function hashString(value: string): string {
  let hash = 5381;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) + hash) ^ value.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}

function shouldUsePersistentCache(text: string): boolean {
  const normalized = normalizeCacheText(text);
  return COMMON_TTS_CACHE_TEXTS.includes(normalized);
}

function debugTTS(event: string, details?: Record<string, unknown>) {
  if (process.env.EXPO_PUBLIC_CENAIVA_VOICE_DEBUG !== 'true') return;
  if (details) console.log(`[Cenaiva TTS] ${event}`, details);
  else console.log(`[Cenaiva TTS] ${event}`);
}

function isAudiblyPlayingStatus(status: {
  currentTime?: number;
  isBuffering?: boolean;
  playing?: boolean;
  playbackState?: string;
  timeControlStatus?: string;
}) {
  if ((status.currentTime ?? 0) > 0) return true;
  const playbackState = String(status.playbackState ?? '').toLowerCase();
  const timeControlStatus = String(status.timeControlStatus ?? '').toLowerCase();
  if (timeControlStatus === 'playing') return true;
  if (!status.playing || status.isBuffering) return false;
  return !/loading|buffer|waiting/.test(`${playbackState} ${timeControlStatus}`);
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
  const audioModeReadyRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    onFirstAudioStartRef.current = options.onFirstAudioStart;
  }, [options.onFirstAudioStart]);

  const markFirstAudioStart = useCallback((localCallback?: () => void) => {
    onFirstAudioStartRef.current?.();
    localCallback?.();
  }, []);

  const ensureAudioMode = useCallback(() => {
    if (!audioModeReadyRef.current) {
      audioModeReadyRef.current = setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
        shouldPlayInBackground: false,
      }).catch(() => {
        audioModeReadyRef.current = null;
      });
    }
    return audioModeReadyRef.current;
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

  const getCacheTargetUri = useCallback(
    async (text: string): Promise<string | null> => {
      if (!FileSystem.cacheDirectory || !TTS_CACHE_DIR) return null;
      const normalized = normalizeCacheText(text);
      if (!normalized) return null;
      await FileSystem.makeDirectoryAsync(TTS_CACHE_DIR, { intermediates: true }).catch(() => undefined);
      const voiceKey = voiceId ?? 'default';
      return `${TTS_CACHE_DIR}${TTS_CACHE_VERSION}-${hashString(`${voiceKey}:${normalized}`)}.mp3`;
    },
    [voiceId],
  );

  const getExistingCachedPlayable = useCallback(
    async (text: string): Promise<TTSPlayable | null> => {
      if (!shouldUsePersistentCache(text)) return null;
      const target = await getCacheTargetUri(text);
      if (!target) return null;
      const info = await FileSystem.getInfoAsync(target).catch(() => null);
      if (!info?.exists || !info.size) return null;
      return { source: { uri: target } };
    },
    [getCacheTargetUri],
  );

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
    async (text: string, options: { cacheTargetUri?: string } = {}): Promise<TTSPlayable | null> => {
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
        const target = options.cacheTargetUri ?? `${FileSystem.cacheDirectory}cenaiva-tts-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const base64 = arrayBufferToBase64(buffer);
        await FileSystem.writeAsStringAsync(target, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const info = await FileSystem.getInfoAsync(target).catch(() => null);
        if (!info?.exists || !info.size) return null;
        if (!options.cacheTargetUri && !tempFilesRef.current.includes(target)) {
          tempFilesRef.current.push(target);
        }
        return { source: { uri: target }, cleanupUri: target };
      } catch {
        return null;
      }
    },
    [session?.access_token, voiceId],
  );

  const fetchCachedTTSFile = useCallback(
    async (text: string): Promise<TTSPlayable | null> => {
      if (!shouldUsePersistentCache(text)) return null;
      const target = await getCacheTargetUri(text);
      if (!target) return null;
      const existing = await FileSystem.getInfoAsync(target).catch(() => null);
      if (existing?.exists && existing.size) return { source: { uri: target } };
      const fetched = await fetchTTSFile(text, { cacheTargetUri: target });
      return fetched ? { source: { uri: target } } : null;
    },
    [fetchTTSFile, getCacheTargetUri],
  );

  const preparedAudioToPlayable = useCallback(
    async (audio: PreparedAudio | null | undefined): Promise<TTSPlayable | null> => {
      if (!audio?.audio_base64 || !FileSystem.cacheDirectory) return null;
      const ext = extensionFromContentType(audio.audio_content_type ?? null);
      const target = `${FileSystem.cacheDirectory}cenaiva-prepared-tts-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${ext}`;
      try {
        await FileSystem.writeAsStringAsync(target, audio.audio_base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const info = await FileSystem.getInfoAsync(target).catch(() => null);
        if (!info?.exists || !info.size) return null;
        if (!tempFilesRef.current.includes(target)) tempFilesRef.current.push(target);
        return { source: { uri: target }, cleanupUri: target };
      } catch {
        await FileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined);
        return null;
      }
    },
    [],
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
        setTimeout(markStarted, 750);
      });
    },
    [markFirstAudioStart],
  );

  const playSource = useCallback(
    async (playable: TTSPlayable, options: SpeakOptions = {}): Promise<PlayResult> => {
      try {
        await ensureAudioMode();
        try {
          playerRef.current?.remove();
        } catch {
          // ignore stale player
        }
        const playbackRequestedAt = Date.now();
        const player = createAudioPlayer(playable.source, {
          downloadFirst: false,
          preferredForwardBufferDuration: 0.05,
        });
        playerRef.current = player;
        setIsSpeaking(true);

        const result = await new Promise<PlayResult>((resolve) => {
          let resolved = false;
          let firstAudioStarted = false;
          let timeout: ReturnType<typeof setTimeout> | null = null;
          let startTimeout: ReturnType<typeof setTimeout> | null = null;
          let statusPoll: ReturnType<typeof setInterval> | null = null;
          const markStarted = () => {
            if (resolved) return;
            if (firstAudioStarted) return;
            firstAudioStarted = true;
            if (startTimeout) {
              clearTimeout(startTimeout);
              startTimeout = null;
            }
            debugTTS('first audio started', { elapsedMs: Date.now() - playbackRequestedAt });
            markFirstAudioStart(options.onFirstAudioStart);
          };
          const finish = (next: PlayResult) => {
            if (resolved) return;
            resolved = true;
            currentPlaybackResolverRef.current = null;
            sub?.remove?.();
            if (timeout) clearTimeout(timeout);
            if (startTimeout) clearTimeout(startTimeout);
            if (statusPoll) clearInterval(statusPoll);
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
                timeControlStatus?: string;
                isBuffering?: boolean;
                currentTime?: number;
              }) => void,
            ) => { remove: () => void };
          }).addListener?.('playbackStatusUpdate', (status) => {
            if (status.error || status.playbackState === 'error') finish('failed');
            if (isAudiblyPlayingStatus(status)) markStarted();
            if (status.didJustFinish) finish('played');
          });
          statusPoll = setInterval(() => {
            const currentStatus = (player as unknown as {
              currentStatus?: {
                didJustFinish?: boolean;
                playing?: boolean;
                error?: string | null;
                playbackState?: string;
                timeControlStatus?: string;
                isBuffering?: boolean;
                currentTime?: number;
              };
            }).currentStatus;
            if (!currentStatus) return;
            if (currentStatus.error || currentStatus.playbackState === 'error') finish('failed');
            if (isAudiblyPlayingStatus(currentStatus)) markStarted();
            if (currentStatus.didJustFinish) finish('played');
          }, 40);
          try {
            player.play();
          } catch {
            finish('failed');
            return;
          }
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
    [cleanupTempFile, ensureAudioMode, markFirstAudioStart],
  );

  const speak = useCallback(
    async (text: string, options: SpeakOptions = {}): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return true;
      stopSpeaking();
      const cached = await getExistingCachedPlayable(trimmed);
      if (cached) {
        const result = await playSource(cached, options);
        if (result === 'played') return true;
        if (result === 'stopped') return false;
      }
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
    [createTTSStreamPlayable, fetchTTSFile, getExistingCachedPlayable, playSource, speakWithFallback, stopSpeaking],
  );

  const speakPreparedAudio = useCallback(
    async (text: string, audio: PreparedAudio | null | undefined, options: SpeakOptions = {}): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return true;
      stopSpeaking();
      const playable = await preparedAudioToPlayable(audio);
      if (playable) {
        const result = await playSource(playable, options);
        if (result === 'played') return true;
        if (result === 'stopped') return false;
      }
      return speak(trimmed, options);
    },
    [playSource, preparedAudioToPlayable, speak, stopSpeaking],
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
        promise: getExistingCachedPlayable(trimmed).then((cached) => cached ?? createTTSStreamPlayable(trimmed)),
        pacingAfterMs: options.pacingAfterMs ?? 0,
        onFirstAudioStart: options.onFirstAudioStart,
      });
      void runQueue(generation);
    },
    [createTTSStreamPlayable, getExistingCachedPlayable, runQueue],
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

  const ttsPrewarmedVoiceRef = useRef<string | null>(null);
  const primeTTS = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // noop
    }
    if (!elevenLabsEnabled() || !isSupabaseConfigured() || !session?.access_token) return;
    const voiceKey = voiceId ?? 'default';
    if (ttsPrewarmedVoiceRef.current === voiceKey) return;
    ttsPrewarmedVoiceRef.current = voiceKey;

    void ensureAudioMode();

    void (async () => {
      for (const text of COMMON_TTS_CACHE_TEXTS) {
        await fetchCachedTTSFile(text).catch(() => null);
      }
    })();
  }, [ensureAudioMode, fetchCachedTTSFile, session?.access_token, voiceId]);

  return {
    isSpeaking,
    isStreamingTTSAvailable: true,
    speak,
    speakPreparedAudio,
    speakStreamingChunk,
    discardStreamingSpeech,
    drainStreamingSpeech,
    stopSpeaking,
    primeTTS,
  };
}
