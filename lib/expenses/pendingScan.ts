// Tiny in-memory hand-off between the receipt-scanner camera screen and
// the review screen. The captured image is too large to round-trip
// through expo-router URL params, so the camera writes the payload here
// and the review screen consumes it on mount.
//
// The same hand-off is reused by the "file" entry-point (Files app
// picker) — `source` tells the review screen where the bytes came from
// so it can adjust copy/AI behavior. Manual entry does NOT use this
// channel: the review screen opens with no pending payload.

export type PendingScanSource = 'camera' | 'file';

export interface PendingScan {
  uri: string;
  base64: string;
  mimeType: string;
  source: PendingScanSource;
  fileName?: string | null;
}

let pending: PendingScan | null = null;

export function setPendingScan(scan: PendingScan): void {
  pending = scan;
}

export function consumePendingScan(): PendingScan | null {
  const value = pending;
  pending = null;
  return value;
}

export function peekPendingScan(): PendingScan | null {
  return pending;
}

export function clearPendingScan(): void {
  pending = null;
}
