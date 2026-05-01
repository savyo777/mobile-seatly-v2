import React, { useEffect, useState } from 'react';
import { Redirect, Stack, usePathname } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import type { Href } from 'expo-router';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getAppShellPreference } from '@/lib/navigation/appShellPreference';

export default function AuthLayout() {
  const c = useColors();
  const pathname = usePathname();
  const { loading, isAuthenticated, isStaffLike, role } = useAuthSession();
  const [authRedirectHref, setAuthRedirectHref] = useState<Href | null>(null);
  const isResetPasswordRoute = pathname === '/(auth)/reset-password';
  const isPhoneOtpRoute = pathname.includes('verify-phone-otp');

  useEffect(() => {
    if (loading || !isAuthenticated || isResetPasswordRoute || isPhoneOtpRoute || role === null) {
      setAuthRedirectHref(null);
      return;
    }
    let cancelled = false;
    void getAppShellPreference().then((pref) => {
      if (cancelled) return;
      if (pref === 'customer') {
        setAuthRedirectHref('/(customer)');
        return;
      }
      if (pref === 'staff' && isStaffLike) {
        setAuthRedirectHref('/(staff)');
        return;
      }
      setAuthRedirectHref(isStaffLike ? '/(staff)' : '/(customer)');
    });
    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, isStaffLike, role, isResetPasswordRoute, isPhoneOtpRoute]);

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
    if (!authRedirectHref) {
      return (
        <View style={{ flex: 1, backgroundColor: c.bgBase, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.gold} />
        </View>
      );
    }
    return <Redirect href={authRedirectHref} />;
  }

  return (
    <Stack
      screenOptions={createStackTransitionOptions(c.bgBase)}
    />
  );
}
