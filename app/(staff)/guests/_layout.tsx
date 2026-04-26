import React from 'react';
import { Stack } from 'expo-router';
import { createTransparentStackTransitionOptions } from '@/lib/navigation/transitions';

export default function GuestsStackLayout() {
  return (
    <Stack
      screenOptions={createTransparentStackTransitionOptions()}
    />
  );
}
