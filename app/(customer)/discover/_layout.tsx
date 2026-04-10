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
      <Stack.Screen name="post-review/index" />
      <Stack.Screen name="post-review/camera" />
      <Stack.Screen name="post-review/preview" />
      <Stack.Screen name="post-review/connect" />
      <Stack.Screen name="post-review/reward" />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="category/[category]" />
    </Stack>
  );
}
