import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import {
  createSnapPost as DEMO_createSnapPost,
  snapRestaurants as DEMO_SNAP_RESTAURANTS,
} from '@/lib/mock/snaps';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

const snapRestaurants: typeof DEMO_SNAP_RESTAURANTS = isDemoModeEnabled() ? DEMO_SNAP_RESTAURANTS : [];
const createSnapPost: typeof DEMO_createSnapPost = (...args) => {
  if (!isDemoModeEnabled()) {
    throw new Error('Posting reviews is unavailable until backend snaps are configured.');
  }
  return DEMO_createSnapPost(...args);
};
import { useCurrentUserId } from '@/lib/auth/currentUserId';

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    gap: spacing.md,
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
  },
  card: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: '#111111',
    overflow: 'hidden',
  },
  cardSelected: {
    borderColor: 'rgba(201, 168, 76, 0.8)',
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
  },
  cardLocked: {
    borderColor: 'rgba(201, 168, 76, 0.95)',
  },
  cardPressed: {
    opacity: 0.82,
  },
  photo: {
    width: '100%',
    height: 95,
    backgroundColor: c.bgElevated,
  },
  cardBody: {
    padding: spacing.sm,
  },
  name: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
}));

export default function SnapRestaurantScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const me = useCurrentUserId();
  const { photoUri, caption, restaurantId } = useLocalSearchParams<{
    photoUri: string;
    caption: string;
    restaurantId?: string;
  }>();

  const decodedUri = photoUri ? decodeURIComponent(photoUri) : '';
  const decodedCaption = caption ? decodeURIComponent(caption) : '';
  const lockedRestaurantId = restaurantId;

  const [selectedRestaurantId, setSelectedRestaurantId] = useState<string>(
    lockedRestaurantId ?? snapRestaurants[0]?.id ?? '',
  );

  const selectedRestaurant = useMemo(
    () => snapRestaurants.find((restaurant) => restaurant.id === selectedRestaurantId),
    [selectedRestaurantId],
  );

  const submit = () => {
    if (!selectedRestaurantId || !decodedUri) return;
    if (!me) {
      Alert.alert('Sign in required', 'Sign in to post a snap.');
      return;
    }
    createSnapPost({
      user_id: me,
      restaurant_id: selectedRestaurantId,
      image: decodedUri,
      caption: decodedCaption,
    });
    router.replace(
      `/(customer)/discover/post-review/reward?points=25&restaurantName=${encodeURIComponent(
        selectedRestaurant?.name ?? 'Restaurant',
      )}`,
    );
  };

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.root}>
        <Text style={styles.title}>Select restaurant</Text>
        <Text style={styles.subtitle}>
          {lockedRestaurantId
            ? 'Linked to the restaurant you are currently viewing.'
            : 'Choose where this snap should appear.'}
        </Text>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {snapRestaurants.map((restaurant) => {
            const selected = selectedRestaurantId === restaurant.id;
            const locked = !!lockedRestaurantId && lockedRestaurantId === restaurant.id;
            return (
              <Pressable
                key={restaurant.id}
                onPress={() => {
                  if (!lockedRestaurantId) setSelectedRestaurantId(restaurant.id);
                }}
                style={({ pressed }) => [
                  styles.card,
                  selected && styles.cardSelected,
                  locked && styles.cardLocked,
                  pressed && !lockedRestaurantId && styles.cardPressed,
                ]}
              >
                <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.photo} />
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{restaurant.name}</Text>
                  <Text style={styles.meta}>
                    {restaurant.area} · {restaurant.cuisineType}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>

        <Button title="Post snap" onPress={submit} disabled={!selectedRestaurantId} />
      </View>
    </ScreenWrapper>
  );
}
