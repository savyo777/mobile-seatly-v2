import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { enableFreeze, enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import Constants from 'expo-constants';
import '@/lib/i18n';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider, useColors } from '@/lib/theme';
import { MenuProvider } from '@/lib/context/MenuContext';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { CenaivaAssistantProvider } from '@/lib/cenaiva/CenaivaAssistantProvider';
import { CenaivaVoicePreferenceProvider } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import { getSupabase } from '@/lib/supabase/client';
import { CookieConsentBanner } from '@/components/cookie-consent/CookieConsentBanner';
import { getStripeEnv } from '@/lib/stripe/env';

enableScreens(true);
enableFreeze(true);

type RecoveryTokens = {
  accessToken: string;
  refreshToken: string;
  type: string;
};

function getRecoveryTokensFromUrl(url: string): RecoveryTokens | null {
  const hashPart = url.includes('#') ? url.split('#')[1] : '';
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const hashParams = new URLSearchParams(hashPart);
  const queryParams = new URLSearchParams(queryPart);
  const type = hashParams.get('type') ?? queryParams.get('type') ?? '';
  const accessToken = hashParams.get('access_token') ?? queryParams.get('access_token') ?? '';
  const refreshToken = hashParams.get('refresh_token') ?? queryParams.get('refresh_token') ?? '';
  if (type !== 'recovery' || !accessToken || !refreshToken) return null;
  return { type, accessToken, refreshToken };
}

function getAuthCodeFromUrl(url: string): string | null {
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const params = new URLSearchParams(queryPart);
  return params.get('code');
}

function getTokenHashFromUrl(url: string): { tokenHash: string; type: string } | null {
  const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
  const params = new URLSearchParams(queryPart);
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  if (tokenHash && type) return { tokenHash, type };
  return null;
}

function RecoveryLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();
    if (!supabase) return;

    const handleUrl = async (url: string) => {
      // Direct token_hash deep link (email template uses cenaiva://reset-password?token_hash=...&type=recovery)
      const tokenHashData = getTokenHashFromUrl(url);
      if (tokenHashData?.type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHashData.tokenHash,
          type: 'recovery',
        });
        if (!error && isMounted) {
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
        if (!error && isMounted) {
          router.replace('/(auth)/reset-password?recovery=1');
        }
        return;
      }

      // PKCE flow: authorization code in query string
      const code = getAuthCodeFromUrl(url);
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error && isMounted) {
          router.replace('/(auth)/reset-password?recovery=1');
        }
      }
    };

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) void handleUrl(initialUrl);
    });

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
  return (
    <>
      <RecoveryLinkHandler />
      <StatusBar style="auto" backgroundColor={c.bgBase} />
      <Stack
        screenOptions={createStackTransitionOptions(c.bgBase)}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(staff)" />
        <Stack.Screen name="booking" />
        <Stack.Screen name="auth-callback" options={{ animation: 'none' }} />
      </Stack>
      <CookieConsentBanner />
    </>
  );
}

export default function RootLayout() {
  const { publishableKey } = getStripeEnv();
  void publishableKey;
  const isExpoGo = Constants.appOwnership === 'expo';
  const providers = (
    <ThemeProvider>
      <AuthProvider>
        <MenuProvider>
          <CenaivaVoicePreferenceProvider>
            <CenaivaAssistantProvider>
              <ThemedRootShell />
            </CenaivaAssistantProvider>
          </CenaivaVoicePreferenceProvider>
        </MenuProvider>
      </AuthProvider>
    </ThemeProvider>
  );

  if (isExpoGo) {
    return (
      <GestureHandlerRootView style={{ flex: 1 }}>
        <SafeAreaProvider>{providers}</SafeAreaProvider>
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>{providers}</SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
