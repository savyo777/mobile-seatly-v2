import React, { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card, Badge, ScreenWrapper } from '@/components/ui';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const GUEST_ID = 'g1';

type TabKey = 'upcoming' | 'past';

function reservationBadgeVariant(
  status: Reservation['status'],
): 'gold' | 'success' | 'warning' | 'danger' | 'info' | 'muted' {
  switch (status) {
    case 'confirmed':
      return 'gold';
    case 'completed':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'pending':
      return 'warning';
    case 'seated':
      return 'info';
    case 'no_show':
      return 'muted';
    default:
      return 'muted';
  }
}

function isUpcomingReservation(r: Reservation): boolean {
  const endStatuses: Reservation['status'][] = ['completed', 'cancelled', 'no_show'];
  if (endStatuses.includes(r.status)) return false;
  const when = new Date(r.reservedAt);
  return when.getTime() >= Date.now();
}

function isPastReservation(r: Reservation): boolean {
  return !isUpcomingReservation(r);
}

function formatBookingWhen(iso: string, locale: string): string {
  const d = new Date(iso);
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export default function BookingsScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<TabKey>('upcoming');

  const mine = useMemo(() => mockReservations.filter((r) => r.guestId === GUEST_ID), []);

  const rows = useMemo(() => {
    const filtered = mine.filter((r) => (tab === 'upcoming' ? isUpcomingReservation(r) : isPastReservation(r)));
    return filtered.sort((a, b) => {
      const ta = new Date(a.reservedAt).getTime();
      const tb = new Date(b.reservedAt).getTime();
      return tab === 'upcoming' ? ta - tb : tb - ta;
    });
  }, [mine, tab]);

  const renderItem = useCallback(
    ({ item }: { item: Reservation }) => (
      <Card onPress={() => router.push(`/bookings/${item.id}`)} style={styles.card}>
        <Text style={styles.restaurantName}>{item.restaurantName}</Text>
        <Text style={styles.when}>{formatBookingWhen(item.reservedAt, i18n.language)}</Text>
        <View style={styles.row}>
          <View style={styles.partyRow}>
            <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.partyText}>{t('bookings.partyOf', { count: item.partySize })}</Text>
          </View>
          <Badge
            label={t(`status.reservation.${item.status}`)}
            variant={reservationBadgeVariant(item.status)}
          />
        </View>
        <Text style={styles.code}>{item.confirmationCode}</Text>
      </Card>
    ),
    [i18n.language, router, t],
  );

  const emptyCopy = tab === 'upcoming' ? t('bookings.noUpcoming') : t('bookings.noPast');

  return (
    <ScreenWrapper scrollable={false}>
      <Text style={[styles.title, { paddingTop: spacing.sm }]}>{t('bookings.title')}</Text>

      <View style={styles.segment}>
        <Pressable
          onPress={() => setTab('upcoming')}
          style={[styles.segmentBtn, tab === 'upcoming' && styles.segmentBtnActive]}
        >
          <Text style={[styles.segmentLabel, tab === 'upcoming' && styles.segmentLabelActive]}>
            {t('bookings.upcoming')}
          </Text>
        </Pressable>
        <Pressable onPress={() => setTab('past')} style={[styles.segmentBtn, tab === 'past' && styles.segmentBtnActive]}>
          <Text style={[styles.segmentLabel, tab === 'past' && styles.segmentLabelActive]}>{t('bookings.past')}</Text>
        </Pressable>
      </View>

      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{emptyCopy}</Text>
          </View>
        }
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 4,
    marginBottom: spacing.lg,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.18)',
  },
  segmentLabel: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textMuted,
  },
  segmentLabelActive: {
    color: colors.gold,
  },
  list: {
    flexGrow: 1,
  },
  card: {
    marginBottom: spacing.md,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  when: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  partyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  partyText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  code: {
    fontFamily: 'Menlo',
    fontSize: 13,
    color: colors.textMuted,
    letterSpacing: 1,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing['5xl'],
    gap: spacing.md,
  },
  emptyText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
