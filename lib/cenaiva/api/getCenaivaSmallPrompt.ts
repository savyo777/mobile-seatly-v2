import type { BookingState } from '@cenaiva/assistant';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export type CenaivaSmallPromptResponse = {
  spoken_text: string;
  next_expected_input: 'restaurant' | 'party_size' | 'date' | 'time' | 'confirmation';
  audio?: {
    audio_base64: string;
    audio_content_type?: string | null;
  } | null;
};

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string, init: RequestInit) => Promise<FetchLikeResponse>;

function parseSmallPromptResponse(payload: unknown): CenaivaSmallPromptResponse | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Partial<CenaivaSmallPromptResponse>;
  if (typeof value.spoken_text !== 'string' || !value.spoken_text.trim()) return null;
  if (
    value.next_expected_input !== 'restaurant' &&
    value.next_expected_input !== 'party_size' &&
    value.next_expected_input !== 'date' &&
    value.next_expected_input !== 'time' &&
    value.next_expected_input !== 'confirmation'
  ) {
    return null;
  }
  return {
    spoken_text: value.spoken_text.trim(),
    next_expected_input: value.next_expected_input,
    audio:
      value.audio &&
      typeof value.audio === 'object' &&
      typeof value.audio.audio_base64 === 'string' &&
      value.audio.audio_base64.trim()
        ? {
            audio_base64: value.audio.audio_base64,
            audio_content_type:
              typeof value.audio.audio_content_type === 'string'
                ? value.audio.audio_content_type
                : null,
          }
        : null,
  };
}

export async function postCenaivaSmallPrompt(
  req: {
    transcript: string;
    booking: Pick<BookingState, 'restaurant_id' | 'restaurant_name' | 'party_size' | 'date' | 'time'>;
    voice_id?: string | null;
  },
  options: {
    accessToken: string | null | undefined;
    signal?: AbortSignal;
    fetchImpl?: FetchLike;
  },
): Promise<{ data: CenaivaSmallPromptResponse | null; error: string | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: 'not_configured' };
  if (!options.accessToken) return { data: null, error: 'not_authenticated' };

  const { url, anonKey } = getSupabaseEnv();
  const fetchImpl = options.fetchImpl ?? (fetch as FetchLike);
  const response = await fetchImpl(`${url}/functions/v1/cenaiva-small-prompt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
    signal: options.signal,
  });

  if (!response.ok) {
    return { data: null, error: `http_${response.status}` };
  }
  return { data: parseSmallPromptResponse(await response.json()), error: null };
}

export function prewarmCenaivaSmallPrompt(options: {
  accessToken: string | null | undefined;
  voiceId?: string | null;
  fetchImpl?: FetchLike;
}) {
  if (!isSupabaseConfigured() || !options.accessToken) return;
  const { url, anonKey } = getSupabaseEnv();
  const fetchImpl = options.fetchImpl ?? (fetch as FetchLike);
  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 6_000) : null;

  void fetchImpl(`${url}/functions/v1/cenaiva-small-prompt`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({
      transcript: 'Thanks',
      booking: {},
      voice_id: options.voiceId ?? undefined,
      prewarm: true,
    }),
    signal: controller?.signal,
  })
    .catch(() => undefined)
    .finally(() => {
      if (timeoutId) clearTimeout(timeoutId);
    });
}
