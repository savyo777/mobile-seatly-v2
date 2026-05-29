// Module-level handoff between the menu-scan picker screen and the
// menu-scan-review screen. Mirrors the receipt-scanner pattern at
// lib/expenses/pendingScan.ts — keeps the base64 image OUT of router
// params (which can't carry MB-sized payloads on iOS) and lets the
// review screen consume it once after navigation.

export type PendingMenuScanSource = 'camera' | 'library' | 'file';

export interface PendingMenuScan {
  uri: string;
  base64: string;
  mimeType: string;
  source: PendingMenuScanSource;
  fileName?: string;
}

let pending: PendingMenuScan | null = null;

export function setPendingMenuScan(scan: PendingMenuScan): void {
  pending = scan;
}

/** Single-shot getter — clears the pending scan after returning it so
 * navigating back doesn't accidentally re-trigger the AI extraction. */
export function consumePendingMenuScan(): PendingMenuScan | null {
  const next = pending;
  pending = null;
  return next;
}

export function clearPendingMenuScan(): void {
  pending = null;
}
