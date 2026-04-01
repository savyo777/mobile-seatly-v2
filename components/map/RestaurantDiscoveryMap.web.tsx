import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDistanceMeters } from '@/lib/map/geo';
import type { RestaurantDiscoveryMapProps } from '@/components/map/restaurantMapTypes';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

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
  return (
    <View style={styles.shell}>
      <View style={styles.banner}>
        <Ionicons name="map-outline" size={20} color={colors.gold} />
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
                  <Ionicons name="star" size={14} color={colors.gold} />
                  <Text style={styles.rowStatText}>{r.avgRating.toFixed(1)}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.rowStatText}>{formatDistanceMeters(r.distanceMeters)}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    minHeight: 360,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    backgroundColor: colors.bgSurface,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  bannerText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
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
    backgroundColor: colors.bgBase,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowSelected: {
    borderColor: colors.gold,
    ...shadows.goldGlow,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.md,
    backgroundColor: colors.bgElevated,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  rowMeta: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  rowStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  rowStatText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dot: {
    color: colors.textMuted,
  },
});
