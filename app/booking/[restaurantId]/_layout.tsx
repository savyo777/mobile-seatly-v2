import React from 'react';
import { Stack } from 'expo-router';
import { ShellErrorBoundary } from '@/components/ui/ShellErrorBoundary';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

export default function BookingStepsLayout() {
  const c = useColors();
  return (
    <ShellErrorBoundary fallbackHref="/(customer)/discover">
      <Stack
        screenOptions={createStackTransitionOptions(c.bgBase)}
      />
    </ShellErrorBoundary>
  );
}
