import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';

export default function DiscoverStackLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bgBase },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="post-review/index" />
      <Stack.Screen name="post-review/camera" />
      <Stack.Screen name="post-review/preview" />
      <Stack.Screen name="post-review/connect" />
      <Stack.Screen name="post-review/details" />
      <Stack.Screen name="post-review/restaurant" />
      <Stack.Screen name="post-review/reward" />
      <Stack.Screen name="snaps/[restaurantId]" />
      <Stack.Screen name="snaps/detail/[snapId]" options={{ animation: 'fade_from_bottom' }} />
      <Stack.Screen name="[id]" />
      <Stack.Screen name="category/[category]" />
      <Stack.Screen name="tag/[tag]" />
      <Stack.Screen name="explore" />
    </Stack>
  );
}
