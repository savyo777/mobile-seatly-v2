import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { OWNER_PROMOTIONS, type OwnerPromotion } from '@/lib/mock/ownerApp';

type Tab = 'active' | 'past';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';

function isActive(p: OwnerPromotion): boolean {
  return p.status === 'live' || p.status === 'scheduled' || p.status === 'paused' || p.status === 'draft';
}

function isPast(p: OwnerPromotion): boolean {
  return p.status === 'expired';
}

function formatPromoType(type: OwnerPromotion['type']): string {
  switch (type) {
    case 'percent_off':
      return 'Percent off';
    case 'fixed_discount':
      return 'Fixed offer';
    case 'free_item':
      return 'Free item';
    case 'happy_hour':
      return 'Happy hour';
    case 'birthday':
      return 'Birthday';
    case 'first_time_guest':
      return 'First visit';
    default:
      return 'Promotion';
  }
}

function formatStatus(status: OwnerPromotion['status']): string {
  switch (status) {
    case 'live':
      return 'Live';
    case 'scheduled':
      return 'Scheduled';
    case 'paused':
      return 'Paused';
    case 'expired':
      return 'Past';
    default:
      return 'Draft';
  }
}

function formatCount(value?: number): string {
  return (value ?? 0).toLocaleString('en-CA');
}

const useStyles = createStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.bgBase },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.gold },
  kicker: { fontSize: 11, fontWeight: '700', color: c.gold, letterSpacing: 1.2 },
  title: { fontSize: 34, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500', color: c.textMuted, lineHeight: 20 },

  segmentWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 4,
    gap: 4,
  },
  segTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segTabActive: { backgroundColor: 'rgba(201,162,74,0.18)' },
  segText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  segTextActive: { color: c.gold },

  card: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  banner: {
    height: 188,
    backgroundColor: c.bgElevated,
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerContent: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(0,0,0,0.44)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  titleBlock: {
    gap: 6,
  },
  cardTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  cardDescription: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.78)',
    lineHeight: 18,
  },
  cardBody: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    maxWidth: '100%',
  },
  metaChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textSecondary,
    flexShrink: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  statCard: {
    width: '48.5%',
    minHeight: 88,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    justifyContent: 'space-between',
  },
  statCardPrimary: {
    backgroundColor: 'rgba(201,162,74,0.12)',
    borderColor: 'rgba(201,162,74,0.32)',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.4,
  },
  statValuePrimary: {
    color: c.gold,
  },
  bestTimeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(201,162,74,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(201,162,74,0.24)',
  },
  bestTimeIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,162,74,0.14)',
  },
  bestTimeText: {
    flex: 1,
    gap: 2,
  },
  bestTimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  bestTimeValue: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  repostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: 11,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  repostButtonText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: 0.2,
  },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: c.textMuted, fontWeight: '500' },
}));

