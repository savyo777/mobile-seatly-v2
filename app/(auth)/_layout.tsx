import React, { useEffect, useRef } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { ShellErrorBoundary } from '@/components/ui/ShellErrorBoundary';
import { useColors } from '@/lib/theme';
import { createStackTransitionOptions } from '@/lib/navigation/transitions';
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  getAppShellPreference,
  getCachedAppShellPreference,
} from '@/lib/navigation/appShellPreference';

export default function AuthLayout() {
  const c = useColors();
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isAuthenticated, isStaffLike, role } = useAuthSession();
  const isResetPasswordRoute = pathname === '/(auth)/reset-password';
  const isPhoneOtpRoute = pathname.includes('verify-phone-otp');
  const redirectingRef = useRef(false);

  useEffect(() => {
    if (loading || !isAuthenticated || isResetPasswordRoute || isPhoneOtpRoute || role === null) {
      redirectingRef.current = false;
      return;
    }
    if (redirectingRef.current) return;
    redirectingRef.current = true;

    let cancelled = false;
    const navigate = (href: string) => {
      if (!cancelled) router.replace(href as never);
    };

    const cachedPref = getCachedAppShellPreference();
    if (cachedPref) {
      if (cachedPref === 'staff' && isStaffLike) {
        navigate('/(staff)');
      } else {
        navigate('/(customer)');
      }
      return;
    }

    void getAppShellPreference().then((pref) => {
      if (pref === 'staff' && isStaffLike) {
        navigate('/(staff)');
      } else {
        navigate('/(customer)');
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loading, isAuthenticated, isStaffLike, role, isResetPasswordRoute, isPhoneOtpRoute, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgBase, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }

  if (isAuthenticated && !isResetPasswordRoute && !isPhoneOtpRoute) {
    return (
      <View style={{ flex: 1, backgroundColor: c.bgBase, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }

  return (
    <ShellErrorBoundary fallbackHref="/(auth)/welcome">
      <Stack
        screenOptions={createStackTransitionOptions(c.bgBase)}
      />
    </ShellErrorBoundary>
  );
}
