import { useCallback, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as FileSystem from 'expo-file-system/legacy';
import * as Speech from 'expo-speech';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

type QueueEntry = {
  text: string;
  promise: Promise<string | null>;
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

export function useMobileTTS() {
  const { session } = useAuthSession();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const playerRef = useRef<AudioPlayer | null>(null);
  const tempFilesRef = useRef<string[]>([]);
  const queueRef = useRef<QueueEntry[]>([]);
  const queueGenerationRef = useRef(0);
  const queueRunningRef = useRef(false);
  const queueResolversRef = useRef<Array<() => void>>([]);

  const cleanupTempFiles = useCallback(async () => {
    const files = tempFilesRef.current;
    tempFilesRef.current = [];
    await Promise.all(
      files.map((uri) =>
        FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => undefined),
      ),
    );
  }, []);

  const stopSpeaking = useCallback(() => {
    queueGenerationRef.current += 1;
    queueRef.current = [];
    queueRunningRef.current = false;
    playerRef.current?.pause();
    playerRef.current?.remove();
    playerRef.current = null;
    Speech.stop();
    for (const resolve of queueResolversRef.current) resolve();
    queueResolversRef.current = [];
    setIsSpeaking(false);
    void cleanupTempFiles();
  }, [cleanupTempFiles]);

  const fetchTTSFile = useCallback(
    async (text: string): Promise<string | null> => {
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
          body: JSON.stringify({ text }),
        });
        if (!response.ok) return null;

        const contentType = response.headers.get('content-type');
        const ext = extensionFromContentType(contentType);
        const target = `${FileSystem.cacheDirectory}cenaiva-tts-${Date.now()}-${Math.random()
          .toString(36)
          .slice(2)}.${ext}`;
        const base64 = arrayBufferToBase64(await response.arrayBuffer());
        await FileSystem.writeAsStringAsync(target, base64, {
          encoding: FileSystem.EncodingType.Base64,
        });
        tempFilesRef.current.push(target);
        return target;
      } catch {
        return null;
      }
    },
    [session?.access_token],
  );

  const speakWithFallback = useCallback(
    async (text: string) => {
      await new Promise<void>((resolve) => {
        Speech.speak(text, {
          language: 'en',
          onDone: resolve,
          onStopped: resolve,
          onError: () => resolve(),
        });
      });
    },
    [],
  );

  const playFile = useCallback(
    async (uri: string): Promise<boolean> => {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: false,
          shouldPlayInBackground: false,
        });
        playerRef.current?.remove();
        const player = createAudioPlayer({ uri }, { downloadFirst: false });
        playerRef.current = player;
        setIsSpeaking(true);

        await new Promise<void>((resolve) => {
          let resolved = false;
          const finish = () => {
            if (resolved) return;
            resolved = true;
            sub?.remove?.();
            resolve();
          };
          const sub = (player as unknown as {
            addListener?: (
              event: string,
              listener: (status: { didJustFinish?: boolean; playing?: boolean }) => void,
            ) => { remove: () => void };
          }).addListener?.('playbackStatusUpdate', (status) => {
            if (status.didJustFinish) finish();
          });
          player.play();
          setTimeout(finish, 30_000);
        });

        return true;
      } catch {
        return false;
      } finally {
        playerRef.current?.remove();
        playerRef.current = null;
        setIsSpeaking(false);
        await cleanupTempFiles();
      }
    },
    [cleanupTempFiles],
  );

  const speak = useCallback(
    async (text: string): Promise<boolean> => {
      const trimmed = text.trim();
      if (!trimmed) return true;
      stopSpeaking();
      const file = await fetchTTSFile(trimmed);
      if (file) {
        const played = await playFile(file);
        if (played) return true;
      }
      setIsSpeaking(true);
      await speakWithFallback(trimmed);
      setIsSpeaking(false);
      return false;
    },
    [fetchTTSFile, playFile, speakWithFallback, stopSpeaking],
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
          const file = await entry.promise;
          if (queueGenerationRef.current !== generation) return;
          if (file) {
            const played = await playFile(file);
            if (!played) await speakWithFallback(entry.text);
          } else {
            await speakWithFallback(entry.text);
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
    [fetchTTSFile, playFile, speakWithFallback],
  );

  const speakStreamingChunk = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const generation = queueGenerationRef.current;
      queueRef.current.push({ text: trimmed, promise: fetchTTSFile(trimmed) });
      void runQueue(generation);
    },
    [fetchTTSFile, runQueue],
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

  const primeTTS = useCallback(() => {
    try {
      Speech.stop();
    } catch {
      // noop
    }
  }, []);

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
