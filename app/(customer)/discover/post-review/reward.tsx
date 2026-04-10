import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

export default function ReviewRewardScreen() {
  const router = useRouter();
  const { points, restaurantName, targets } = useLocalSearchParams<{
    points: string;
    restaurantName: string;
    targets: string;
  }>();

  const numericPoints = Number(points ?? 25);
  const decodedName = restaurantName ? decodeURIComponent(restaurantName) : 'Restaurant';
  const decodedTargets = targets ? decodeURIComponent(targets) : 'Seatly Post';

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.container}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>+{numericPoints}</Text>
        </View>
        <Text style={styles.title}>You earned {numericPoints} Seatly points</Text>
        <Text style={styles.subtitle}>Your review for {decodedName} has been posted successfully.</Text>
        <Text style={styles.targets}>Sent to: {decodedTargets}</Text>

        <View style={styles.actions}>
          <Button title="Back to Discover" onPress={() => router.push('/(customer)/discover')} />
          <Button
            title="Create another Snap"
            onPress={() => router.push('/(customer)/discover/post-review')}
            variant="outlined"
          />
        </View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  badge: {
    width: 112,
    height: 112,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201, 168, 76, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(201, 168, 76, 0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 36,
    color: colors.goldLight,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  targets: {
    ...typography.bodySmall,
    color: colors.goldLight,
    fontWeight: '700',
    textAlign: 'center',
  },
  actions: {
    width: '100%',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
});
