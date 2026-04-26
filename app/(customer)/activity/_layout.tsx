import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

export default function ActivityStackLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="receipt/[type]/[id]" />
    </Stack>
  );
}
