import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Card, Badge, ScreenWrapper } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockMenuItems } from '@/lib/mock/menuItems';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

function priceRangeLabel(range: number): string {
  return '$'.repeat(range) as string;
}

export default function RestaurantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const restaurant = useMemo(() => mockRestaurants.find((r) => r.id === id), [id]);

  const featuredItems = useMemo(
    () => mockMenuItems.filter((m) => m.restaurantId === id && m.isFeatured),
    [id],
  );

  const todayKey = WEEKDAY_KEYS[new Date().getDay()];
  const todayHours = restaurant?.hoursJson[todayKey];

  if (!restaurant) {
    return (
      <ScreenWrapper>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>{t('discover.notFound')}</Text>
          <Button title={t('common.back')} onPress={() => router.back()} variant="outlined" />
        </View>
      </ScreenWrapper>
    );
  }

  const currency = restaurant.currency.toLowerCase();

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.hero} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + spacing.sm }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={28} color={colors.textPrimary} />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>{restaurant.name}</Text>
          <View style={styles.badgesRow}>
            <Badge label={restaurant.cuisineType} variant="gold" />
            <View style={styles.ratingBlock}>
              <Ionicons name="star" size={16} color={colors.gold} />
              <Text style={styles.ratingText}>
                {restaurant.avgRating.toFixed(1)} · {t('discover.reviewsCount', { count: restaurant.totalReviews })}
              </Text>
            </View>
            <Text style={styles.price}>{priceRangeLabel(restaurant.priceRange)}</Text>
          </View>

          <View style={styles.addressRow}>
            <Ionicons name="location-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.address}>
              {restaurant.address}, {restaurant.city}, {restaurant.province}
            </Text>
          </View>

          <Text style={styles.sectionHeading}>{t('restaurant.about')}</Text>
          <Text style={styles.bodyText}>{restaurant.description}</Text>

          <Text style={styles.sectionHeading}>{t('restaurant.hours')}</Text>
          <Text style={styles.bodyText}>
            {t('restaurant.todaysHours')}:{' '}
            {todayHours ? `${todayHours.open} – ${todayHours.close}` : t('restaurant.closed')}
          </Text>

          <Text style={styles.sectionHeading}>{t('restaurant.featuredMenu')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.featuredRow}>
            {featuredItems.map((item) => (
              <Card key={item.id} style={styles.menuCard} padded={false}>
                <Image source={{ uri: item.photoUrl }} style={styles.menuPhoto} />
                <View style={styles.menuCardBody}>
                  <Text style={styles.menuName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.menuPrice}>{formatCurrency(item.price, currency)}</Text>
                </View>
              </Card>
            ))}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          title={t('restaurant.bookTable')}
          onPress={() => router.push(`/booking/${restaurant.id}/step1-date`)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  scrollContent: {
    flexGrow: 1,
  },
  heroWrap: {
    position: 'relative',
  },
  hero: {
    width: '100%',
    height: 250,
    backgroundColor: colors.bgElevated,
  },
  backBtn: {
    position: 'absolute',
    left: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  h1: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ratingBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gold,
    marginLeft: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginBottom: spacing['2xl'],
  },
  address: {
    flex: 1,
    ...typography.body,
    color: colors.textSecondary,
  },
  sectionHeading: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  bodyText: {
    ...typography.bodyLarge,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  featuredRow: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  menuCard: {
    width: 160,
    overflow: 'hidden',
    ...shadows.card,
  },
  menuPhoto: {
    width: '100%',
    height: 100,
    backgroundColor: colors.bgElevated,
  },
  menuCardBody: {
    padding: spacing.md,
  },
  menuName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuPrice: {
    ...typography.body,
    color: colors.gold,
    fontWeight: '600',
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.bgBase,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
