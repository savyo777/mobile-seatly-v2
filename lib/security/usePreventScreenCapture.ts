/**
 * Tiny wrapper around `expo-screen-capture` that survives a missing
 * native module (stale dev client) by no-op'ing instead of throwing.
 *
 * Mount on screens that display:
 *   - Passwords / OTP codes (login, reset-password, verify-otp)
 *   - Card input (Stripe PaymentSheet host screen)
 *   - Live deposit / receipt details that include PII
 *
 * Effect:
 *   - Android: sets WindowManager.LayoutParams.FLAG_SECURE on the
 *     hosting Activity → screenshot button is disabled and the screen
 *     shows black in the Recent Apps thumbnail + during screen
 *     recordings.
 *   - iOS: replaces the App Switcher snapshot with a black square
 *     (still allows user-initiated screenshots; iOS doesn't expose a
 *     FLAG_SECURE equivalent).
 *
 * Restored on screen unmount.
 *
 * Added 2026-05-20 in the Phase B+ mobile hardening pass.
 */

import { useEffect } from 'react';

export function usePreventScreenCapture(): void {
  useEffect(() => {
    let mounted = true;
    let restore: (() => void) | null = null;
    void (async () => {
      try {
        const mod = await import('expo-screen-capture');
        if (!mounted) return;
        // Both APIs exist depending on expo-screen-capture version.
        // preventScreenCaptureAsync (newer) / preventScreenCapture (legacy).
        // Try the newer async first.
        const preventFn = (mod as { preventScreenCaptureAsync?: (tag?: string) => Promise<void> }).preventScreenCaptureAsync
          ?? (mod as { preventScreenCapture?: () => Promise<void> }).preventScreenCapture;
        const allowFn = (mod as { allowScreenCaptureAsync?: (tag?: string) => Promise<void> }).allowScreenCaptureAsync
          ?? (mod as { allowScreenCapture?: () => Promise<void> }).allowScreenCapture;
        if (typeof preventFn === 'function') {
          await preventFn();
          if (typeof allowFn === 'function') {
            restore = () => { void allowFn(); };
          }
        }
      } catch {
        if (__DEV__) {
          // eslint-disable-next-line no-console
          console.warn(
            '[usePreventScreenCapture] expo-screen-capture not linked — screen-capture protection skipped. Rebuild the dev client to wire it.',
          );
        }
      }
    })();
    return () => {
      mounted = false;
      if (restore) restore();
    };
  }, []);
}