export default function PromosScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('active');

  const activeList = useMemo(() => OWNER_PROMOTIONS.filter(isActive), []);
  const pastList = useMemo(() => OWNER_PROMOTIONS.filter(isPast), []);
  const list = tab === 'active' ? activeList : pastList;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kicker}>PROMOTIONS</Text>
          </View>
          <Text style={styles.title}>Offers & promos</Text>
          <Text style={styles.subtitle}>
            Owner snapshot for every offer: used, clicks, guest mix, and the best-performing time slot.
          </Text>
        </View>

        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segTab, tab === 'active' && styles.segTabActive]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.segText, tab === 'active' && styles.segTextActive]}>
              Active · {activeList.length}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segTab, tab === 'past' && styles.segTabActive]}
            onPress={() => setTab('past')}
          >
            <Text style={[styles.segText, tab === 'past' && styles.segTextActive]}>
              Past · {pastList.length}
            </Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No promotions here yet</Text>
          </View>
        ) : (
          list.map((promo) => {
            const clicks = promo.clicks ?? promo.views ?? promo.analytics.guestsReached;
            const statusTint =
              promo.status === 'live'
                ? { bg: 'rgba(34,197,94,0.18)', border: 'rgba(34,197,94,0.32)', text: '#86EFAC' }
                : promo.status === 'scheduled'
                  ? { bg: 'rgba(59,130,246,0.18)', border: 'rgba(59,130,246,0.32)', text: '#93C5FD' }
                  : promo.status === 'paused'
                    ? { bg: 'rgba(245,158,11,0.18)', border: 'rgba(245,158,11,0.32)', text: '#FCD34D' }
                    : promo.status === 'expired'
                      ? { bg: 'rgba(113,113,122,0.18)', border: 'rgba(113,113,122,0.26)', text: '#E4E4E7' }
                      : { bg: 'rgba(168,133,48,0.18)', border: 'rgba(168,133,48,0.32)', text: '#FDE68A' };

            return (
              <View key={promo.id} style={styles.card}>
                <View style={styles.banner}>
                  <Image
                    source={{ uri: promo.coverImage ?? FALLBACK_IMAGE }}
                    style={styles.bannerImage}
                  />
                  <LinearGradient
                    colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.20)', 'rgba(0,0,0,0.84)']}
                    style={StyleSheet.absoluteFill}
                  />
                  <View style={styles.bannerContent}>
                    <View style={styles.badgeRow}>
                      <View style={styles.typeBadge}>
                        <Text style={styles.typeBadgeText}>{formatPromoType(promo.type)}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusTint.bg, borderColor: statusTint.border },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusTint.text }]}>
                          {formatStatus(promo.status)}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.titleBlock}>
                      <Text style={styles.cardTitle} numberOfLines={2}>
                        {promo.name}
                      </Text>
                      <Text style={styles.cardDescription} numberOfLines={2}>
                        {promo.description}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.metaRow}>
                    <View style={styles.metaChip}>
                      <Ionicons name="calendar-outline" size={14} color={c.gold} />
                      <Text style={styles.metaChipText}>
                        {promo.scheduleLabel ?? `${promo.startTime}-${promo.endTime}`}
                      </Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="people-outline" size={14} color={c.gold} />
                      <Text style={styles.metaChipText}>{promo.audienceLabel ?? promo.targetAudience}</Text>
                    </View>
                    <View style={styles.metaChip}>
                      <Ionicons name="restaurant-outline" size={14} color={c.gold} />
                      <Text style={styles.metaChipText}>{promo.whereApplies}</Text>
                    </View>
                  </View>

                  <View style={styles.statsGrid}>
                    <View style={[styles.statCard, styles.statCardPrimary]}>
                      <Text style={styles.statLabel}>Used</Text>
                      <Text style={[styles.statValue, styles.statValuePrimary]}>
                        {formatCount(promo.analytics.redemptions)}
                      </Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Clicks</Text>
                      <Text style={styles.statValue}>{formatCount(clicks)}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>New guests</Text>
                      <Text style={styles.statValue}>{formatCount(promo.newGuests)}</Text>
                    </View>
                    <View style={styles.statCard}>
                      <Text style={styles.statLabel}>Returning guests</Text>
                      <Text style={styles.statValue}>{formatCount(promo.returningGuests)}</Text>
                    </View>
                  </View>

                  <View style={styles.bestTimeCard}>
                    <View style={styles.bestTimeIcon}>
                      <Ionicons name="time-outline" size={18} color={c.gold} />
                    </View>
                    <View style={styles.bestTimeText}>
                      <Text style={styles.bestTimeLabel}>Best time</Text>
                      <Text style={styles.bestTimeValue}>{promo.bestTimeLabel ?? 'No data yet'}</Text>
                    </View>
                  </View>

                  {promo.status === 'expired' && (
                    <View style={styles.actionRow}>
                      <Pressable
                        onPress={() => router.push('/(staff)/promotions/new')}
                        style={({ pressed }) => [styles.repostButton, pressed && { opacity: 0.9 }]}
                      >
                        <Ionicons name="refresh-outline" size={16} color={c.bgBase} />
                        <Text style={styles.repostButtonText}>Repost</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
