import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function ProfileStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="snaps/detail/[snapId]" options={{ animation: 'slide_from_bottom' }} />
    </Stack>
  );
}
