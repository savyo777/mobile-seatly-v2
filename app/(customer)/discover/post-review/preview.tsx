import React, { useCallback, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Button, ScreenWrapper } from '@/components/ui';
import { currentRestaurants, pastRestaurants, snapFilters } from '@/lib/mock/reviewSnap';
import {
  clearPendingSnapPlatformSelection,
  getPendingSnapPlatformSelection,
  getSnapPlatformConnections,
  setPendingSnapPlatformSelection,
  type SnapPlatform,
  type SnapPlatformConnections,
} from '@/lib/storage/snapShareConnections';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

type ShareTarget = 'seatly' | SnapPlatform;

function platformLabel(platform: ShareTarget): string {
  if (platform === 'seatly') return 'Seatly Post';
  if (platform === 'instagram') return 'Instagram';
  if (platform === 'facebook') return 'Facebook';
  return 'Google Review';
}

export default function ReviewPreviewScreen() {
  const router = useRouter();
  const { restaurantId, photoUri, filter } = useLocalSearchParams<{
    restaurantId: string;
    photoUri: string;
    filter: string;
  }>();

  const [caption, setCaption] = useState('');
  const [rating, setRating] = useState(5);
  const [connections, setConnections] = useState<SnapPlatformConnections>({
    instagram: false,
    facebook: false,
    google: false,
  });
  const [selected, setSelected] = useState<Record<ShareTarget, boolean>>({
    seatly: true,
    instagram: false,
    facebook: false,
    google: false,
  });

  const restaurants = useMemo(() => [...currentRestaurants, ...pastRestaurants], []);
  const selectedRestaurant = useMemo(
    () => restaurants.find((restaurant) => restaurant.id === restaurantId),
    [restaurants, restaurantId],
  );
  const activeFilter = useMemo(
    () => snapFilters.find((filterOption) => filterOption.id === filter) ?? snapFilters[0],
    [filter],
  );
  const decodedUri = useMemo(() => (photoUri ? decodeURIComponent(photoUri) : ''), [photoUri]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;
      const syncConnectionState = async () => {
        const savedConnections = await getSnapPlatformConnections();
        const pending = await getPendingSnapPlatformSelection();
        if (!mounted) return;
        setConnections(savedConnections);

        if (pending && savedConnections[pending]) {
          setSelected((prev) => ({ ...prev, [pending]: true }));
        }

        if (pending) {
          await clearPendingSnapPlatformSelection();
        }
      };
      void syncConnectionState();
      return () => {
        mounted = false;
      };
    }, []),
  );

  const toggleTarget = async (target: ShareTarget) => {
    if (target === 'seatly') {
      setSelected((prev) => ({ ...prev, seatly: !prev.seatly }));
      return;
    }

    if (connections[target]) {
      setSelected((prev) => ({ ...prev, [target]: !prev[target] }));
      return;
    }

    await setPendingSnapPlatformSelection(target);
    router.push(`/(customer)/discover/post-review/connect?platform=${target}`);
  };

  const submitReviewFlow = () => {
    const selectedTargets = Object.entries(selected)
      .filter(([, isSelected]) => isSelected)
      .map(([key]) => key as ShareTarget);
    const selectedLabel = selectedTargets.map(platformLabel).join(', ');
    router.push(
      `/(customer)/discover/post-review/reward?points=25&restaurantName=${encodeURIComponent(selectedRestaurant?.name ?? 'Restaurant')}&targets=${encodeURIComponent(selectedLabel)}`,
    );
  };

  const hasSelectedTargets = Object.values(selected).some(Boolean);

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.photoWrap}>
          {decodedUri ? <Image source={{ uri: decodedUri }} style={styles.photo} /> : null}
          <View
            style={[
              styles.filterOverlay,
              { backgroundColor: activeFilter.overlayColor, opacity: activeFilter.overlayOpacity },
            ]}
          />
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>Share your experience</Text>
          <Text style={styles.subtitle}>{selectedRestaurant?.name ?? 'Selected restaurant'}</Text>

          <View style={styles.ratingRow}>
            <Text style={styles.sectionLabel}>Rating</Text>
            <View style={styles.stars}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable key={value} onPress={() => setRating(value)}>
                  <Text style={[styles.star, value <= rating && styles.starFilled]}>★</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Text style={styles.sectionLabel}>Caption</Text>
          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder="What made this spot memorable tonight?"
            placeholderTextColor={colors.textMuted}
            multiline
            style={styles.captionInput}
          />

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Share socially</Text>
            <View style={styles.platformGrid}>
              <Pressable
                onPress={() => toggleTarget('instagram')}
                style={({ pressed }) => [
                  styles.platformCard,
                  selected.instagram && styles.platformCardSelected,
                  pressed && styles.platformCardPressed,
                ]}
              >
                <Text style={styles.platformTitle}>Instagram</Text>
                <Text style={styles.platformHint}>
                  {connections.instagram ? 'Connected' : 'Connect account'}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => toggleTarget('facebook')}
                style={({ pressed }) => [
                  styles.platformCard,
                  selected.facebook && styles.platformCardSelected,
                  pressed && styles.platformCardPressed,
                ]}
              >
                <Text style={styles.platformTitle}>Facebook</Text>
                <Text style={styles.platformHint}>
                  {connections.facebook ? 'Connected' : 'Connect account'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeading}>Reviews</Text>
            <View style={styles.platformGrid}>
              <Pressable
                onPress={() => toggleTarget('seatly')}
                style={({ pressed }) => [
                  styles.platformCard,
                  selected.seatly && styles.platformCardSelected,
                  pressed && styles.platformCardPressed,
                ]}
              >
                <Text style={styles.platformTitle}>Post to Seatly</Text>
                <Text style={styles.platformHint}>Default and fastest</Text>
              </Pressable>
              <Pressable
                onPress={() => toggleTarget('google')}
                style={({ pressed }) => [
                  styles.platformCard,
                  selected.google && styles.platformCardSelected,
                  pressed && styles.platformCardPressed,
                ]}
              >
                <Text style={styles.platformTitle}>Google Review</Text>
                <Text style={styles.platformHint}>{connections.google ? 'Connected' : 'Login with Google'}</Text>
              </Pressable>
            </View>
          </View>

          <Button title="Post and earn points" onPress={submitReviewFlow} disabled={!hasSelectedTargets} />
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: spacing['3xl'],
  },
  photoWrap: {
    height: 340,
    backgroundColor: colors.bgElevated,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.lg,
  },
  title: {
    ...typography.h2,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  ratingRow: {
    gap: spacing.sm,
  },
  sectionLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  star: {
    fontSize: 28,
    color: colors.border,
  },
  starFilled: {
    color: colors.gold,
  },
  captionInput: {
    minHeight: 110,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    padding: spacing.md,
    ...typography.body,
    color: colors.textPrimary,
    textAlignVertical: 'top',
  },
  section: {
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.15)',
    padding: spacing.md,
    backgroundColor: '#121212',
  },
  sectionHeading: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  platformGrid: {
    gap: spacing.sm,
  },
  platformCard: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: 2,
  },
  platformCardSelected: {
    borderColor: 'rgba(201, 168, 76, 0.8)',
    backgroundColor: 'rgba(201, 168, 76, 0.14)',
  },
  platformCardPressed: {
    opacity: 0.82,
  },
  platformTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  platformHint: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
});
