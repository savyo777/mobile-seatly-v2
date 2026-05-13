import React, { useEffect } from 'react';
import { View, Text, Image, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, createStyles } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  getAppShellPreference,
  getCachedAppShellPreference,
} from '@/lib/navigation/appShellPreference';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';

const useStyles = createStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 400,
    height: 146,
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
        router.replace('/(customer)/discover');
        return;
      }
      if (pref === 'staff') {
        if (isStaffLike) {
          router.replace('/(staff)');
          return;
        }
        // pref='staff' but JWT metadata hasn't been refreshed yet (e.g. role
        // was updated server-side after the last token issue). Verify via DB
        // before falling through — this prevents owners being bounced to the
        // customer side on a cold boot after in-app restaurant registration.
        try {
          const restaurant = await fetchCurrentOwnerRestaurant();
          if (cancelled) return;
          if (restaurant?.id) {
            router.replace('/(staff)');
            return;
          }
        } catch {
          // fall through to customer on network error
        }
      }
      router.replace('/(customer)/discover');
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
