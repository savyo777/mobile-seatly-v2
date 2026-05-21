import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { StripeProvider } from '@stripe/stripe-react-native';
import * as Sentry from '@sentry/react-native';
import '@/lib/i18n';

// Crash reporting. DSN comes from EXPO_PUBLIC_SENTRY_DSN — empty in dev
// builds disables the SDK without throwing. PII scrubbing is enabled by
// default; we explicitly set `sendDefaultPii: false` so no email/IP/
// device identifiers leave the device. The beforeSend / beforeBreadcrumb
// hooks add a second layer of redaction for any future call site that
// might pass auth tokens or stripe IDs into an exception payload.
// Phase B+ security hardening 2026-05-20.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';

// Patterns we never want shipped to Sentry. JWT-shaped (eyJ…), Stripe
// secret / live keys, Stripe PI / payment-method / customer ids, Supabase
// publishable keys, and any Bearer-token-shaped string. Kept narrow: we
// don't want to scrub random user content that happens to contain a few
// of these substrings, so each pattern requires the full prefix.
const SECRET_PATTERNS: ReadonlyArray<{ re: RegExp; replace: string }> = [
  { re: /eyJ[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+\.[A-Za-z0-9_\-]+/g, replace: '[redacted-jwt]' },
  { re: /\bsk_(?:test|live)_[A-Za-z0-9]{20,}/g, replace: '[redacted-stripe-secret]' },
  { re: /\brk_(?:test|live)_[A-Za-z0-9]{20,}/g, replace: '[redacted-stripe-restricted]' },
  { re: /\bpi_[A-Za-z0-9_]{20,}/g, replace: '[redacted-stripe-pi]' },
  { re: /\bpm_[A-Za-z0-9_]{20,}/g, replace: '[redacted-stripe-pm]' },
  { re: /\bcus_[A-Za-z0-9_]{12,}/g, replace: '[redacted-stripe-customer]' },
  { re: /\bseti_[A-Za-z0-9_]{20,}/g, replace: '[redacted-stripe-seti]' },
  { re: /\bsb_(?:secret|publishable)_[A-Za-z0-9_\-]{20,}/g, replace: '[redacted-supabase-key]' },
  { re: /Bearer\s+[A-Za-z0-9\-._~+\/]+=*/g, replace: 'Bearer [redacted]' },
];

function scrubSecretsFromString(input: unknown): unknown {
  if (typeof input !== 'string') return input;
  let out = input;
  for (const { re, replace } of SECRET_PATTERNS) out = out.replace(re, replace);
  return out;
}

function scrubObject<T>(obj: T): T {
  if (obj == null || typeof obj !== 'object') {
    return scrubSecretsFromString(obj) as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((v) => scrubObject(v)) as unknown as T;
  }
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const keyLower = k.toLowerCase();
    if (
      keyLower === 'authorization'
      || keyLower === 'apikey'
      || keyLower === 'x-api-key'
      || keyLower === 'cookie'
      || keyLower === 'set-cookie'
      || keyLower === 'x-cron-secret'
      || keyLower === 'stripe-signature'
      || keyLower === 'x-stripe-signature'
    ) {
      out[k] = '[redacted]';
    } else if (typeof v === 'string') {
      out[k] = scrubSecretsFromString(v);
    } else if (v && typeof v === 'object') {
      out[k] = scrubObject(v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out as T;
}

if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV?.trim() || 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    debug: __DEV__,
    beforeSend: (event) => {
      // Scrub headers + breadcrumb data + exception message/value strings.
      // We mutate via the scrubObject return to avoid touching Sentry's
      // class instances directly.
      if (event.request) event.request = scrubObject(event.request);
      if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map((b) => scrubObject(b));
      if (event.exception?.values) {
        event.exception.values = event.exception.values.map((ex) => ({
          ...ex,
          value: typeof ex.value === 'string' ? (scrubSecretsFromString(ex.value) as string) : ex.value,
        }));
      }
      if (event.message) event.message = scrubObject(event.message);
      if (event.extra) event.extra = scrubObject(event.extra);
      if (event.contexts) event.contexts = scrubObject(event.contexts);
      return event;
    },
    beforeBreadcrumb: (breadcrumb) => scrubObject(breadcrumb),
  });
}
import { AuthProvider, useAuthSession } from '@/lib/auth/AuthContext';
import { ThemeProvider, useColors } from '@/lib/theme';
import { MenuProvider } from '@/lib/context/MenuContext';
import { ExpensesProvider } from '@/lib/context/ExpensesContext';
import { OwnerRestaurantProvider } from '@/lib/owner/OwnerRestaurantContext';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { CenaivaAssistantProvider } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { CenaivaVoicePreferenceProvider } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import { clearPersistedSupabaseSession, clearSupabaseStorageOnly, getSupabase } from '@/lib/supabase/client';
import { isUnusablePersistedSupabaseAuthError } from '@/lib/supabase/authErrors';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { KeyboardDoneBar } from '@/components/ui/KeyboardDoneBar';
import { PostTurnPromptHost } from '@/components/postVisit/PostTurnPromptHost';
import { NotificationHandler } from '@/components/notifications/NotificationHandler';
import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { getStripeEnv } from '@/lib/stripe/env';
import {
  installGlobalCrashGuard,
  installRouterCrashGuard,
} from '@/lib/runtime/installCrashGuards';
import { runStorageMigrations } from '@/lib/storage/migrate';
import {
  getRecoveryAuthCodeFromUrl,
  getRecoveryTokenHashFromUrl,
  getRecoveryTokensFromUrl,
} from '@/lib/auth/recoveryLinks';
import { classifyDeepLink, logDeepLinkReject } from '@/lib/auth/deepLinkPolicy';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  OWNER_REFERRAL_DEEP_LINK_PATH,
  OWNER_REFERRAL_PENDING_STORAGE_KEY,
  OWNER_REFERRAL_QUERY_PARAM,
  isValidOwnerReferralCode,
} from '@/lib/owner/referralPolicy';

