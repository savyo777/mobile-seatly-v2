/**
 * Build 3e — persistence for the user's "Analytics & crash reporting"
 * toggle from Profile > Privacy.
 *
 * The PostHog SDK reads this preference at boot via initPosthog() +
 * setPosthogEnabled(). Sentry is separate; we don't toggle Sentry
 * via the user preference because it's our error-monitoring tool
 * and is needed for crash reporting regardless. ToS §19 is explicit
 * that Sentry stays on; only PostHog product analytics is opt-in.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { key } from '@/lib/storage/keys';

const KEY = key('analytics-opt-in');

/** Default to ON since user explicitly chose to allow analytics in the toggle UI. */
const DEFAULT_OPT_IN = true;

export async function getAnalyticsOptIn(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw === null) return DEFAULT_OPT_IN;
    return raw === 'true';
  } catch {
    return DEFAULT_OPT_IN;
  }
}

export async function setAnalyticsOptIn(optIn: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, optIn ? 'true' : 'false');
  } catch {
    /* best effort */
  }
}
