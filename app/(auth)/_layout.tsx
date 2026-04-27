import React from 'react';
import { Redirect, Stack } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useAuthSession } from '@/lib/auth/AuthContext';

export default function AuthLayout() {
  const c = useColors();
  const { loading, isAuthenticated, isStaffLike } = useAuthSession();

  if (loading) return null;
  if (isAuthenticated) {
    return <Redirect href={isStaffLike ? '/(staff)' : '/(customer)'} />;
  }

  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    />
  );
}
