import React, { useEffect, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { SnapShareSheet } from '@/components/snaps/SnapShareSheet';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

export default function ReviewRewardScreen() {
  const router = useRouter();
  const { points, restaurantName, restaurantId, photoUri, rating } = useLocalSearchParams<{
    points: string;
    restaurantName: string;
    restaurantId?: string;
    photoUri?: string;
    rating?: string;
  }>();
  const pulse = useRef(new Animated.Value(0.9)).current;
  const actionFade = useRef(new Animated.Value(0)).current;

  const numericPoints = Number(points ?? 25);
  const numericRating = rating ? (Number(rating) as 1 | 2 | 3 | 4 | 5) : undefined;
  const decodedName = restaurantName ? decodeURIComponent(restaurantName) : 'Restaurant';
  const decodedPhoto = photoUri ? decodeURIComponent(photoUri) : '';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(pulse, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 55,
      }),
      Animated.timing(actionFade, {
        toValue: 1,
        duration: 450,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, [pulse, actionFade]);

  return (
    <ScreenWrapper scrollable={false}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.badgeWrap}>
          <Animated.View style={[styles.badge, { transform: [{ scale: pulse }] }]}>
            <Text style={styles.badgeText}>+{numericPoints}</Text>
          </Animated.View>
          <Text style={styles.title}>+{numericPoints} points earned</Text>
          <Text style={styles.subtitle}>
            Your snap at {decodedName} is now live on the restaurant page.
          </Text>
        </View>

        <Animated.View style={[styles.actions, { opacity: actionFade }]}>
          {decodedPhoto ? (
            <SnapShareSheet
              imageUrl={decodedPhoto}
              restaurantName={decodedName}
              rating={numericRating}
            />
          ) : null}

          <Button
            title="Go to Restaurant"
            onPress={() =>
              restaurantId
                ? router.replace(`/(customer)/discover/${restaurantId}`)
                : router.replace('/(customer)/discover')
            }
          />
          <Button
            title="View My Snaps"
            onPress={() => router.push('/(customer)/profile')}
            variant="outlined"
          />
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing['3xl'],
  },
  badgeWrap: {
    alignItems: 'center',
    gap: spacing.lg,
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
  actions: {
    width: '100%',
    gap: spacing.md,
  },
});
