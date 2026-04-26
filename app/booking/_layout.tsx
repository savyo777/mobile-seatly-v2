import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

export default function BookingLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    />
  );
}
