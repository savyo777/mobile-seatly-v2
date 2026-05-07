import React from 'react';
import { Stack } from 'expo-router';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useColors } from '@/lib/theme';

export default function ProfileStackLayout() {
  const c = useColors();
  return <Stack screenOptions={createStackTransitionOptions(c.bgBase)} />;
}
