import type {
  CenaivaAvailabilityRequest,
  CenaivaAvailabilityResponse,
} from '@/lib/cenaiva/localBookingCollector';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

export type CenaivaAvailabilityError =
  | 'not_authenticated'
  | 'not_configured'
  | `http_${number}`
  | string;

type FetchLikeResponse = {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
};

type FetchLike = (input: string, init: RequestInit) => Promise<FetchLikeResponse>;

function parseAvailabilityResponse(payload: unknown): CenaivaAvailabilityResponse | null {
  if (!payload || typeof payload !== 'object') return null;
  const value = payload as Partial<CenaivaAvailabilityResponse>;
  if (
    value.status === 'available' ||
    value.status === 'unavailable' ||
    value.status === 'options' ||
    value.status === 'needs_more_info'
  ) {
    return value as CenaivaAvailabilityResponse;
  }
  return null;
}

export async function postCenaivaAvailability(
  req: CenaivaAvailabilityRequest,
  options: {
    accessToken: string | null | undefined;
    signal?: AbortSignal;
    fetchImpl?: FetchLike;
  },
): Promise<{ data: CenaivaAvailabilityResponse | null; error: CenaivaAvailabilityError | null }> {
  if (!isSupabaseConfigured()) return { data: null, error: 'not_configured' };

  const { url, anonKey } = getSupabaseEnv();
  const fetchImpl = options.fetchImpl ?? (fetch as FetchLike);
  const response = await fetchImpl(`${url}/functions/v1/cenaiva-availability`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.accessToken || anonKey}`,
      apikey: anonKey,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(req),
    signal: options.signal,
  });

  if (!response.ok) {
    let message: CenaivaAvailabilityError = `http_${response.status}`;
    try {
      const body = await response.json();
      if (body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string') {
        message = (body as { error: string }).error;
      }
    } catch {
      // ignore non-JSON error bodies
    }
    return { data: null, error: message };
  }

  const parsed = parseAvailabilityResponse(await response.json());
  return parsed
    ? { data: parsed, error: null }
    : { data: null, error: 'invalid_response' };
}
