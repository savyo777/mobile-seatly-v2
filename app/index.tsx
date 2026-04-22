import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors, createStyles } from '@/lib/theme';

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

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/onboarding');
    }, 1500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>CENAIVA</Text>
      <Text style={styles.tagline}>Your table awaits</Text>
      <ActivityIndicator color={c.gold} size="small" style={styles.loader} />
    </View>
  );
}
