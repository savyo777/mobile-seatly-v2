import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';

export default function ActivityStackLayout() {
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
      <Stack.Screen name="receipt/[type]/[id]" />
    </Stack>
  );
}
