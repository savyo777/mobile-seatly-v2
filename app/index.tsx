import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, createStyles } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getAppShellPreference } from '@/lib/navigation/appShellPreference';

const useStyles = createStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    fontSize: 42,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: 16,
    color: c.textSecondary,
    marginTop: 8,
  },
  loader: {
    position: 'absolute',
    bottom: 80,
  },
}));

export default function SplashScreen() {
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const { loading, isAuthenticated, isStaffLike } = useAuthSession();

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        if (!isAuthenticated) {
          router.replace('/onboarding');
          return;
        }
        const pref = await getAppShellPreference();
        if (cancelled) return;
        if (pref === 'customer') {
          router.replace('/(customer)');
          return;
        }
        if (pref === 'staff' && isStaffLike) {
          router.replace('/(staff)');
          return;
        }
        router.replace(isStaffLike ? '/(staff)' : '/(customer)');
      })();
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [router, loading, isAuthenticated, isStaffLike]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>CENAIVA</Text>
      <Text style={styles.tagline}>Your table awaits</Text>
      <ActivityIndicator color={c.gold} size="small" style={styles.loader} />
    </View>
  );
}
