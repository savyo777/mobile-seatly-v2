/**
 * Tiny wrapper around `expo-screen-capture` that survives a missing
 * native module (stale dev client) by no-op'ing instead of throwing.
 *
 * Mount on screens that display:
 *   - Passwords / OTP codes (login, reset-password, verify-otp)
 *   - Card input (Stripe PaymentSheet host screen)
 *   - Live deposit / receipt details that include PII
 *
 * Effect (only when the native module is linked):
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
 * Implementation note: `expo-screen-capture`'s package index calls
 * `requireNativeModule('ExpoScreenCapture')` at top-level evaluation,
 * which throws synchronously when the native side isn't linked. In
 * Hermes that throw escapes ordinary try/catch (it's surfaced via the
 * RN errorUtils global handler, not as a JS exception). To no-op
 * safely we PROBE for the native module via `NativeModules` BEFORE
 * `require`-ing the JS shim. The probe doesn't trigger the throw.
 *
 * Added 2026-05-20 in the Phase B+ hardening pass; native-probe guard
 * added 2026-05-21 after a crash on a dev client that hadn't been
 * rebuilt with the module yet.
 */

import { useEffect } from 'react';
import { NativeModules } from 'react-native';

type ScreenCaptureModule = {
  preventScreenCaptureAsync?: (tag?: string) => Promise<void>;
  preventScreenCapture?: () => Promise<void>;
  allowScreenCaptureAsync?: (tag?: string) => Promise<void>;
  allowScreenCapture?: () => Promise<void>;
};

let cachedModule: ScreenCaptureModule | null | undefined;
let warnedMissing = false;

function nativeAvailable(): boolean {
  // The expo-modules autolinker registers native modules under
  // NativeModules.* (legacy bridge) AND via NativeModulesProxy +
  // requireNativeModule (new). Either lookup confirms presence; if
  // both are missing the JS package will throw on require.
  const direct = (NativeModules as Record<string, unknown>).ExpoScreenCapture;
  if (direct) return true;
  const proxy = (NativeModules as { NativeUnimoduleProxy?: { modulesConstants?: { ExpoScreenCapture?: unknown } } })
    .NativeUnimoduleProxy?.modulesConstants?.ExpoScreenCapture;
  return Boolean(proxy);
}

function loadModule(): ScreenCaptureModule | null {
  if (cachedModule !== undefined) return cachedModule;
  if (!nativeAvailable()) {
    cachedModule = null;
    if (__DEV__ && !warnedMissing) {
      warnedMissing = true;
      // eslint-disable-next-line no-console
      console.warn(
        '[usePreventScreenCapture] expo-screen-capture native module not linked — protection skipped. Rebuild the dev client to wire it.',
      );
    }
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports, global-require
    cachedModule = require('expo-screen-capture') as ScreenCaptureModule;
    return cachedModule;
  } catch {
    cachedModule = null;
    return null;
  }
}

export function usePreventScreenCapture(): void {
  useEffect(() => {
    const mod = loadModule();
    if (!mod) return;
    const preventFn = mod.preventScreenCaptureAsync ?? mod.preventScreenCapture;
    const allowFn = mod.allowScreenCaptureAsync ?? mod.allowScreenCapture;
    if (typeof preventFn !== 'function') return;
    let restored = false;
    void (async () => {
      try {
        await preventFn();
      } catch {
        // best-effort
      }
    })();
    return () => {
      if (restored) return;
      restored = true;
      if (typeof allowFn === 'function') {
        Promise.resolve()
          .then(() => allowFn())
          .catch(() => {
            /* best-effort */
          });
      }
    };
  }, []);
}
