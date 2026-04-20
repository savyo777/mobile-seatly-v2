import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { SnapGrid } from '@/components/snaps/SnapGrid';
import { getRestaurantForPost } from '@/lib/mock/snaps';
import { listPostsByTag } from '@/lib/mock/social';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

export default function TagFeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { tag } = useLocalSearchParams<{ tag: string }>();

  const decodedTag = decodeURIComponent(tag ?? '');
  const displayTag = decodedTag.startsWith('#') ? decodedTag : `#${decodedTag}`;

  const posts = useMemo(() => listPostsByTag(displayTag), [displayTag]);

  const topRestaurants = useMemo(() => {
    const counts = new Map<string, number>();
    posts.forEach((p) => {
      counts.set(p.restaurant_id, (counts.get(p.restaurant_id) ?? 0) + 1);
    });
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => getRestaurantForPost(id))
      .filter((r): r is NonNullable<ReturnType<typeof getRestaurantForPost>> => !!r);
  }, [posts]);

  const Header = (
    <View style={styles.headerBlock}>
      <View style={styles.tagPill}>
        <Text style={styles.tagPillText}>{displayTag}</Text>
      </View>
      <Text style={styles.count}>
        {t('tags.postCount', { count: posts.length })}
      </Text>
      {topRestaurants.length > 0 ? (
        <View style={styles.restaurantsBlock}>
          <Text style={styles.restaurantsTitle}>{t('tags.topRestaurants')}</Text>
          <View style={styles.restaurantRow}>
            {topRestaurants.map((r) => (
              <Pressable
                key={r.id}
                onPress={() => router.push(`/(customer)/discover/${r.id}` as Href)}
                style={({ pressed }) => [styles.restaurantCard, pressed && { opacity: 0.8 }]}
              >
                {r.coverPhotoUrl ? (
                  <Image source={{ uri: r.coverPhotoUrl }} style={styles.restaurantImg} />
                ) : (
                  <View style={[styles.restaurantImg, { backgroundColor: colors.bgElevated }]} />
                )}
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {r.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{displayTag}</Text>
        <View style={{ width: 24 }} />
      </View>
      <SnapGrid
        posts={posts}
        ListHeaderComponent={Header}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xl }}
        emptyLabel={t('tags.empty')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  topBarTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },

  headerBlock: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  tagPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.14)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.35)',
  },
  tagPillText: {
    ...typography.h3,
    color: colors.gold,
    fontWeight: '700',
  },
  count: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },
  restaurantsBlock: {
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  restaurantsTitle: {
    ...typography.label,
    color: colors.textMuted,
  },
  restaurantRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  restaurantCard: {
    flex: 1,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restaurantImg: {
    width: '100%',
    aspectRatio: 1.4,
  },
  restaurantName: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: colors.textPrimary,
    padding: spacing.sm,
  },
});
