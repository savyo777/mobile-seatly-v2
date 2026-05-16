import React from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { ShellErrorBoundary } from '@/components/ui/ShellErrorBoundary';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { ReservationHoldProvider } from '@/lib/booking/ReservationHoldProvider';
import { HoldTimerBanner } from '@/components/booking/HoldTimerBanner';
import { HoldExpiredDialog } from '@/components/booking/HoldExpiredDialog';

export default function BookingStepsLayout() {
  const c = useColors();
  return (
    <ShellErrorBoundary fallbackHref="/(customer)/discover">
      <ReservationHoldProvider>
        <View style={{ flex: 1, backgroundColor: c.bgBase }}>
          <HoldTimerBanner />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={createStackTransitionOptions(c.bgBase)} />
          </View>
          <HoldExpiredDialog />
        </View>
      </ReservationHoldProvider>
    </ShellErrorBoundary>
  );
}
