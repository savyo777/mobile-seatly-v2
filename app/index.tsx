import React, { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, createStyles } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  getAppShellPreference,
  getCachedAppShellPreference,
} from '@/lib/navigation/appShellPreference';

const useStyles = createStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 450,
    height: 164,
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
  const { loading, isAuthenticated, isStaffLike, role } = useAuthSession();

  useEffect(() => {
    if (loading || (isAuthenticated && role === null)) return;
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      if (!isAuthenticated) {
        router.replace('/onboarding');
        return;
      }
      const pref = getCachedAppShellPreference() ?? await getAppShellPreference();
      if (cancelled) return;
      if (pref === 'customer') {
        router.replace('/(customer)');
        return;
      }
      if (pref === 'staff' && isStaffLike) {
        router.replace('/(staff)');
        return;
      }
      router.replace('/(customer)');
    })();
    return () => {
      cancelled = true;
    };
  }, [router, loading, isAuthenticated, isStaffLike, role]);

  return (
    <View style={styles.container}>
      <Image
        source={require('../assets/cenaiva-logo.png')}
        style={styles.logo}
        resizeMode="contain"
        accessibilityLabel="Cenaiva"
      />
      <Text style={styles.tagline}>Your table awaits</Text>
      <ActivityIndicator color={c.gold} size="small" style={styles.loader} />
    </View>
  );
}
