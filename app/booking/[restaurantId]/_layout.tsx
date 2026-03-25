import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '@/lib/theme';

export default function BookingStepsLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bgBase },
        animation: 'slide_from_right',
      }}
    />
  );
}
