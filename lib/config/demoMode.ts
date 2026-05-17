import Constants from 'expo-constants';

/**
 * Demo mode flag. When true, screens fall back to mock data and the
 * `mockCustomer.id` identity (see lib/auth/currentUserId.ts).
 *
 * Production EAS builds set EXPO_PUBLIC_CENAIVA_DEMO_MODE=false. If
 * that wiring ever breaks (env var unset, typo, copy-paste error), a
 * release build would silently ship with mock data — so we add a
 * runtime sanity check that warns once on app start when demo is on
 * AND the build looks like a production binary. The warning lands in
 * crash_logs (via logCrash) for ops visibility; in dev it just goes
 * to console so engineers see it without spamming the table.
 */

let warned = false;

function looksLikeProductionBuild(): boolean {
  // Expo's app.json release-channel is the most reliable hint:
  //   - undefined / "default" / "main" → dev or branch build
  //   - "production" / "release" → store build
  const channel = (Constants.expoConfig as { releaseChannel?: string } | null)
    ?.releaseChannel?.toLowerCase();
  if (channel && (channel === 'production' || channel === 'release')) return true;
  // EAS Build sets `Constants.executionEnvironment` to 'standalone' for
  // production binaries built via `eas build --profile production` and
  // 'storeClient' for App Store / Play Store distributions.
  const execEnv = (Constants as { executionEnvironment?: string }).executionEnvironment;
  if (execEnv === 'standalone' || execEnv === 'storeClient') return true;
  // Fallback: assume any non-DEV build is production.
  return typeof __DEV__ === 'undefined' || __DEV__ === false;
}

export function isDemoModeEnabled(): boolean {
  const enabled = process.env.EXPO_PUBLIC_CENAIVA_DEMO_MODE === 'true';
  if (enabled && !warned && looksLikeProductionBuild()) {
    warned = true;
    if (typeof __DEV__ !== 'undefined' && __DEV__) {
      // dev → loud console warning so engineers notice immediately.
      // eslint-disable-next-line no-console
      console.warn(
        '[demoMode] EXPO_PUBLIC_CENAIVA_DEMO_MODE=true detected in a ' +
          'production-shaped build. This means real users would see mock data ' +
          'and the mockCustomer.id identity fallback. Set it to false in the ' +
          'production EAS profile.',
      );
    } else {
      // production → log to crash_logs (fire-and-forget). We import
      // lazily to avoid pulling supabase client into the demo-mode
      // import graph on every read.
      void (async () => {
        try {
          const mod = await import('@/lib/errors/crashLogger');
          await mod.logCrash(
            new Error('demo_mode_in_production_build'),
            { route: 'demo-mode-guard', extra: { source: 'isDemoModeEnabled' } },
          );
        } catch {
          /* never throw from the demo-mode check */
        }
      })();
    }
  }
  return enabled;
}
