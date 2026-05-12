import React from 'react';
import { Stack } from 'expo-router';
import { ShellErrorBoundary } from '@/components/ui/ShellErrorBoundary';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

export default function AuthLayout() {
  const c = useColors();
  return (
    <ShellErrorBoundary fallbackHref="/(auth)/welcome">
      <Stack screenOptions={createStackTransitionOptions(c.bgBase)} />
    </ShellErrorBoundary>
  );
}
