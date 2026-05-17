import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSupabase } from '@/lib/supabase/client';
import { scrubCrashContext, scrubCrashString } from '@/lib/errors/scrubCrashContext';

/**
 * In-house crash logger. Fire-and-forget POST of a single error event
 * to the `crash_logs` table via the `insert_crash_log` RPC. Never throws.
 *
 * Read crashes via the Supabase SQL editor (service-role bypasses RLS):
 *
 *   select platform, app_version, route, message, count(*)
 *   from public.crash_logs
 *   where occurred_at > now() - interval '24 hours'
 *   group by 1, 2, 3, 4
 *   order by count desc
 *   limit 20;
 *
 * Set EXPO_PUBLIC_CRASH_LOGGER_ENABLED=false in `.env` (or via EAS) to
 * disable the logger entirely if it ever misbehaves in production.
 */

const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 16_000;

function isEnabled(): boolean {
  // Default ON. Only the literal string "false" disables.
  return process.env.EXPO_PUBLIC_CRASH_LOGGER_ENABLED !== 'false';
}

function appVersion(): string | null {
  const v = Constants.expoConfig?.version;
  return typeof v === 'string' && v.trim() ? v : null;
}

function buildNumber(): string | null {
  const cfg = Constants.expoConfig as { ios?: { buildNumber?: string }; android?: { versionCode?: number } } | null;
  if (Platform.OS === 'ios' && cfg?.ios?.buildNumber) return cfg.ios.buildNumber;
  if (Platform.OS === 'android' && cfg?.android?.versionCode != null) {
    return String(cfg.android.versionCode);
  }
  return null;
}

function truncate(s: unknown, max: number): string | null {
  if (typeof s !== 'string' || !s.trim()) return null;
  return s.length > max ? s.slice(0, max) : s;
}

function safeStringify(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

function extractMessage(err: unknown): string | null {
  if (err == null) return null;
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  if (typeof err === 'object') {
    const rec = err as { message?: unknown };
    if (typeof rec.message === 'string') return rec.message;
    return safeStringify(err);
  }
  return safeStringify(err);
}

function extractStack(err: unknown): string | null {
  if (err instanceof Error && typeof err.stack === 'string') return err.stack;
  if (err && typeof err === 'object') {
    const rec = err as { stack?: unknown };
    if (typeof rec.stack === 'string') return rec.stack;
  }
  return null;
}

export interface CrashContext {
  /** The route the user was on when the crash happened (usePathname() result). */
  route?: string | null;
  /** Anything else worth recording — component stack, props snapshot, etc. */
  extra?: Record<string, unknown>;
}

/**
 * Capture a single crash event. Always returns. Never throws. Safe to
 * `void logCrash(err)` from any catch / error-boundary site.
 */
export async function logCrash(err: unknown, context?: CrashContext): Promise<void> {
  if (!isEnabled()) return;
  const supabase = getSupabase();
  if (!supabase) return;

  try {
    // PII scrub before posting. The crash_logs table is service-role
    // readable only, but defense-in-depth: a caller that includes
    // { email, phone, token, card } in their context shouldn't have
    // that data persisted server-side. See scrubCrashContext.ts for
    // the redaction rules.
    const scrubbedMessage = scrubCrashString(extractMessage(err));
    const scrubbedStack = scrubCrashString(extractStack(err));
    const scrubbedExtra = scrubCrashContext(context?.extra);

    const payload = {
      p_platform: Platform.OS,
      p_app_version: appVersion(),
      p_build_number: buildNumber(),
      p_route: truncate(context?.route ?? null, 200),
      p_message: truncate(scrubbedMessage, MAX_MESSAGE_LENGTH),
      p_stack: truncate(scrubbedStack, MAX_STACK_LENGTH),
      p_context: scrubbedExtra,
    };
    const { error } = await supabase.rpc('insert_crash_log', payload);
    if (error && __DEV__) {
      // The crash logger itself shouldn't crash. If the RPC is missing
      // (migration not yet applied) we just swallow the error.
      console.warn('[crashLogger] insert_crash_log RPC failed', error);
    }
  } catch (loggerErr) {
    if (__DEV__) console.warn('[crashLogger] logCrash threw', loggerErr);
  }
}
