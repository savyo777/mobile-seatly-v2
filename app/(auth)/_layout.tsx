import React from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useAuthSession } from '@/lib/auth/AuthContext';

export default function AuthLayout() {
  const c = useColors();
  const pathname = usePathname();
  const { loading, isAuthenticated, isStaffLike } = useAuthSession();
  const isResetPasswordRoute = pathname === '/(auth)/reset-password';

  if (loading) return null;
  if (isAuthenticated && !isResetPasswordRoute) {
    return <Redirect href={isStaffLike ? '/(staff)' : '/(customer)'} />;
  }

  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    />
  );
}
