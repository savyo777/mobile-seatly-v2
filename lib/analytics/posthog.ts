/**
 * Build 3e — PostHog product analytics, gated on the user's Privacy
 * settings "Analytics & crash reporting" toggle.
 *
 * Init runs once at app boot in app/_layout.tsx. The SDK starts in
 * DISABLED state and is enabled only after we hydrate the user's
 * preference from AsyncStorage. While disabled, all `capture()`
 * calls are no-ops — no events go to PostHog servers.
 *
 * Setting the key via env (EXPO_PUBLIC_POSTHOG_KEY) means staging
 * vs prod can point at different PostHog projects. Host defaults
 * to the US PostHog cloud; override via EXPO_PUBLIC_POSTHOG_HOST.
 *
 * If the env var is missing, the SDK is never initialized and
 * `getPosthog()` returns null — defensive against accidental
 * data shipping in dev environments without a configured project.
 */

import PostHog from 'posthog-react-native';

const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let instance: PostHog | null = null;
let initPromise: Promise<PostHog | null> | null = null;

export function getPosthog(): PostHog | null {
  return instance;
}

/**
 * Init PostHog once. Safe to call multiple times — returns the
 * cached promise on subsequent calls.
 */
export function initPosthog(): Promise<PostHog | null> {
  if (initPromise) return initPromise;
  if (!POSTHOG_KEY) {
    initPromise = Promise.resolve(null);
    return initPromise;
  }
  initPromise = (async () => {
    try {
      const ph = new PostHog(POSTHOG_KEY, {
        host: POSTHOG_HOST,
        // Off by default; honor the privacy toggle once it's hydrated.
        disabled: true,
        captureAppLifecycleEvents: false,
      });
      instance = ph;
      return ph;
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[posthog] init failed', err);
      return null;
    }
  })();
  return initPromise;
}

/**
 * Toggle analytics on/off based on the user's Privacy setting.
 * Called whenever the toggle flips OR on app boot once we know
 * the persisted preference.
 */
export function setPosthogEnabled(enabled: boolean): void {
  if (!instance) return;
  try {
    if (enabled) instance.optIn();
    else instance.optOut();
  } catch {
    /* best effort */
  }
}

/**
 * Capture an event. No-op when SDK isn't initialized or the user
 * has opted out (PostHog handles the opt-out internally — calls
 * are dropped).
 */
export function capture(event: string, properties?: Record<string, string | number | boolean | null>): void {
  if (!instance) return;
  try {
    instance.capture(event, properties);
  } catch {
    /* best effort */
  }
}

/**
 * Associate the current user with their PostHog identity so
 * back-end queries can correlate events to user_id.
 */
export function identifyUser(userId: string, traits?: Record<string, string | number | boolean | null>): void {
  if (!instance) return;
  try {
    instance.identify(userId, traits);
  } catch {
    /* best effort */
  }
}

/**
 * Clear the identity on sign-out so the next anonymous session
 * doesn't inherit the previous user's distinct_id.
 */
export function resetIdentity(): void {
  if (!instance) return;
  try {
    instance.reset();
  } catch {
    /* best effort */
  }
}
