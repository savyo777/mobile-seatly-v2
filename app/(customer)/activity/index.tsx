import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const GUEST_ID = 'g1';

type ActivityType = 'booking' | 'order';
type SegmentKey = 'upcoming' | 'past';

interface ActivityItem {
  id: string;
  type: ActivityType;
  restaurantName: string;
  restaurantId?: string;
  whenIso: string;
  status: string;
  statusColor: string;
  partySize?: number;
  occasion?: string;
  referenceId: string;
  isCompleted?: boolean;
}

function statusDotColor(status: Reservation['status']): string {
  switch (status) {
    case 'confirmed': return colors.gold;
    case 'completed': return colors.success;
    case 'cancelled': return colors.danger;
    case 'pending':   return colors.warning;
    case 'seated':    return '#60A5FA';
    default:          return colors.textMuted;
  }
}

function isUpcomingReservation(r: Reservation): boolean {
  if (['completed', 'cancelled', 'no_show'].includes(r.status)) return false;
  return new Date(r.reservedAt).getTime() >= Date.now();
}

function formatWhenHero(iso: string): { line1: string; line2: string } {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);

  const timeStr = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
  const isToday = d.toDateString() === now.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) return { line1: 'Tonight', line2: timeStr };
  if (isTomorrow) return { line1: 'Tomorrow', line2: timeStr };

  const dayStr = d.toLocaleDateString('en-CA', { weekday: 'long', month: 'short', day: 'numeric' });
  return { line1: dayStr, line2: timeStr };
}

const OCCASION_ICONS: Record<string, string> = {
  'Date Night': '🕯️',
  'Birthday': '🎂',
  'Anniversary': '💍',
  'Celebration': '🥂',
  'Business': '💼',
};

