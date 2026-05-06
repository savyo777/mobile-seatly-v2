import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { SnapShareSheet } from '@/components/snaps/SnapShareSheet';
import { createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';
import type { StoryFilterId } from '@/lib/storyFilters/types';

const useStyles = createStyles((c) => ({
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
    color: '#DDD5C4',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    width: '100%',
    gap: spacing.md,
  },
}));

export default function ReviewRewardScreen() {
  const styles = useStyles();
  const router = useRouter();
  const {
    points,
    restaurantName,
    restaurantId,
    photoUri,
    filterId,
    capturedAt: capturedAtParam,
  } = useLocalSearchParams<{
    points: string;
    restaurantName: string;
    restaurantId?: string;
    photoUri?: string;
    filterId?: string;
    capturedAt?: string;
  }>();
  const pulse = useRef(new Animated.Value(0.9)).current;
  const actionFade = useRef(new Animated.Value(0)).current;

  const numericPoints = Number(points ?? 25);
  const decodedName = restaurantName ? decodeURIComponent(restaurantName) : 'Restaurant';
  const decodedPhoto = photoUri ? decodeURIComponent(photoUri) : '';
  const selectedFilterId = useMemo<StoryFilterId | null>(() => {
    if (!filterId) return null;
    return STORY_FILTERS.some((filter) => filter.id === filterId)
      ? (filterId as StoryFilterId)
      : null;
  }, [filterId]);
  const capturedAt = useMemo(() => {
    const value = Number(capturedAtParam);
    return Number.isFinite(value) && value > 0 ? value : Date.now();
  }, [capturedAtParam]);
  const restaurant = useMemo(
    () => mockRestaurants.find((item) => item.id === restaurantId) ?? null,
    [restaurantId],
  );
  const previewRestaurantName = restaurant?.name ?? decodedName;
  const previewRestaurantCity = restaurant?.city ?? 'Toronto';
  const previewRestaurantArea = restaurant?.area ?? previewRestaurantCity;

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
        duration: 280,
        delay: 0,
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
              storyFilterId={selectedFilterId}
              storyFilterCapturedAt={selectedFilterId ? capturedAt : undefined}
              restaurantName={previewRestaurantName}
              city={previewRestaurantCity}
              area={previewRestaurantArea}
              autoSaveToCameraRoll
            />
          ) : null}

          <Button
            title="Home"
            onPress={() => router.replace('/(customer)')}
          />
          <Button
            title="Go to Restaurant"
            onPress={() =>
              restaurantId
                ? router.replace(`/(customer)/discover/${restaurantId}`)
                : router.replace('/(customer)/discover')
            }
            variant="outlined"
          />
        </Animated.View>
      </ScrollView>
    </ScreenWrapper>
  );
}
