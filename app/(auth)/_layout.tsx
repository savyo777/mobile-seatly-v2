import React from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useAuthSession } from '@/lib/auth/AuthContext';

export default function AuthLayout() {
  const c = useColors();
  const pathname = usePathname();
  const { loading, isAuthenticated, isStaffLike, role } = useAuthSession();
  const isResetPasswordRoute = pathname === '/(auth)/reset-password';
  const isPhoneOtpRoute = pathname.includes('verify-phone-otp');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgBase, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }
  // Prevent role-mismatch flashes (e.g. owner briefly landing in customer stack)
  // while role is still resolving right after authentication.
  if (isAuthenticated && role === null && !isResetPasswordRoute && !isPhoneOtpRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgBase, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }
  if (isAuthenticated && !isResetPasswordRoute && !isPhoneOtpRoute) {
    return <Redirect href={isStaffLike ? '/(staff)' : '/(customer)'} />;
  }

  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    />
  );
}