enableScreens(true);
enableFreeze(true);
installGlobalCrashGuard();
installRouterCrashGuard();
void runStorageMigrations();

function RecoveryLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();
    if (!supabase) return;

    const handleUrl = async (url: string) => {
      // Defense in depth: gate every dispatch through the deep-link
      // allowlist before calling Supabase/Stripe. The handlers below
      // already do their own server-side token validation, but the
      // allowlist prevents a hostile URL from EVEN REACHING those
      // handlers — drops the attack surface to just the route shapes
      // we explicitly opted in to.
      const policy = classifyDeepLink(url);
      if (!policy) {
        logDeepLinkReject(url);
        return;
      }
      // Only the recovery + auth_callback kinds need the Supabase token
      // verification dance below. Other kinds are owned by their own
      // handlers (referral, stripe redirects, router navigation).
      if (policy.kind !== 'recovery' && policy.kind !== 'auth_callback') {
        return;
      }
      try {
        const clearIfUnusableAuthError = async (error: unknown) => {
          if (isUnusablePersistedSupabaseAuthError(error)) {
            await clearSupabaseStorageOnly();
          }
        };

        // Direct token_hash deep link (email template uses cenaiva://reset-password?token_hash=...&type=recovery)
        const tokenHashData = getRecoveryTokenHashFromUrl(url);
        if (tokenHashData) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHashData.tokenHash,
            type: 'recovery',
          });
          if (error) {
            await clearIfUnusableAuthError(error);
          } else if (isMounted) {
            router.replace('/(auth)/reset-password?recovery=1');
          }
          return;
        }

        // Implicit flow: access_token + refresh_token in hash fragment
        const tokens = getRecoveryTokensFromUrl(url);
        if (tokens) {
          const { error } = await supabase.auth.setSession({
            access_token: tokens.accessToken,
            refresh_token: tokens.refreshToken,
          });
          if (error) {
            await clearIfUnusableAuthError(error);
          } else if (isMounted) {
            router.replace('/(auth)/reset-password?recovery=1');
          }
          return;
        }

        // PKCE flow: authorization code in query string
        const code = getRecoveryAuthCodeFromUrl(url);
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            await clearIfUnusableAuthError(error);
          } else if (isMounted) {
            router.replace('/(auth)/reset-password?recovery=1');
          }
        }
      } catch (error) {
        if (isUnusablePersistedSupabaseAuthError(error)) await clearSupabaseStorageOnly();
      }
    };

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) void handleUrl(initialUrl);
      })
      .catch(() => undefined);

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    const { data: authSub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' && isMounted) {
        router.replace('/(auth)/reset-password?recovery=1');
      }
    });

    return () => {
      isMounted = false;
      sub.remove();
      authSub.subscription.unsubscribe();
    };
  }, [router]);

  return null;
}

