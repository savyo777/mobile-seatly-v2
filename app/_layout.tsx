import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import { StripeProvider } from '@stripe/stripe-react-native';
import '@/lib/i18n';
import { AuthProvider, useAuthSession } from '@/lib/auth/AuthContext';
import { ThemeProvider, useColors } from '@/lib/theme';
import { MenuProvider } from '@/lib/context/MenuContext';
import { ExpensesProvider } from '@/lib/context/ExpensesContext';
import { OwnerRestaurantProvider } from '@/lib/owner/OwnerRestaurantContext';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { CenaivaAssistantProvider } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { CenaivaVoicePreferenceProvider } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import { clearPersistedSupabaseSession, getSupabase } from '@/lib/supabase/client';
import { isUnusablePersistedSupabaseAuthError } from '@/lib/supabase/authErrors';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { KeyboardDoneBar } from '@/components/ui/KeyboardDoneBar';
import { PostTurnPromptHost } from '@/components/postVisit/PostTurnPromptHost';
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
      try {
        const clearIfUnusableAuthError = async (error: unknown) => {
          if (isUnusablePersistedSupabaseAuthError(error)) {
            await clearPersistedSupabaseSession();
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
        if (isUnusablePersistedSupabaseAuthError(error)) await clearPersistedSupabaseSession();
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

function ThemedRootShell() {
  const c = useColors();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { loading, isAuthenticated, isStaffLike, role } = useAuthSession();
  const handleGoHome = React.useCallback(() => {
    router.replace('/' as never);
  }, [router]);

  // Fires AFTER React commits isAuthenticated = true (useEffect guarantee), so any
  // destination layout's auth guard sees the updated value and won't bounce.
  // Kept synchronous to avoid cancellation races with async preference lookup.
  useEffect(() => {
    if (loading || role === null || !isAuthenticated) return;
    if (segments[0] !== '(auth)') return;
    const seg1 = segments[1] as string | undefined;
    if (seg1 === 'reset-password' || seg1 === 'verify-phone-otp') return;
    if (isStaffLike) {
      router.replace('/(staff)' as never);
    } else {
      router.replace('/(customer)/discover' as never);
    }
  }, [loading, isAuthenticated, role, isStaffLike, segments, router]);

  return (
    <>
      <RecoveryLinkHandler />
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

  return (
    <StripeProvider publishableKey={publishableKey} merchantIdentifier="merchant.com.cenaiva">
      {app}
    </StripeProvider>
  );
}
