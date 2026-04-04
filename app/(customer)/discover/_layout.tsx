import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function DiscoverStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="category/[category]" />
    </Stack>
  );
}