function extractOwnerReferralCode(url: string): string | null {
  try {
    const parsed = Linking.parse(url);
    // Linking.parse strips the scheme; check both `path` and `hostname`
    // because deep-link parsing on iOS/Android can put the segment in
    // either spot depending on how the URL was opened.
    const segment = (parsed.path || parsed.hostname || '').replace(/^\/+/, '').toLowerCase();
    if (segment !== OWNER_REFERRAL_DEEP_LINK_PATH) return null;
    const raw = parsed.queryParams?.[OWNER_REFERRAL_QUERY_PARAM];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (!candidate) return null;
    const normalized = String(candidate).trim().toUpperCase();
    return isValidOwnerReferralCode(normalized) ? normalized : null;
  } catch {
    return null;
  }
}

function OwnerReferralLinkHandler() {
  useEffect(() => {
    let isMounted = true;

    const handleUrl = async (url: string) => {
      const code = extractOwnerReferralCode(url);
      if (!code) return;
      try {
        await AsyncStorage.setItem(
          OWNER_REFERRAL_PENDING_STORAGE_KEY,
          JSON.stringify({ code, capturedAt: new Date().toISOString() }),
        );
      } catch {
        // Storage failure is non-fatal; the referral just won't be
        // remembered across this session.
      }
      if (!isMounted) return;
    };

    Linking.getInitialURL()
      .then((initialUrl) => {
        if (initialUrl) void handleUrl(initialUrl);
      })
      .catch(() => undefined);

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      isMounted = false;
      sub.remove();
    };
  }, []);

  return null;
}

function ThemedRootShell() {
  const c = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { loading, isAuthenticated, isStaffLike, role } = useAuthSession();
  const handleGoHome = React.useCallback(() => {
    router.replace('/' as never);
  }, [router]);

  // Single source of truth for all auth-driven navigation.
  // Runs AFTER React commits state, so destination layouts never see stale values.
  useEffect(() => {
    if (loading) return;
    const seg0 = segments[0] as string | undefined;
    const seg1 = segments[1] as string | undefined;

    // Authenticated user on an auth screen → send them into the app.
    if (isAuthenticated && role !== null && seg0 === '(auth)') {
      if (seg1 === 'reset-password' || seg1 === 'verify-phone-otp') return;
      router.replace(isStaffLike ? '/(staff)' as never : '/(customer)/discover' as never);
      return;
    }

    // Unauthenticated user on a protected screen → send to auth welcome.
    if (!isAuthenticated && (seg0 === '(customer)' || seg0 === '(staff)')) {
      router.replace('/(auth)/welcome' as never);
    }
  }, [loading, isAuthenticated, role, isStaffLike, segments, router]);

  return (
    <>
      <RecoveryLinkHandler />
      <OwnerReferralLinkHandler />
      <NotificationHandler />
      <StatusBar style="auto" backgroundColor={c.bgBase} />
      <AppErrorBoundary resetKey={pathname} onGoHome={handleGoHome}>
        <Stack screenOptions={createStackTransitionOptions(c.bgBase)}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(customer)" />
          <Stack.Screen name="(staff)" />
          <Stack.Screen name="booking" />
          <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
        </Stack>
        <PostTurnPromptHost />
        <CookieConsentBanner />
        <KeyboardDoneBar />
      </AppErrorBoundary>
    </>
  );
}

export default function RootLayout() {
  const { publishableKey } = getStripeEnv();
  const isExpoGo = Constants.appOwnership === 'expo';
  const providers = (
    <ThemeProvider>
      <AuthProvider>
        <OwnerRestaurantProvider>
          <MenuProvider>
            <ExpensesProvider>
              <CenaivaVoicePreferenceProvider>
                <CenaivaAssistantProvider>
                  <ThemedRootShell />
                </CenaivaAssistantProvider>
              </CenaivaVoicePreferenceProvider>
            </ExpensesProvider>
          </MenuProvider>
        </OwnerRestaurantProvider>
      </AuthProvider>
    </ThemeProvider>
  );

  const app = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{providers}</SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (isExpoGo || !publishableKey) return app;

  // Apple Pay merchant id. Falls back to the historical hardcoded value
  // when the env var isn't set so existing builds keep working.
  // Override via EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER if/when we move
  // to a different Apple Developer merchant id without rebuilding.
  const merchantIdentifier =
    process.env.EXPO_PUBLIC_STRIPE_MERCHANT_IDENTIFIER || 'merchant.com.cenaiva';

  return (
    <StripeProvider publishableKey={publishableKey} merchantIdentifier={merchantIdentifier}>
      {app}
    </StripeProvider>
  );
}
