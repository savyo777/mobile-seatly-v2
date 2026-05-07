import React from 'react';
import { Stack } from 'expo-router';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useColors } from '@/lib/theme';

export default function PromotionsLayout() {
  const c = useColors();
  return (
    <Stack screenOptions={createStackTransitionOptions(c.bgBase)}>
      <Stack.Screen name="index" />
      <Stack.Screen
        name="new"
        options={{
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack>
  );
}
