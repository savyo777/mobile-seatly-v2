import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Restaurant } from '@/lib/mock/restaurants';
import { getUrgencyCopy, shortTagLine } from '@/lib/mock/discoverPresentation';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Props = {
  title: string;
  data: Restaurant[];
  onPressRow: (r: Restaurant) => void;
};

const useStyles = createStyles((c) => ({
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.md,
  },
  list: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowPressed: {
    backgroundColor: c.bgElevated,
    transform: [{ scale: 0.995 }],
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: c.textPrimary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 2,
  },
  starGlyph: {
    fontSize: 12,
    lineHeight: 14,
    color: c.gold,
    fontWeight: '700',
  },
  rating: {
    ...typography.bodySmall,
    fontWeight: '700',
    color: c.textPrimary,
  },
  reviews: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  dot: {
    color: c.textMuted,
  },
  dist: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '600',
  },
  cuisine: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: 2,
  },
  tag: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    marginTop: 2,
  },
  urgency: {
    ...typography.bodySmall,
    fontSize: 11,
    color: c.textMuted,
    marginTop: 4,
  },
}));

export function DiscoverCompactList({ title, data, onPressRow }: Props) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  if (!data.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.list}>
        {data.map((item, index) => {
          const urgency = getUrgencyCopy(item, t);
          const isLast = index === data.length - 1;
          return (
            <Pressable
              key={item.id}
              onPress={() => onPressRow(item)}
              style={({ pressed }) => [
                styles.row,
                !isLast && styles.rowBorder,
                pressed && styles.rowPressed,
              ]}
            >
              <Image source={{ uri: item.coverPhotoUrl }} style={styles.thumb} />
              <View style={styles.rowBody}>
                <Text style={styles.name} numberOfLines={1}>
                  {item.name}
                </Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.starGlyph} accessible={false}>
                    ★
                  </Text>
                  <Text style={styles.rating}>{item.avgRating.toFixed(1)}</Text>
                  <Text style={styles.reviews}>
                    {t('discover.reviewsCount', { count: item.totalReviews })}
                  </Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.dist}>{t('discover.kmAway', { distance: item.distanceKm.toFixed(1) })}</Text>
                </View>
                <Text style={styles.cuisine} numberOfLines={1}>
                  {item.cuisineType}
                </Text>
                <Text style={styles.tag} numberOfLines={1}>
                  {shortTagLine(item)}
                </Text>
                <Text style={styles.urgency} numberOfLines={1}>
                  {urgency.line}
                </Text>
              </View>
              <ChevronGlyph color={c.textMuted} size={18} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
