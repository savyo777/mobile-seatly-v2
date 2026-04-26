import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import '@/lib/i18n';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { ThemeProvider, useColors } from '@/lib/theme';
import { MenuProvider } from '@/lib/context/MenuContext';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

function ThemedRootShell() {
  const c = useColors();
  return (
    <>
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
