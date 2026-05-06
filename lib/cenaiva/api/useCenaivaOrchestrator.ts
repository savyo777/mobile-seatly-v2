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
  onTransport?: (transport: OrchestratorTransport) => void;
};

export type OrchestratorTransport = 'readable_stream' | 'buffered_text' | 'xhr_event_source';

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

type EventSourceLikeEvent = {
  data?: string | null;
  message?: string;
  xhrStatus?: number;
  xhrState?: number;
  error?: Error;
  type?: string;
};

type EventSourceLike = {
  addEventListener: (type: 'message' | 'error' | 'close' | 'open', listener: (event: EventSourceLikeEvent) => void) => void;
  close: () => void;
};

type EventSourceConstructor = new (url: string, options?: Record<string, unknown>) => EventSourceLike;

function resolveDefaultEventSource(): EventSourceConstructor | null {
  try {
    // Lazy-load so Jest/Node never parses react-native-sse's untranspiled ESM
    // file unless the React Native XHR streaming path is actually used.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('react-native-sse') as { default?: EventSourceConstructor } | EventSourceConstructor;
    return ((mod as { default?: EventSourceConstructor }).default ?? mod) as EventSourceConstructor;
  } catch {
    return null;
  }
}

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

function consumeSseFrame(
  frame: SseFrame | null,
  callbacks?: SendCallbacks,
): { finalPayload: unknown | null; error: string | null } {
  if (!frame?.type) return { finalPayload: null, error: null };
  switch (frame.type) {
    case 'speech_chunk':
      if (typeof frame.text === 'string' && frame.text.length) {
        callbacks?.onSpeechChunk?.(frame.text);
      }
      return { finalPayload: null, error: null };
    case 'discard_pending_speech':
      callbacks?.onDiscardPendingSpeech?.();
      return { finalPayload: null, error: null };
    case 'final':
      return { finalPayload: frame.payload ?? null, error: null };
    case 'error':
      return { finalPayload: null, error: frame.message ?? `http_${frame.status ?? 500}` };
    default:
      return { finalPayload: null, error: null };
  }
}

function parseSseData(data: string | null | undefined): SseFrame | null {
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
    const result = consumeSseFrame(parseSseFrame(rawFrame), callbacks);
    finalPayload = result.finalPayload ?? finalPayload;
    error = result.error ?? error;
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

function shouldUseEventSource(fetchImpl: FetchLike, eventSourceImpl?: EventSourceConstructor | null) {
  if (eventSourceImpl) return true;
  const defaultFetch = typeof fetch !== 'undefined' ? (fetch as FetchLike) : null;
  return (
    fetchImpl === defaultFetch &&
    typeof XMLHttpRequest !== 'undefined' &&
    typeof resolveDefaultEventSource() === 'function'
  );
}

function eventSourceErrorMessage(event: EventSourceLikeEvent): string {
  if (event.type === 'timeout') return 'timeout';
  if (typeof event.message === 'string' && event.message.trim()) {
    try {
      const parsed = JSON.parse(event.message) as { error?: unknown; message?: unknown };
      if (typeof parsed.error === 'string') return parsed.error;
      if (typeof parsed.message === 'string') return parsed.message;
    } catch {
      // plain text response body
    }
    return event.message;
  }
  if (typeof event.xhrStatus === 'number' && event.xhrStatus > 0) {
    return `http_${event.xhrStatus}`;
  }
  return event.error?.message ?? 'network_error';
}

function readEventSourceBody(
  input: string,
  init: RequestInit,
  callbacks?: SendCallbacks,
  eventSourceImpl?: EventSourceConstructor | null,
): Promise<{ finalPayload: unknown | null; error: string | null }> {
  const Source = eventSourceImpl ?? resolveDefaultEventSource();
  if (!Source) return Promise.resolve({ finalPayload: null, error: 'event_source_unavailable' });
  callbacks?.onTransport?.('xhr_event_source');

  return new Promise((resolve) => {
    let settled = false;
    const settle = (result: { finalPayload: unknown | null; error: string | null }) => {
      if (settled) return;
      settled = true;
      source.close();
      resolve(result);
    };

    const source = new Source(input, {
      method: init.method ?? 'GET',
      headers: init.headers as Record<string, unknown>,
      body: init.body,
      timeout: REQUEST_TIMEOUT_MS,
      timeoutBeforeConnection: 0,
      pollingInterval: 0,
      lineEndingCharacter: '\n',
    });

    const signal = init.signal;
    if (signal) {
      if (signal.aborted) {
        settle({ finalPayload: null, error: 'timeout' });
        return;
      }
      signal.addEventListener(
        'abort',
        () => settle({ finalPayload: null, error: 'timeout' }),
        { once: true },
      );
    }

    source.addEventListener('message', (event) => {
      const result = consumeSseFrame(parseSseData(event.data), callbacks);
      if (result.error || result.finalPayload) settle(result);
    });

    source.addEventListener('error', (event) => {
      settle({ finalPayload: null, error: eventSourceErrorMessage(event) });
    });
  });
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
    eventSourceImpl?: EventSourceConstructor | null;
  },
): Promise<{ data: AssistantResponseType | null; error: OrchestratorError | null }> {
  const { url, anonKey, accessToken, signal, callbacks, fetchImpl = fetch as FetchLike, eventSourceImpl } = options;
  if (!accessToken) {
    return { data: null, error: 'not_authenticated' };
  }

  const requestUrl = `${url}/functions/v1/cenaiva-orchestrate`;
  const requestInit: RequestInit = {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(req),
    signal,
  };

  if (shouldUseEventSource(fetchImpl, eventSourceImpl)) {
    const result = await readEventSourceBody(requestUrl, requestInit, callbacks, eventSourceImpl);
    if (result.error) {
      return { data: null, error: result.error };
    }
    if (!result.finalPayload) {
      return { data: null, error: 'no_final_payload' };
    }
    return { data: parseAssistantResponse(result.finalPayload), error: null };
  }

  const response = await fetchImpl(requestUrl, requestInit);

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

  const body = response.body;
  const streamBody = hasReadableStreamBody(body);
  callbacks?.onTransport?.(streamBody ? 'readable_stream' : 'buffered_text');
  const result = streamBody
    ? await readStreamBody(body, callbacks)
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

  // WS-1.3: Pre-open the TLS connection to the edge function so that the
  // first real POST after wake doesn't pay the handshake cost. We send a
  // cheap OPTIONS preflight (no auth required) and ignore the result.
  const prewarm = useCallback(() => {
    if (!isSupabaseConfigured()) return;
    try {
      const { url } = getSupabaseEnv();
      void fetch(`${url}/functions/v1/cenaiva-orchestrate`, {
        method: 'OPTIONS',
        headers: { 'Access-Control-Request-Method': 'POST' },
      }).catch(() => undefined);
    } catch {
      // ignore
    }
  }, []);

  return useMemo(
    () => ({ send, cancel, loading, error, lastErrorRef, prewarm }),
    [send, cancel, loading, error, lastErrorRef, prewarm],
  );
}
