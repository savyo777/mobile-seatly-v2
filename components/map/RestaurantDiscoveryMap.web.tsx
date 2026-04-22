import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { formatDistanceMeters } from '@/lib/map/geo';
import type { RestaurantDiscoveryMapProps } from '@/components/map/restaurantMapTypes';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  shell: {
    flex: 1,
    minHeight: 360,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: c.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  bannerIcon: {
    fontSize: 18,
    color: c.gold,
    fontWeight: '600',
  },
  bannerText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    flex: 1,
    fontWeight: '600',
  },
  scroll: {
    maxHeight: 340,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.sm,
    backgroundColor: c.bgBase,
    borderWidth: 1,
    borderColor: c.border,
  },
  rowSelected: {
    borderColor: c.gold,
    ...shadows.goldGlow,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
  },
  rowMeta: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  rowStar: {
    fontSize: 14,
    lineHeight: 16,
    color: c.gold,
    fontWeight: '700',
  },
  rowStatText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  dot: {
    color: c.textMuted,
  },
}));

/**
 * Web: react-native-maps is not available — show a dense, distance-sorted list
 * with the same discovery intent as the native map.
 */
export function RestaurantDiscoveryMap({
  filteredRestaurants,
  selectedId,
  onSelectRestaurant,
  onMapPress: _onMapPress,
  userLocation: _userLocation,
  showUserLocation: _showUserLocation,
  locationReady: _locationReady,
}: RestaurantDiscoveryMapProps) {
  const c = useColors();
  const styles = useStyles();

  return (
    <View style={styles.shell}>
      <View style={styles.banner}>
        <Text style={styles.bannerIcon} accessible={false}>
          ◎
        </Text>
        <Text style={styles.bannerText}>
          Live map is available on iOS and Android. Browse nearby picks below.
        </Text>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredRestaurants.map((r) => {
          const selected = selectedId === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => onSelectRestaurant(r.id)}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <Image source={{ uri: r.coverPhotoUrl }} style={styles.thumb} />
              <View style={styles.rowBody}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {r.name}
                </Text>
                <Text style={styles.rowMeta} numberOfLines={1}>
                  {r.cuisineType} · {r.area}
                </Text>
                <View style={styles.rowStats}>
                  <Text style={styles.rowStar} accessible={false}>
                    ★
                  </Text>
                  <Text style={styles.rowStatText}>{r.avgRating.toFixed(1)}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.rowStatText}>{formatDistanceMeters(r.distanceMeters)}</Text>
                </View>
              </View>
              <ChevronGlyph color={c.textMuted} size={20} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
