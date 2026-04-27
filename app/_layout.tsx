import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import '@/lib/i18n';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider, useColors } from '@/lib/theme';
import { MenuProvider } from '@/lib/context/MenuContext';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { getSupabase } from '@/lib/supabase/client';

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

function RecoveryLinkHandler() {
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;

    const handleUrl = async (url: string) => {
      const tokens = getRecoveryTokensFromUrl(url);
      if (!tokens) return;
      const supabase = getSupabase();
      if (!supabase) return;
      const { error } = await supabase.auth.setSession({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
      });
      if (!error && isMounted) {
        router.replace('/(auth)/reset-password');
      }
    };

    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) void handleUrl(initialUrl);
    });

    const sub = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });

    return () => {
      isMounted = false;
      sub.remove();
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <MenuProvider>
              <ThemedRootShell />
            </MenuProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
