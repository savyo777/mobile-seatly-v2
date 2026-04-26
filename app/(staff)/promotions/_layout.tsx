import React from 'react';
import { Stack } from 'expo-router';
import { createTransparentStackTransitionOptions } from '@/lib/navigation/transitions';

export default function PromotionsLayout() {
  return (
    <Stack
      screenOptions={createTransparentStackTransitionOptions()}
    >
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
