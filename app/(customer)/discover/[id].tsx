import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Pressable, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Button, Card, Badge, ScreenWrapper } from '@/components/ui';
import { mockRestaurants } from '@/lib/mock/restaurants';
import { mockMenuItems } from '@/lib/mock/menuItems';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { useColors, createStyles, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import {
  listSnapPostsByRestaurant,
  getSnapUser,
  type SnapPost,
} from '@/lib/mock/snaps';
import { SnapPreviewCard } from '@/components/discover/SnapPreviewCard';

const WEEKDAY_KEYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function priceRangeLabel(range: number): string {
  return '$'.repeat(range) as string;
}

function isOpenNow(hoursJson: Record<string, { open: string; close: string }>): boolean {
  const now = new Date();
  const key = WEEKDAY_KEYS[now.getDay()];
  const hours = hoursJson[key];
  if (!hours) return false;
  const [openH, openM] = hours.open.split(':').map(Number);
  const [closeH, closeM] = hours.close.split(':').map(Number);
  const current = now.getHours() * 60 + now.getMinutes();
  return current >= openH * 60 + openM && current < closeH * 60 + closeM;
}

function formatHour(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return m === 0 ? `${hour} ${period}` : `${hour}:${String(m).padStart(2, '0')} ${period}`;
}

function openMaps(address: string, city: string) {
  const query = encodeURIComponent(`${address}, ${city}`);
  Linking.openURL(`https://maps.apple.com/?q=${query}`).catch(() =>
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`)
  );
}

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
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
    backgroundColor: c.bgElevated,
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
  snapBtn: {
    position: 'absolute',
    right: spacing.lg,
    width: 44,
    height: 44,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backChevron: {
    fontSize: 28,
    lineHeight: 30,
    color: c.textPrimary,
    fontWeight: '400',
  },
  starGlyph: {
    fontSize: 15,
    lineHeight: 18,
    color: c.gold,
    fontWeight: '700',
  },
  body: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  h1: {
    ...typography.h1,
    color: c.textPrimary,
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
    color: c.textSecondary,
  },
  price: {
    fontSize: 16,
    fontWeight: '600',
    color: c.gold,
    marginLeft: spacing.sm,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  addressBody: { flex: 1, gap: 2 },
  address: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '500',
  },
  addressDirections: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },

  // Section wrapper
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeading: {
    ...typography.h3,
    color: c.textPrimary,
    marginBottom: spacing.sm,
  },
  bodyText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  expandLink: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: spacing.sm,
  },

  // Vibe chips
  vibeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  vibeChip: {
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    backgroundColor: c.bgSurface,
  },
  vibeChipText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    fontWeight: '500',
  },

  // Hours
  hoursHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  openBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  openDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  openLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  todayHours: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.xs,
  },
  hoursGrid: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: c.border,
    overflow: 'hidden',
  },
  hoursRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  hoursRowToday: {
    backgroundColor: 'rgba(201,168,76,0.08)',
  },
  hoursDay: {
    ...typography.body,
    color: c.textMuted,
    fontWeight: '500',
    width: 40,
  },
  hoursDayToday: {
    color: c.gold,
    fontWeight: '700',
  },
  hoursTime: {
    ...typography.body,
    color: c.textSecondary,
  },
  hoursTimeToday: {
    color: c.textPrimary,
    fontWeight: '600',
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
    backgroundColor: c.bgElevated,
  },
  menuCardBody: {
    padding: spacing.md,
  },
  menuName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuPrice: {
    ...typography.body,
    color: c.gold,
    fontWeight: '600',
  },
  snapsHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  snapsHeaderText: {
    flex: 1,
  },
  snapsTitle: {
    ...typography.h3,
    color: c.textPrimary,
  },
  snapsSub: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  seeMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.45)',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  seeMorePressed: {
    opacity: 0.84,
  },
  seeMoreText: {
    ...typography.bodySmall,
    color: '#DDD5C4',
    fontWeight: '700',
  },
  snapsRow: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xs,
  },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: c.bgBase,
    borderTopWidth: 1,
    borderTopColor: c.border,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
  },
  errorTitle: {
    ...typography.h3,
    color: c.textSecondary,
    textAlign: 'center',
  },
}));

export default function RestaurantDetailScreen() {
  const [restaurantSnaps, setRestaurantSnaps] = useState<SnapPost[]>([]);
  const [aboutExpanded, setAboutExpanded] = useState(false);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const restaurant = useMemo(() => mockRestaurants.find((r) => r.id === id), [id]);

  const featuredItems = useMemo(
    () => mockMenuItems.filter((m) => m.restaurantId === id && m.isFeatured),
    [id],
  );

  const todayKey = WEEKDAY_KEYS[new Date().getDay()];
  const todayHours = restaurant?.hoursJson[todayKey];

  useFocusEffect(
    React.useCallback(() => {
      if (!id) return;
      setRestaurantSnaps(listSnapPostsByRestaurant(id));
    }, [id]),
  );

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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 160 }]}
      >
        <View style={styles.heroWrap}>
          <Image source={{ uri: restaurant.coverPhotoUrl }} style={styles.hero} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.back()}
            style={[styles.backBtn, { top: insets.top + spacing.sm }]}
            hitSlop={12}
          >
            <Text style={styles.backChevron} accessible={false}>
              ←
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push(`/(customer)/discover/post-review/camera?restaurantId=${restaurant.id}`)}
            style={[styles.snapBtn, { top: insets.top + spacing.sm }]}
            hitSlop={12}
          >
            <Ionicons name="add" size={20} color="#DDD5C4" />
          </Pressable>
        </View>

        <View style={styles.body}>
          <Text style={styles.h1}>{restaurant.name}</Text>
          <View style={styles.badgesRow}>
            <Badge label={restaurant.cuisineType} variant="gold" />
            <View style={styles.ratingBlock}>
              <Text style={styles.starGlyph} accessible={false}>
                ★
              </Text>
              <Text style={styles.ratingText}>
                {restaurant.avgRating.toFixed(1)} · {t('discover.reviewsCount', { count: restaurant.totalReviews })}
              </Text>
            </View>
          </View>

          {/* Address — tappable, opens Maps */}
          <Pressable
            onPress={() => openMaps(restaurant.address, restaurant.city)}
            style={({ pressed }) => [styles.addressRow, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="location-sharp" size={16} color={c.gold} style={{ marginTop: 1 }} />
            <View style={styles.addressBody}>
              <Text style={styles.address}>
                {restaurant.address}, {restaurant.city}, {restaurant.province}
              </Text>
              <Text style={styles.addressDirections}>Get directions →</Text>
            </View>
          </Pressable>

          {/* About — collapsible with vibe chips */}
          <View style={styles.section}>
            <Text
              style={styles.bodyText}
              numberOfLines={aboutExpanded ? undefined : 3}
            >
              {restaurant.description}
            </Text>
            {restaurant.description.length > 100 && (
              <Pressable onPress={() => setAboutExpanded((v) => !v)} hitSlop={8}>
                <Text style={styles.expandLink}>{aboutExpanded ? 'Show less' : 'Read more'}</Text>
              </Pressable>
            )}
            <View style={styles.vibeRow}>
              {restaurant.ambiance ? (
                <View style={styles.vibeChip}>
                  <Text style={styles.vibeChipText}>{restaurant.ambiance}</Text>
                </View>
              ) : null}
              {restaurant.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.vibeChip}>
                  <Text style={styles.vibeChipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Hours — open/closed status + collapsible full week */}
          <View style={styles.section}>
            <View style={styles.hoursHeader}>
              <Text style={styles.sectionHeading}>{t('restaurant.hours')}</Text>
              <View style={styles.openBadge}>
                <View style={[styles.openDot, { backgroundColor: isOpenNow(restaurant.hoursJson) ? c.success : c.danger }]} />
                <Text style={[styles.openLabel, { color: isOpenNow(restaurant.hoursJson) ? c.success : c.danger }]}>
                  {isOpenNow(restaurant.hoursJson) ? 'Open now' : 'Closed'}
                </Text>
              </View>
            </View>
            <Text style={styles.todayHours}>
              Today: {todayHours ? `${formatHour(todayHours.open)} – ${formatHour(todayHours.close)}` : 'Closed'}
            </Text>
            {hoursExpanded && (
              <View style={styles.hoursGrid}>
                {WEEKDAY_KEYS.map((key, i) => {
                  const h = restaurant.hoursJson[key];
                  const isToday = i === new Date().getDay();
                  return (
                    <View key={key} style={[styles.hoursRow, isToday && styles.hoursRowToday]}>
                      <Text style={[styles.hoursDay, isToday && styles.hoursDayToday]}>
                        {WEEKDAY_SHORT[i]}
                      </Text>
                      <Text style={[styles.hoursTime, isToday && styles.hoursTimeToday]}>
                        {h ? `${formatHour(h.open)} – ${formatHour(h.close)}` : 'Closed'}
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
            <Pressable onPress={() => setHoursExpanded((v) => !v)} hitSlop={8} style={styles.expandBtn}>
              <Text style={styles.expandLink}>{hoursExpanded ? 'Hide hours' : 'See all hours'}</Text>
              <Ionicons name={hoursExpanded ? 'chevron-up' : 'chevron-down'} size={13} color={c.gold} />
            </Pressable>
          </View>

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

          <View style={styles.snapsHeader}>
            <View style={styles.snapsHeaderText}>
              <Text style={styles.snapsTitle}>Snaps from Guests</Text>
              <Text style={styles.snapsSub}>See real moments shared by diners</Text>
            </View>
            <Pressable
              onPress={() => router.push(`/(customer)/discover/snaps/${restaurant.id}`)}
              style={({ pressed }) => [styles.seeMoreBtn, pressed && styles.seeMorePressed]}
            >
              <Text style={styles.seeMoreText}>See More</Text>
              <Ionicons name="chevron-forward" size={14} color="#DDD5C4" />
            </Pressable>
          </View>
          {restaurantSnaps.length ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.snapsRow}>
              {restaurantSnaps.slice(0, 6).map((post) => {
                const user = getSnapUser(post.user_id);
                return (
                  <SnapPreviewCard
                    key={post.id}
                    post={post}
                    user={user}
                    onPress={() => router.push(`/(customer)/discover/snaps/detail/${post.id}?restaurantId=${restaurant.id}`)}
                  />
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.bodyText}>No snaps yet. Be the first guest to post.</Text>
          )}
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Button
          title={t('restaurant.bookTable')}
          onPress={() => router.push(`/booking/${restaurant.id}/step2-time`)}
        />
      </View>
    </View>
  );
}
