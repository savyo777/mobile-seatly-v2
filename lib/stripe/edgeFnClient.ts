import { getSupabase } from '@/lib/supabase/client';
import { getSupabaseEnv, isSupabaseConfigured } from '@/lib/supabase/env';

/**
 * Shared edge-function client for every Stripe / pricing / checkout call.
 *
 * Why centralized: per MOBILE_STRIPE_TRANSFER.md §24 every payment-touching
 * endpoint has rate limits + structured error codes; the call sites used to
 * each implement their own fetch + JSON + auth-header pattern, which led to
 * inconsistent error handling (and one silent no-op in the previous launch-
 * prep pass). This wrapper:
 *
 *   - Resolves the user's JWT via the existing supabase client (so callers
 *     don't have to thread `accessToken` through their props).
 *   - Adds the `apikey` + `Authorization` headers correctly.
 *   - Times the request out so a slow Supabase doesn't hang the UI.
 *   - Surfaces structured errors as `EdgeFnError` with the doc's
 *     `unavailable_reason` codes (§25) attached.
 *
 * Existing pre-Stripe call sites (lib/booking/holdApi.ts,
 * lib/booking/publicBookingApi.ts) still use their inline fetch patterns.
 * Don't refactor them in this pass — they work; the new wrapper is for
 * the new Stripe-only call sites added in this session.
 */

const DEFAULT_TIMEOUT_MS = 25_000;

export class EdgeFnError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly unavailableReason: string | null;
  readonly body: unknown;

  constructor(
    status: number,
    message: string,
    options: {
      code?: string | null;
      unavailableReason?: string | null;
      body?: unknown;
    } = {},
  ) {
    super(message);
    this.name = 'EdgeFnError';
    this.status = status;
    this.code = options.code ?? null;
    this.unavailableReason = options.unavailableReason ?? null;
    this.body = options.body;
  }
}

export interface CallEdgeFnOptions {
  fn: string;
  body?: Record<string, unknown>;
  /** GET when no body and method not overridden — Stripe-list-methods is GET per doc §23.11. */
  method?: 'GET' | 'POST';
  /**
   * `required` throws if no Supabase session is found (owner / logged-in
   * diner endpoints). `optional` attaches JWT if present. `none` sends
   * only the apikey header (public endpoints like find-reservation).
   * Defaults to `required` because most Stripe-touching calls need auth.
   */
  auth?: 'required' | 'optional' | 'none';
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function callEdgeFn<T>({
  fn,
  body,
  method,
  auth = 'required',
  timeoutMs = DEFAULT_TIMEOUT_MS,
  signal: callerSignal,
}: CallEdgeFnOptions): Promise<T> {
  if (!isSupabaseConfigured()) {
    throw new EdgeFnError(0, 'Supabase isn’t configured. Check EXPO_PUBLIC_SUPABASE_URL.');
  }
  const { url, anonKey } = getSupabaseEnv();

  let bearer: string | null = null;
  if (auth !== 'none') {
    const supabase = getSupabase();
    if (supabase) {
      const { data } = await supabase.auth.getSession();
      bearer = data.session?.access_token ?? null;
    }
    if (auth === 'required' && !bearer) {
      throw new EdgeFnError(401, 'Please sign in to continue.', { code: 'auth_required' });
    }
  }

  const resolvedMethod = method ?? (body ? 'POST' : 'GET');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  // Forward the caller's abort signal too so a screen unmount cleanly
  // cancels in-flight requests instead of resolving after the user left.
  const cleanupCallerSignal =
    callerSignal != null
      ? (() => {
          const onAbort = () => controller.abort();
          callerSignal.addEventListener('abort', onAbort);
          return () => callerSignal.removeEventListener('abort', onAbort);
        })()
      : () => undefined;

  try {
    const response = await fetch(`${url}/functions/v1/${fn}`, {
      method: resolvedMethod,
      signal: controller.signal,
      headers: {
        apikey: anonKey,
        ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
        ...(body && resolvedMethod === 'POST' ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body && resolvedMethod === 'POST' ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const parsed: unknown = text ? safeJson(text) : null;

    if (!response.ok) {
      const msg =
        readString(parsed, 'error') ??
        readString(parsed, 'message') ??
        defaultMessageForStatus(response.status);
      const code = readString(parsed, 'code');
      const reason = readString(parsed, 'unavailable_reason');
      throw new EdgeFnError(response.status, msg, {
        code,
        unavailableReason: reason,
        body: parsed,
      });
    }

    return (parsed ?? ({} as T)) as T;
  } catch (err) {
    if (err instanceof EdgeFnError) throw err;
    if (isAbortError(err)) {
      throw new EdgeFnError(0, 'The request timed out. Please try again.', {
        code: 'timeout',
      });
    }
    throw new EdgeFnError(0, friendlyTransport(err), { code: 'network_error' });
  } finally {
    clearTimeout(timer);
    cleanupCallerSignal();
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readString(value: unknown, key: string): string | null {
  if (!value || typeof value !== 'object') return null;
  const v = (value as Record<string, unknown>)[key];
  return typeof v === 'string' && v.length > 0 ? v : null;
}

function isAbortError(err: unknown): boolean {
  return Boolean(err && typeof err === 'object' && (err as { name?: string }).name === 'AbortError');
}

function defaultMessageForStatus(status: number): string {
  // User-friendly per MOBILE_STRIPE_TRANSFER.md §25. Specific Stripe error
  // codes are mapped at the call site (each domain knows its own messages).
  if (status === 401) return 'Please sign in and try again.';
  if (status === 402) return 'Payment required to complete this action.';
  if (status === 403) return 'You don’t have permission for this action.';
  if (status === 404) return 'We couldn’t find that.';
  if (status === 409) return 'That conflicts with a current change. Refresh and try again.';
  if (status === 410) return 'That action is no longer available.';
  if (status === 429) return 'Too many requests. Wait a moment and try again.';
  if (status >= 500) return 'Something went wrong on our end. Please try again.';
  return 'Something went wrong. Please try again.';
}

function friendlyTransport(err: unknown): string {
  if (err instanceof Error) {
    if (err.message.toLowerCase().includes('network')) return 'No network. Check your connection.';
    return err.message;
  }
  return 'Network error. Please try again.';
}