export default function ActivityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [segment, setSegment] = useState<SegmentKey>('upcoming');

  const items = useMemo<ActivityItem[]>(() => {
    return mockReservations
      .filter((r) => r.guestId === GUEST_ID)
      .map((r) => ({
        id: r.id,
        type: 'booking' as const,
        restaurantName: r.restaurantName,
        restaurantId: r.restaurantId,
        whenIso: r.reservedAt,
        status: r.status.charAt(0).toUpperCase() + r.status.slice(1),
        statusColor: statusDotColor(r.status),
        partySize: r.partySize,
        occasion: r.occasion,
        referenceId: r.confirmationCode,
        isCompleted: r.status === 'completed',
      }));
  }, []);

  const segmentItems = useMemo(() => {
    const filtered = items.filter((item) => {
      const res = mockReservations.find((r) => r.id === item.id);
      if (!res) return false;
      return segment === 'upcoming' ? isUpcomingReservation(res) : !isUpcomingReservation(res);
    });

    return filtered.sort((a, b) => {
      const ta = new Date(a.whenIso).getTime();
      const tb = new Date(b.whenIso).getTime();
      return segment === 'upcoming' ? ta - tb : tb - ta;
    });
  }, [items, segment]);

  const openReceipt = (item: ActivityItem) => {
    router.push(`/(customer)/activity/receipt/${item.type}/${item.id}` as Href);
  };

  const renderItem = ({ item }: { item: ActivityItem }) => {
    const { line1, line2 } = formatWhenHero(item.whenIso);
    const isPast = segment === 'past';

    return (
      <Pressable
        onPress={() => openReceipt(item)}
        style={({ pressed }) => [styles.card, isPast && styles.cardPast, pressed && styles.cardPressed]}
      >
        {/* Top row: restaurant name + status */}
        <View style={styles.cardTop}>
          <Text style={[styles.restaurantName, isPast && styles.textDim]} numberOfLines={1}>
            {item.restaurantName}
          </Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: item.statusColor }]} />
            <Text style={[styles.statusLabel, { color: item.statusColor }]}>{item.status}</Text>
          </View>
        </View>

        {/* Hero: date + time */}
        <View style={styles.heroRow}>
          <Ionicons name="calendar-outline" size={15} color={isPast ? colors.textMuted : colors.gold} style={{ marginTop: 1 }} />
          <Text style={[styles.heroDate, isPast && styles.textDim]}>{line1}</Text>
          <Text style={[styles.heroDot, isPast && styles.textDim]}>·</Text>
          <Text style={[styles.heroTime, isPast && styles.textDim]}>{line2}</Text>
        </View>

        {/* Sub row: party + occasion */}
        <View style={styles.subRow}>
          <Ionicons name="people-outline" size={13} color={colors.textMuted} />
          <Text style={styles.subText}>
            {item.partySize} {item.partySize === 1 ? 'guest' : 'guests'}
            {item.occasion ? `  ${OCCASION_ICONS[item.occasion] ?? ''}  ${item.occasion}` : ''}
          </Text>
        </View>

        {/* Reference code */}
        <Text style={styles.refCode}>{item.referenceId}</Text>

        {/* Divider */}
        <View style={styles.divider} />

        {/* Action row */}
        <View style={styles.actionRow}>
          {isPast && item.isCompleted && item.restaurantId ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/booking/${item.restaurantId}/step2-time` as Href);
              }}
              style={({ pressed }) => [styles.bookAgainBtn, pressed && { opacity: 0.75 }]}
            >
              <Text style={styles.bookAgainLabel}>Book Again</Text>
            </Pressable>
          ) : (
            <View />
          )}
          <Pressable
            onPress={() => openReceipt(item)}
            style={({ pressed }) => [styles.receiptLink, pressed && { opacity: 0.6 }]}
            hitSlop={8}
          >
            <Text style={styles.receiptLinkText}>View receipt</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
          </Pressable>
        </View>
      </Pressable>
    );
  };

  const listHeader = (
    <View style={styles.listHeaderWrap}>
      <Text style={styles.title}>My Bookings</Text>
      <View style={styles.segment}>
        <Pressable
          onPress={() => setSegment('upcoming')}
          style={[styles.segmentBtn, segment === 'upcoming' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, segment === 'upcoming' && styles.segmentLabelActive]}>
            Upcoming
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSegment('past')}
          style={[styles.segmentBtn, segment === 'past' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, segment === 'past' && styles.segmentLabelActive]}>
            Past
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <ScreenWrapper scrollable={false} padded>
      <FlatList
        style={styles.flatList}
        data={segmentItems}
        keyExtractor={(it) => `${it.type}-${it.id}`}
        renderItem={renderItem}
        ListHeaderComponent={listHeader}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons
              name={segment === 'upcoming' ? 'calendar-outline' : 'receipt-outline'}
              size={48}
              color={colors.textMuted}
              style={{ marginBottom: spacing.sm }}
            />
            <Text style={styles.emptyTitle}>
              {segment === 'upcoming' ? 'No upcoming reservations' : 'No past bookings yet'}
            </Text>
            {segment === 'upcoming' ? (
              <>
                <Text style={styles.emptyText}>Find a restaurant and make your first reservation.</Text>
                <Pressable
                  onPress={() => router.push('/(customer)/discover' as Href)}
                  style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.emptyCtaText}>Discover restaurants →</Text>
                </Pressable>
              </>
            ) : (
              <Text style={styles.emptyText}>Your completed and past bookings will appear here.</Text>
            )}
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  flatList: { flex: 1 },

  listHeaderWrap: {
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.5,
    marginBottom: spacing.lg,
  },

  // Segment toggle
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.bgElevated,
  },
  segmentLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.textPrimary,
  },

  // Card
  card: {
    marginBottom: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    overflow: 'hidden',
  },
  cardPast: {
    opacity: 0.75,
  },
  cardPressed: {
    opacity: 0.88,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  restaurantName: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  textDim: {
    color: colors.textSecondary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },

  // Hero date/time
  heroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  heroDate: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.gold,
    letterSpacing: -0.2,
  },
  heroDot: {
    fontSize: 18,
    color: colors.textMuted,
    fontWeight: '300',
  },
  heroTime: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gold,
  },

  // Sub row
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  subText: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },

  // Ref code
  refCode: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '500',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginBottom: spacing.sm,
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.xs,
  },
  bookAgainBtn: {
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.gold,
    borderRadius: 20,
  },
  bookAgainLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.bgBase,
  },
  receiptLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  receiptLinkText: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '500',
  },

  // List
  list: {
    flexGrow: 1,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    paddingHorizontal: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: 24,
  },
  emptyCtaText: {
    ...typography.body,
    fontWeight: '700',
    color: colors.bgBase,
  },
});
