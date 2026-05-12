import React, { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
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

  useEffect(() => {
    if (loading || !isAuthenticated || isResetPasswordRoute || isPhoneOtpRoute || role === null) {
      return;
    }
    let cancelled = false;
    const cachedPref = getCachedAppShellPreference();
    if (cachedPref) {
      if (cachedPref === 'staff' && isStaffLike) {
        router.replace('/(staff)' as never);
      } else {
        router.replace('/(customer)/discover' as never);
      }
      return;
    }
    void getAppShellPreference().then((pref) => {
      if (cancelled) return;
      if (pref === 'staff' && isStaffLike) {
        router.replace('/(staff)' as never);
      } else {
        router.replace('/(customer)/discover' as never);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, isAuthenticated, isStaffLike, role, isResetPasswordRoute, isPhoneOtpRoute]);

  return (
    <ShellErrorBoundary fallbackHref="/(auth)/welcome">
      <Stack screenOptions={createStackTransitionOptions(c.bgBase)} />
    </ShellErrorBoundary>
  );
}
