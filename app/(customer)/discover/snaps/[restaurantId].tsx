import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { StoryFilterFrame } from '@/components/storyFilters/StoryFilterFrame';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { safeRouterBack } from '@/lib/navigation/transitions';
import {
  getSnapUser as DEMO_getSnapUser,
  listSnapPostsByRestaurant as DEMO_listSnapPostsByRestaurant,
  getSnapRestaurantName as DEMO_getSnapRestaurantName,
  type SnapPost,
} from '@/lib/mock/snaps';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { listVisitPhotosByRestaurant, type VisitPhotoRow } from '@/lib/snaps/visitPhotosApi';
import type { StoryFilterId } from '@/lib/storyFilters/types';
import { STORY_FILTERS } from '@/lib/storyFilters/registry';

const getSnapUser: typeof DEMO_getSnapUser = (id) =>
  isDemoModeEnabled() ? DEMO_getSnapUser(id) : undefined;
const getSnapRestaurantName: typeof DEMO_getSnapRestaurantName = (id) =>
  isDemoModeEnabled() ? DEMO_getSnapRestaurantName(id) : '';

function validFilterId(id: string | null | undefined): StoryFilterId | undefined {
  if (!id) return undefined;
  return STORY_FILTERS.some((f) => f.id === id) ? (id as StoryFilterId) : undefined;
}

// Unified display item covering both demo SnapPost and real VisitPhotoRow.
type DisplaySnap = {
  id: string;
  image: string;
  caption: string;
  user_id: string;
  username: string | null;
  avatarUrl: string | null;
  storyFilterId: StoryFilterId | undefined;
  storyFilterCapturedAt: number | undefined;
};

function fromVisitPhoto(row: VisitPhotoRow, restaurantName: string): DisplaySnap {
  return {
    id: row.id,
    image: row.image_url,
    caption: row.caption ?? '',
    user_id: row.user_id,
    username: row.full_name ?? null,
    avatarUrl: row.avatar_url ?? null,
    storyFilterId: validFilterId(row.story_filter_id),
    storyFilterCapturedAt: row.story_filter_captured_at ?? undefined,
  };
}

function fromSnapPost(snap: SnapPost): DisplaySnap {
  const user = DEMO_getSnapUser(snap.user_id);
  return {
    id: snap.id,
    image: snap.image,
    caption: snap.caption,
    user_id: snap.user_id,
    username: user?.username ?? null,
    avatarUrl: user?.avatarUrl ?? null,
    storyFilterId: snap.storyFilterId,
    storyFilterCapturedAt: snap.storyFilterCapturedAt,
  };
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgSurface,
  },
  headerText: {
    flex: 1,
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  grid: {
    paddingBottom: spacing['3xl'],
    gap: spacing.md,
  },
  col: {
    gap: spacing.md,
  },
  card: {
    flex: 1,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.26)',
    backgroundColor: '#101010',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  photo: {
    width: '100%',
    height: 170,
    backgroundColor: c.bgElevated,
  },
  cardBody: {
    padding: spacing.sm,
    gap: spacing.xs,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  avatar: {
    width: 20,
    height: 20,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  username: {
    ...typography.bodySmall,
    color: '#DDD5C4',
    fontWeight: '700',
    flex: 1,
  },
  caption: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
}));

export default function RestaurantSnapGalleryScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { width: windowW } = useWindowDimensions();
  const { restaurantId } = useLocalSearchParams<{ restaurantId: string }>();
  const [pressingId, setPressingId] = useState<string | null>(null);
  const [realSnaps, setRealSnaps] = useState<DisplaySnap[]>([]);
  const [loading, setLoading] = useState(!isDemoModeEnabled());

  const restaurantName = useMemo(() => getSnapRestaurantName(restaurantId), [restaurantId]);
  const cardPhotoWidth = Math.max(1, Math.floor((windowW - 40 - spacing.md) / 2));
  const restaurantFallback = restaurantId
    ? (`/(customer)/discover/${restaurantId}` as Href)
    : '/(customer)/discover';

  const demoSnaps = useMemo<DisplaySnap[]>(
    () => isDemoModeEnabled() ? DEMO_listSnapPostsByRestaurant(restaurantId).map(fromSnapPost) : [],
    [restaurantId],
  );

  useEffect(() => {
    if (isDemoModeEnabled() || !restaurantId) return;
    let cancelled = false;
    listVisitPhotosByRestaurant(restaurantId)
      .then((rows) => {
        if (!cancelled) setRealSnaps(rows.map((r) => fromVisitPhoto(r, restaurantName)));
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [restaurantId, restaurantName]);

  const snaps = isDemoModeEnabled() ? demoSnaps : realSnaps;

  return (
    <ScreenWrapper scrollable={false}>
      <View style={styles.root}>
        <View style={styles.header}>
          <Pressable
            onPress={() => safeRouterBack(router, restaurantFallback)}
            style={styles.backBtn}
          >
            <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={styles.title}>Guest Snaps</Text>
            <Text style={styles.subtitle}>{restaurantName} · Real moments shared by diners</Text>
          </View>
        </View>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 40 }} color={c.gold} />
        ) : (
          <FlatList
            data={snaps}
            numColumns={2}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.grid}
            columnWrapperStyle={styles.col}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <Text style={[styles.subtitle, { textAlign: 'center', marginTop: 40, paddingHorizontal: 24 }]}>
                No guest snaps yet — be the first to share one.
              </Text>
            }
            renderItem={({ item }) => {
              const pressed = pressingId === item.id;
              return (
                <Pressable
                  onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}?restaurantId=${restaurantId}`)}
                  onPressIn={() => setPressingId(item.id)}
                  onPressOut={() => setPressingId(null)}
                  style={[styles.card, pressed && styles.cardPressed]}
                >
                  {item.storyFilterId ? (
                    <StoryFilterFrame
                      filterId={item.storyFilterId}
                      width={cardPhotoWidth}
                      height={170}
                      capturedAt={item.storyFilterCapturedAt}
                      restaurantName={restaurantName}
                      mediaSlot={
                        <Image
                          source={{ uri: item.image }}
                          style={styles.photo}
                          contentFit="cover"
                          contentPosition="bottom"
                        />
                      }
                    />
                  ) : (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.photo}
                      contentFit="cover"
                      contentPosition="bottom"
                    />
                  )}
                  <View style={styles.cardBody}>
                    <View style={styles.userRow}>
                      {item.avatarUrl
                        ? <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
                        : <View style={styles.avatar} />}
                      <Text style={styles.username} numberOfLines={1}>
                        {item.username ? `@${item.username}` : 'Guest'}
                      </Text>
                    </View>
                    {item.caption ? (
                      <Text style={styles.caption} numberOfLines={3}>{item.caption}</Text>
                    ) : null}
                  </View>
                </Pressable>
              );
            }}
          />
        )}
      </View>
    </ScreenWrapper>
  );
}
