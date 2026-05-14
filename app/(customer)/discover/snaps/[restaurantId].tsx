import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View, useWindowDimensions } from 'react-native';
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

function fromVisitPhoto(row: VisitPhotoRow, _restaurantName: string): DisplaySnap {
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
  const user = getSnapUser(snap.user_id);
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

// Instagram-style 3-column grid — see plan for the math.
const NUM_COLS = 3;
const GRID_PAD = 16;
const COL_GAP = 6;

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
    paddingHorizontal: GRID_PAD,
    paddingBottom: spacing['3xl'],
    gap: COL_GAP,
  },
  col: {
    gap: COL_GAP,
  },
  card: {
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
    backgroundColor: '#101010',
  },
  cardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  photo: {
    width: '100%',
    height: '100%',
    backgroundColor: c.bgElevated,
  },
  cardBody: {
    paddingHorizontal: 6,
    paddingVertical: 5,
    gap: 2,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatar: {
    width: 14,
    height: 14,
    borderRadius: 999,
    backgroundColor: c.bgElevated,
  },
  username: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DDD5C4',
    flex: 1,
  },
  caption: {
    fontSize: 10,
    lineHeight: 12,
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
  const cellSize = Math.floor(
    (windowW - GRID_PAD * 2 - COL_GAP * (NUM_COLS - 1)) / NUM_COLS,
  );
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
            numColumns={NUM_COLS}
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
                  style={[styles.card, { width: cellSize }, pressed && styles.cardPressed]}
                >
                  <View style={{ width: cellSize, height: cellSize }}>
                    {item.storyFilterId ? (
                      <StoryFilterFrame
                        filterId={item.storyFilterId}
                        width={cellSize}
                        height={cellSize}
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
                  </View>
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
                      <Text style={styles.caption} numberOfLines={1}>{item.caption}</Text>
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
