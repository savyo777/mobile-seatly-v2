// Tiny in-memory hand-off between the receipt-scanner camera screen and
// the review screen. The captured image is too large to round-trip
// through expo-router URL params, so the camera writes the payload here
// and the review screen consumes it on mount.

export interface PendingScan {
  uri: string;
  base64: string;
  mimeType: string;
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
