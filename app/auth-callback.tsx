import React, { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useColors } from '@/lib/theme';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const c = useColors();

  useEffect(() => {
    const id = setTimeout(async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        const queryPart = url.includes('?') ? url.split('?')[1]?.split('#')[0] ?? '' : '';
        const params = new URLSearchParams(queryPart);
        const type = params.get('type');
        if (type === 'recovery') {
          router.replace('/(auth)/reset-password?recovery=1');
          return;
        }
      }
      router.replace('/(customer)');
    }, 150);
    return () => clearTimeout(id);
  }, [router]);

  return (
    <View style={[styles.root, { backgroundColor: c.bgBase }]}>
      <ActivityIndicator color={c.gold} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
