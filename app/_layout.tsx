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
// device identifiers leave the device.
const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN?.trim() || '';
if (sentryDsn) {
  Sentry.init({
    dsn: sentryDsn,
    environment: process.env.EXPO_PUBLIC_SENTRY_ENV?.trim() || 'production',
    tracesSampleRate: 0.1,
    sendDefaultPii: false,
    enableAutoSessionTracking: true,
    debug: __DEV__,
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
