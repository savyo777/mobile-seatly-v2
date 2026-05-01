import { useCallback, useMemo, useRef, useState } from 'react';
import { AssistantResponse, type AssistantResponseType, type OrchestratorRequestType } from '@cenaiva/assistant';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

const REQUEST_TIMEOUT_MS = 45_000;

export type OrchestratorError =
  | 'not_authenticated'
  | 'not_configured'
  | 'timeout'
  | 'no_final_payload'
  | `http_${number}`
  | string;

export type SendCallbacks = {
  onSpeechChunk?: (text: string) => void;
  onDiscardPendingSpeech?: () => void;
};

type SseFrame = {
  type?: string;
  text?: string;
  payload?: unknown;
  message?: string;
  status?: number;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  body?: unknown;
  text: () => Promise<string>;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string, init: RequestInit) => Promise<FetchLikeResponse>;

function parseSseFrame(rawFrame: string): SseFrame | null {
  const data = rawFrame
    .split(/\r?\n/)
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.replace(/^data:\s?/, ''))
    .join('\n')
    .trim();
  if (!data) return null;
  try {
    return JSON.parse(data) as SseFrame;
  } catch {
    return null;
  }
}

export function consumeSseText(
  text: string,
  callbacks?: SendCallbacks,
): { finalPayload: unknown | null; error: string | null } {
  let finalPayload: unknown | null = null;
  let error: string | null = null;
  const frames = text.split(/\r?\n\r?\n/);

  for (const rawFrame of frames) {
    const frame = parseSseFrame(rawFrame);
    if (!frame?.type) continue;
    switch (frame.type) {
      case 'speech_chunk':
        if (typeof frame.text === 'string' && frame.text.length) {
          callbacks?.onSpeechChunk?.(frame.text);
        }
        break;
      case 'discard_pending_speech':
        callbacks?.onDiscardPendingSpeech?.();
        break;
      case 'final':
        finalPayload = frame.payload ?? null;
        break;
      case 'error':
        error = frame.message ?? `http_${frame.status ?? 500}`;
        break;
    }
  }

  return { finalPayload, error };
}

function parseAssistantResponse(payload: unknown): AssistantResponseType | null {
  if (!payload || typeof payload !== 'object') return null;
  const parsed = AssistantResponse.safeParse(payload);
  if (parsed.success) return parsed.data;
  return payload as AssistantResponseType;
}

async function readStreamBody(
  body: ReadableStream<Uint8Array>,
  callbacks?: SendCallbacks,
): Promise<{ finalPayload: unknown | null; error: string | null }> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalPayload: unknown | null = null;
  let error: string | null = null;

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let sepIdx = buffer.search(/\r?\n\r?\n/);
    while (sepIdx !== -1) {
      const match = buffer.match(/\r?\n\r?\n/);
      if (!match || match.index == null) break;
      const rawFrame = buffer.slice(0, match.index);
      buffer = buffer.slice(match.index + match[0].length);
      const result = consumeSseText(rawFrame, callbacks);
      finalPayload = result.finalPayload ?? finalPayload;
      error = result.error ?? error;
      sepIdx = buffer.search(/\r?\n\r?\n/);
    }
  }

  if (buffer.trim()) {
    const result = consumeSseText(buffer, callbacks);
    finalPayload = result.finalPayload ?? finalPayload;
    error = result.error ?? error;
  }

  return { finalPayload, error };
}

function hasReadableStreamBody(body: unknown): body is ReadableStream<Uint8Array> {
  return Boolean(
    body &&
      typeof body === 'object' &&
      'getReader' in body &&
      typeof (body as { getReader?: unknown }).getReader === 'function',
  );
}

export async function postCenaivaOrchestrator(
  req: OrchestratorRequestType,
  options: {
    url: string;
    anonKey: string;
    accessToken: string | null | undefined;
    signal?: AbortSignal;
    callbacks?: SendCallbacks;
    fetchImpl?: FetchLike;
  },
): Promise<{ data: AssistantResponseType | null; error: OrchestratorError | null }> {
  const { url, anonKey, accessToken, signal, callbacks, fetchImpl = fetch as FetchLike } = options;
  if (!accessToken) {
    return { data: null, error: 'not_authenticated' };
  }

  const response = await fetchImpl(`${url}/functions/v1/cenaiva-orchestrate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
    signal,
  });

  if (!response.ok) {
    let message: OrchestratorError = `http_${response.status}`;
    try {
      const body = await response.json();
      if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
        message = (body as { error: string }).error;
      }
    } catch {
      // Not JSON.
    }
    return { data: null, error: message };
  }

  const result = hasReadableStreamBody(response.body)
    ? await readStreamBody(response.body, callbacks)
    : consumeSseText(await response.text(), callbacks);

  if (result.error) {
    return { data: null, error: result.error };
  }
  if (!result.finalPayload) {
    return { data: null, error: 'no_final_payload' };
  }

  return { data: parseAssistantResponse(result.finalPayload), error: null };
}

export function useCenaivaOrchestrator() {
  const { session } = useAuthSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastErrorRef = useRef<string | null>(null);

  const recordError = useCallback((value: string | null) => {
    lastErrorRef.current = value;
    setError(value);
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const send = useCallback(
    async (
      req: OrchestratorRequestType,
      callbacks?: SendCallbacks,
    ): Promise<AssistantResponseType | null> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      setLoading(true);
      recordError(null);

      try {
        if (!isSupabaseConfigured()) {
          recordError('not_configured');
          return null;
        }
        if (!session?.access_token) {
          recordError('not_authenticated');
          return null;
        }

        const { url, anonKey } = getSupabaseEnv();
        const result = await postCenaivaOrchestrator(req, {
          url,
          anonKey,
          accessToken: session.access_token,
          signal: controller.signal,
          callbacks,
        });
        if (result.error) {
          recordError(result.error);
          return null;
        }

        return result.data;
      } catch (err) {
        const message = (err as Error)?.name === 'AbortError' ? 'timeout' : String(err);
        recordError(message);
        return null;
      } finally {
        clearTimeout(timeoutId);
        setLoading(false);
      }
    },
    [recordError, session?.access_token],
  );

  return useMemo(
    () => ({ send, cancel, loading, error, lastErrorRef }),
    [send, cancel, loading, error, lastErrorRef],
  );
}
