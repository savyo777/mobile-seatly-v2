/**
 * Records a successful sign-in to public.auth_sign_in_events via the
 * record_sign_in RPC. When the call detects a previously-unseen device
 * fingerprint for this user, the server queues a "new device sign-in"
 * email alert (see notify-new-device-sign-in edge function + the
 * migration 20260517XXXXXX_auth_sign_in_events_and_alert.sql).
 *
 * Best-effort: never throws. A network blip here doesn't break the
 * sign-in itself, just means the alert won't fire for that session.
 * Added 2026-05-17 as Phase 4 hardening.
 */

import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getSupabase } from '@/lib/supabase/client';

/**
 * Build a stable, opaque device identifier from platform / version /
 * model / installation hints. Not a security primitive — just enough
 * for the server to tell "this device the user has used before" from
 * "this device they haven't." Real cryptographic device attestation
 * (App Attest / SafetyNet) would be the upgrade path if needed.
 */
function buildDeviceFingerprint(): string {
  const parts = [
    Platform.OS,
    Platform.Version?.toString() ?? '',
    Constants.expoConfig?.version ?? '',
    (Constants.expoConfig as { ios?: { buildNumber?: string } } | null)?.ios?.buildNumber ?? '',
    (Constants.expoConfig as { android?: { versionCode?: number } } | null)?.android?.versionCode?.toString() ?? '',
    // installationId is per-install, persists across app restarts.
    (Constants as { installationId?: string }).installationId ?? '',
  ];
  // Don't hash — server stores up to 200 chars and a stable opaque
  // string is fine. Hashing client-side adds no security; the RPC
  // already compares strings.
  return parts.filter(Boolean).join('|').slice(0, 200);
}

function buildUserAgent(): string {
  const cfg = Constants.expoConfig as { version?: string; name?: string } | null;
  return [
    cfg?.name ?? 'Cenaiva',
    cfg?.version ?? 'unknown',
    Platform.OS,
    Platform.Version?.toString() ?? '',
  ].join('/').slice(0, 500);
}

/**
 * Tell the server about a successful sign-in. Returns the server's
 * is_new_device flag (or null on failure) so the caller can show a
 * lightweight UI nudge if desired.
 */
export async function recordSignIn(): Promise<{ isNewDevice: boolean | null }> {
  try {
    const supabase = getSupabase();
    if (!supabase) return { isNewDevice: null };

    const { data, error } = await supabase.rpc('record_sign_in', {
      p_device_fingerprint: buildDeviceFingerprint(),
      p_platform: Platform.OS,
      p_app_version: Constants.expoConfig?.version ?? null,
      p_user_agent: buildUserAgent(),
    });
    if (error || !data) return { isNewDevice: null };

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) return { isNewDevice: null };
    const isNewDevice = Boolean((row as { is_new_device?: unknown }).is_new_device);
    return { isNewDevice };
  } catch {
    return { isNewDevice: null };
  }
}
