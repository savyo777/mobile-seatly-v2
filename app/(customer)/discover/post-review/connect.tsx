import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { setSnapPlatformConnected, type SnapPlatform } from '@/lib/storage/snapShareConnections';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

const PLATFORM_COPY: Record<SnapPlatform, { title: string; subtitle: string; cta: string }> = {
  instagram: {
    title: 'Connect Instagram',
    subtitle: 'Link Instagram to quickly share your Seatly Snap in one tap.',
    cta: 'Continue with Instagram',
  },
  facebook: {
    title: 'Connect Facebook',
    subtitle: 'Link Facebook so you can post your review moments instantly.',
    cta: 'Continue with Facebook',
  },
  google: {
    title: 'Connect Google',
    subtitle: 'Login with Google to open the review flow without friction.',
    cta: 'Login with Google',
  },
};

export default function ConnectPlatformScreen() {
  const router = useRouter();
  const { platform } = useLocalSearchParams<{ platform: SnapPlatform }>();
  const [connecting, setConnecting] = useState(false);

  const currentPlatform: SnapPlatform = useMemo(() => {
    if (platform === 'instagram' || platform === 'facebook' || platform === 'google') return platform;
    return 'instagram';
  }, [platform]);

  const copy = PLATFORM_COPY[currentPlatform];

  const connect = async () => {
    setConnecting(true);
    await setSnapPlatformConnected(currentPlatform, true);
    setTimeout(() => {
      setConnecting(false);
      router.back();
    }, 350);
  };

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.root}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Connect your account</Text>
          <Text style={styles.subtitle}>{copy.subtitle}</Text>
          <View style={styles.platformRow}>
            <Text style={styles.platformLabel}>{copy.title}</Text>
          </View>

          <Button title={connecting ? 'Connecting...' : copy.cta} onPress={connect} disabled={connecting} />

          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.cancel, pressed && styles.cancelPressed]}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
  },
  sheet: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.26)',
    backgroundColor: '#111111',
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  platformRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    backgroundColor: colors.bgSurface,
  },
  platformLabel: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  cancel: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  cancelPressed: {
    opacity: 0.7,
  },
  cancelText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
  },
});
