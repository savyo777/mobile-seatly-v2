import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Card, Badge } from '@/components/ui';
import { colors, spacing, borderRadius, typography, shadows } from '@/lib/theme';
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { formatCurrency } from '@/lib/utils/formatCurrency';

const TONIGHT_PREFIX = '2026-03-25';
const KPI = {
  covers: 42,
  revenue: 4280,
  openOrders: 8,
  noShowRisks: 2,
};

const WEEK_BAR_HEIGHTS = [0.35, 0.55, 0.72, 0.48, 0.88, 0.65, 1];

function reservationStatusKey(status: Reservation['status']): string {
  const map: Record<Reservation['status'], string> = {
    pending: 'staff.statusPending',
    confirmed: 'staff.statusConfirmed',
    seated: 'staff.statusSeated',
    completed: 'staff.statusCompleted',
    cancelled: 'staff.statusCancelled',
    no_show: 'staff.statusNoShow',
  };
  return map[status];
}

function badgeVariantForStatus(status: Reservation['status']): 'gold' | 'warning' | 'info' | 'muted' | 'danger' {
  switch (status) {
    case 'confirmed':
      return 'gold';
    case 'pending':
      return 'warning';
    case 'seated':
      return 'info';
    case 'completed':
      return 'muted';
    case 'cancelled':
    case 'no_show':
      return 'danger';
    default:
      return 'muted';
  }
}

function formatTime(iso: string, locale: string): string {
  try {
    return new Date(iso).toLocaleTimeString(locale === 'fr' ? 'fr-CA' : 'en-CA', {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function StaffDashboardScreen() {
  const { t, i18n } = useTranslation();

  const tonight = useMemo(() => {
    return mockReservations
      .filter((r) => r.restaurantId === 'r1' && r.reservedAt.startsWith(TONIGHT_PREFIX))
      .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime());
  }, []);

  const maxBar = Math.max(...WEEK_BAR_HEIGHTS, 0.0001);

  return (
    <ScreenWrapper scrollable={false} padded>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Text style={styles.logo}>{t('common.appName')}</Text>
          <Text style={styles.heroTitle}>{t('staff.dashboard')}</Text>
        </View>

        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <Ionicons name="people" size={26} color={colors.gold} style={styles.kpiIcon} />
            <Text style={styles.kpiValue}>{KPI.covers}</Text>
            <Text style={styles.kpiLabel}>{t('staff.tonightCovers')}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Ionicons name="trending-up" size={26} color={colors.success} style={styles.kpiIcon} />
            <Text style={styles.kpiValue}>{formatCurrency(KPI.revenue)}</Text>
            <Text style={styles.kpiLabel}>{t('staff.todayRevenue')}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Ionicons name="receipt" size={26} color={colors.warning} style={styles.kpiIcon} />
            <Text style={styles.kpiValue}>{KPI.openOrders}</Text>
            <Text style={styles.kpiLabel}>{t('staff.openOrders')}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Ionicons name="alert-circle" size={26} color={colors.danger} style={styles.kpiIcon} />
            <Text style={styles.kpiValue}>{KPI.noShowRisks}</Text>
            <Text style={styles.kpiLabel}>{t('staff.noShowRisks')}</Text>
          </Card>
        </View>

        <Text style={styles.sectionTitle}>{t('staff.tonightReservations')}</Text>
        {tonight.map((r) => (
          <Card key={r.id} style={styles.resCard}>
            <View style={styles.resRow}>
              <Text style={styles.resTime}>{formatTime(r.reservedAt, i18n.language)}</Text>
              <Badge label={t(reservationStatusKey(r.status))} variant={badgeVariantForStatus(r.status)} />
            </View>
            <Text style={styles.resName}>{r.guestName}</Text>
            <Text style={styles.resParty}>{t('staff.partyOf', { count: r.partySize })}</Text>
          </Card>
        ))}

        <Text style={[styles.sectionTitle, styles.chartTitle]}>{t('staff.thisWeek')}</Text>
        <Card style={styles.chartCard}>
          <View style={styles.bars}>
            {WEEK_BAR_HEIGHTS.map((h, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View style={[styles.barFill, { height: Math.max(4, 118 * (h / maxBar)) }]} />
                </View>
                <Text style={styles.barDay}>{(t('staff.weekDaysShort', { returnObjects: true }) as string[])[i]}</Text>
              </View>
            ))}
          </View>
        </Card>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingBottom: spacing['4xl'],
  },
  hero: {
    marginBottom: spacing['2xl'],
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 4,
  },
  heroTitle: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing['2xl'],
  },
  kpiCard: {
    width: '47%',
    minWidth: '45%',
    alignItems: 'flex-start',
    ...shadows.card,
  },
  kpiIcon: {
    marginBottom: spacing.sm,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  kpiLabel: {
    ...typography.bodySmall,
    color: colors.textSecondary,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  chartTitle: {
    marginTop: spacing.lg,
  },
  resCard: {
    marginBottom: spacing.md,
  },
  resRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  resTime: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: colors.gold,
  },
  resName: {
    ...typography.bodyLarge,
    color: colors.textPrimary,
  },
  resParty: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  chartCard: {
    marginBottom: spacing['2xl'],
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.sm,
    minHeight: 140,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
  },
  barTrack: {
    width: '100%',
    height: 120,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgElevated,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    width: '100%',
    backgroundColor: colors.gold,
    borderBottomLeftRadius: borderRadius.sm,
    borderBottomRightRadius: borderRadius.sm,
    minHeight: 4,
  },
  barDay: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
