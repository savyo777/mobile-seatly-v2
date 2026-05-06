import React from 'react';
import { Stack } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';

export default function ProfileStackLayout() {
  const c = useColors();
  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="cenaiva-voice" />
      <Stack.Screen name="edit" />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="security" />
      <Stack.Screen name="security/change-password" />
      <Stack.Screen name="security/change-email" />
      <Stack.Screen name="security/sessions" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="language" />
      <Stack.Screen name="legal/terms" />
      <Stack.Screen name="legal/privacy-policy" />
      <Stack.Screen name="legal/licenses" />
      <Stack.Screen name="notifications" />
      <Stack.Screen name="payment" />
      <Stack.Screen name="wallet" />
      <Stack.Screen name="promotions" />
      <Stack.Screen name="loyalty" />
      <Stack.Screen name="favorites" />
      <Stack.Screen name="invite" />
      <Stack.Screen name="help" />
      <Stack.Screen name="about" />
      <Stack.Screen name="register-restaurant" />
      <Stack.Screen name="register-restaurant-form" />
      <Stack.Screen name="register-restaurant-payment-method" />
      <Stack.Screen name="register-restaurant-payment" />
      <Stack.Screen name="register-restaurant-success" />
    </Stack>
  );
}
