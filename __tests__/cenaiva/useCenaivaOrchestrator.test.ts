import {
  consumeSseText,
  postCenaivaOrchestrator,
} from '@/lib/cenaiva/api/useCenaivaOrchestrator';

const finalPayload = {
  conversation_id: 'conv-1',
  spoken_text: 'Done',
  intent: 'general_question',
  step: 'done',
  next_expected_input: 'none',
  ui_actions: [],
  booking: null,
  map: null,
  filters: null,
};

function sseFrame(frame: unknown) {
  return `data: ${JSON.stringify(frame)}\n\n`;
}

describe('consumeSseText', () => {
  it('parses speech chunks, discard frames, and final payload', () => {
    const chunks: string[] = [];
    let discarded = false;

    const result = consumeSseText(
      [
        'data: {"type":"speech_chunk","text":"Hello"}',
        '',
        'data: {"type":"discard_pending_speech"}',
        '',
        `data: ${JSON.stringify({ type: 'final', payload: finalPayload })}`,
        '',
      ].join('\n'),
      {
        onSpeechChunk: (text) => chunks.push(text),
        onDiscardPendingSpeech: () => {
          discarded = true;
        },
      },
    );

    expect(chunks).toEqual(['Hello']);
    expect(discarded).toBe(true);
    expect(result.finalPayload).toEqual(finalPayload);
    expect(result.error).toBeNull();
  });

  it('surfaces stream errors', () => {
    const result = consumeSseText('data: {"type":"error","message":"bad"}\n\n');
    expect(result.error).toBe('bad');
    expect(result.finalPayload).toBeNull();
  });
});

describe('postCenaivaOrchestrator', () => {
  it('posts to cenaiva-orchestrate with bearer token, anon key, SSE accept header, body, and signal', async () => {
    const controller = new AbortController();
    const transports: string[] = [];
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      body: null,
      text: async () => sseFrame({ type: 'final', payload: finalPayload }),
      json: async () => ({}),
    }));

    const result = await postCenaivaOrchestrator(
      {
        transcript: 'book dinner',
        booking_state: { party_size: 2, date: '2026-05-02', time: '19:00' },
        assistant_memory: {
          discovery: {
            transcript: 'closest restaurant',
            recommendation_mode: 'single',
            cuisine: null,
            cuisine_group: null,
            city: null,
            query: null,
            sort_by: 'distance',
            full_restaurant_ids: ['r1', 'r2'],
            displayed_restaurant_ids: ['r1'],
            exhausted_restaurant_ids: ['r1'],
          },
          booking_process: null,
        },
      },
      {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
        accessToken: 'access-token',
        signal: controller.signal,
        fetchImpl,
        callbacks: {
          onTransport: (transport) => transports.push(transport),
        },
      },
    );

    expect(result.error).toBeNull();
    expect(result.data?.conversation_id).toBe('conv-1');
    expect(transports).toEqual(['buffered_text']);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [[url, init]] = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(url).toBe('https://example.supabase.co/functions/v1/cenaiva-orchestrate');
    expect(init.method).toBe('POST');
    expect(init.signal).toBe(controller.signal);
    expect(init.headers).toEqual({
      Authorization: 'Bearer access-token',
      apikey: 'anon-key',
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    });
    expect(JSON.parse(init.body as string)).toMatchObject({
      transcript: 'book dinner',
      booking_state: { party_size: 2, date: '2026-05-02', time: '19:00' },
      assistant_memory: {
        discovery: {
          full_restaurant_ids: ['r1', 'r2'],
          displayed_restaurant_ids: ['r1'],
        },
      },
    });
  });

  it('returns not_authenticated without calling fetch when there is no session token', async () => {
    const fetchImpl = jest.fn();

    const result = await postCenaivaOrchestrator(
      { transcript: 'hello' },
      {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
        accessToken: null,
        fetchImpl,
      },
    );

    expect(result).toEqual({ data: null, error: 'not_authenticated' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('handles non-OK JSON errors', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: false,
      status: 500,
      body: null,
      text: async () => '',
      json: async () => ({ error: 'edge_failed' }),
    }));

    const result = await postCenaivaOrchestrator(
      { transcript: 'hello' },
      {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
        accessToken: 'access-token',
        fetchImpl,
      },
    );

    expect(result).toEqual({ data: null, error: 'edge_failed' });
  });

  it('handles missing final payloads', async () => {
    const fetchImpl = jest.fn(async () => ({
      ok: true,
      status: 200,
      body: null,
      text: async () => sseFrame({ type: 'speech_chunk', text: 'Still thinking' }),
      json: async () => ({}),
    }));

    const result = await postCenaivaOrchestrator(
      { transcript: 'hello' },
      {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
        accessToken: 'access-token',
        fetchImpl,
      },
    );

    expect(result).toEqual({ data: null, error: 'no_final_payload' });
  });

  it('uses XHR event-source streaming when provided before falling back to fetch buffering', async () => {
    const chunks: string[] = [];
    const transports: string[] = [];
    const fetchImpl = jest.fn();

    class FakeEventSource {
      private listeners: Record<string, Array<(event: { data?: string | null; type?: string }) => void>> = {};

      constructor(public url: string, public options?: Record<string, unknown>) {
        queueMicrotask(() => {
          this.listeners.message?.forEach((listener) =>
            listener({ data: JSON.stringify({ type: 'speech_chunk', text: 'One moment.' }) }),
          );
          this.listeners.message?.forEach((listener) =>
            listener({ data: JSON.stringify({ type: 'final', payload: finalPayload }) }),
          );
        });
      }

      addEventListener(type: string, listener: (event: { data?: string | null; type?: string }) => void) {
        this.listeners[type] = [...(this.listeners[type] ?? []), listener];
      }

      close() {}
    }

    const result = await postCenaivaOrchestrator(
      { transcript: 'find Italian near me' },
      {
        url: 'https://example.supabase.co',
        anonKey: 'anon-key',
        accessToken: 'access-token',
        fetchImpl,
        eventSourceImpl: FakeEventSource as any,
        callbacks: {
          onSpeechChunk: (text) => chunks.push(text),
          onTransport: (transport) => transports.push(transport),
        },
      },
    );

    expect(result.error).toBeNull();
    expect(result.data?.conversation_id).toBe('conv-1');
    expect(chunks).toEqual(['One moment.']);
    expect(transports).toEqual(['xhr_event_source']);
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
