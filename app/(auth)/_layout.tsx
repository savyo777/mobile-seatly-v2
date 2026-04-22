import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';

export default function AuthLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: c.bgBase },
        animation: 'slide_from_right',
      }}
    />
  );
}
