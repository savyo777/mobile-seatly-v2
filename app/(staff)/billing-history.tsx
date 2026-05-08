import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';
import { getSupabase } from '@/lib/supabase/client';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

function envMoney(name: string): number {
  const parsed = Number(process.env[name]);
  return Number.isFinite(parsed) ? parsed : 0;
}

const PRICING = {
  perBookingDollars: envMoney('EXPO_PUBLIC_OWNER_PER_BOOKING_DOLLARS'),
  preOrderFeePct: envMoney('EXPO_PUBLIC_OWNER_PREORDER_FEE_PCT'),
  monthlySubDollars: envMoney('EXPO_PUBLIC_OWNER_MONTHLY_SUB_DOLLARS'),
};

type CycleActivity = {
  bookingCount: number;
  preOrderCount: number;
  preOrderRevenueDollars: number;
};

function cycleStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

function nextCycleStart(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth() + 1, 1);
}

function cycleLabel(now = new Date()) {
  return cycleStart(now).toLocaleDateString('en-CA', { month: 'long', year: 'numeric' });
}

function cycleBilledOn(now = new Date()) {
  return nextCycleStart(now).toLocaleDateString('en-CA', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatMoney(dollars: number): string {
  return dollars.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
  });
}

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  /* Cycle pill */
  cyclePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
    marginBottom: spacing.md,
  },
  cyclePillText: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1,
  },

  /* Total hero */
  totalCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  totalLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.4,
  },
  totalAmount: {
    ...typography.h1,
    color: c.textPrimary,
    fontSize: 38,
    lineHeight: 48,
    fontWeight: '800',
    letterSpacing: -0.6,
    paddingTop: 2,
  },
  totalSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 17,
  },

  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },

  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 78,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  catText: { flex: 1, gap: 3 },
  catTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  catMeta: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  catRight: { alignItems: 'flex-end', gap: 2 },
  catAmount: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '800',
    fontSize: 17,
    letterSpacing: -0.3,
  },
  catRate: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 14,
  },

  /* Total summary row */
  totalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    backgroundColor: c.bgElevated,
  },
  totalRowLabel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '800',
    flex: 1,
  },
  totalRowAmount: {
    ...typography.h2,
    color: c.gold,
    fontWeight: '800',
    letterSpacing: -0.4,
  },

  /* Recent invoices */
  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  invIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(34,197,94,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.30)',
  },
  invText: { flex: 1, gap: 2 },
  invTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  invMeta: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  invAmount: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));

type Category = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  meta: string;
  rate: string;
  amount: number;
};

type YearSummary = {
  year: number;
  invoiceCount: number;
  total: number;
};

const PAST_YEARS: YearSummary[] = [];

export default function BillingHistoryScreen() {
  const c = useColors();
  const styles = useStyles();
  const [activity, setActivity] = useState<CycleActivity>({
    bookingCount: 0,
    preOrderCount: 0,
    preOrderRevenueDollars: 0,
  });
  const cycleName = cycleLabel();
  const billedOn = cycleBilledOn();

  useEffect(() => {
    let active = true;
    void (async () => {
      const restaurant = await fetchCurrentOwnerRestaurant();
      const supabase = getSupabase();
      if (!restaurant?.id || !supabase) return;
      const start = cycleStart().toISOString();
      const end = nextCycleStart().toISOString();

      const [{ count: reservationCount }, { data: orders }] = await Promise.all([
        supabase
          .from('reservations')
          .select('id', { count: 'exact', head: true })
          .eq('restaurant_id', restaurant.id)
          .gte('reserved_at', start)
          .lt('reserved_at', end),
        supabase
          .from('orders')
          .select('total_amount')
          .eq('restaurant_id', restaurant.id)
          .eq('is_preorder', true)
          .gte('created_at', start)
          .lt('created_at', end),
      ]);

      if (!active) return;
      const orderRows = (orders ?? []) as Array<{ total_amount?: number | string | null }>;
      setActivity({
        bookingCount: reservationCount ?? 0,
        preOrderCount: orderRows.length,
        preOrderRevenueDollars: orderRows.reduce((sum, order) => {
          const parsed = typeof order.total_amount === 'number' ? order.total_amount : Number(order.total_amount);
          return sum + (Number.isFinite(parsed) ? parsed : 0);
        }, 0),
      });
    })().catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo<Category[]>(() => {
    const bookingTotal = activity.bookingCount * PRICING.perBookingDollars;
    const preOrderTotal =
      activity.preOrderRevenueDollars * PRICING.preOrderFeePct;
    return [
      {
        id: 'bookings',
        icon: 'calendar-outline',
        title: 'Tables booked through the app',
        meta: `${activity.bookingCount} bookings`,
        rate: `$${PRICING.perBookingDollars} per booking`,
        amount: bookingTotal,
      },
      {
        id: 'preorders',
        icon: 'fast-food-outline',
        title: 'Pre-orders & in-app payments',
        meta: `${activity.preOrderCount} payments · ${formatMoney(
          activity.preOrderRevenueDollars,
        )} collected`,
        rate: `${(PRICING.preOrderFeePct * 100).toFixed(0)}% transaction fee`,
        amount: preOrderTotal,
      },
      {
        id: 'subscription',
        icon: 'star-outline',
        title: 'Monthly subscription',
        meta: 'Cenaiva Pro · ' + cycleName,
        rate: 'Flat rate',
        amount: PRICING.monthlySubDollars,
      },
    ];
  }, [activity, cycleName]);

  const total = useMemo(
    () => categories.reduce((sum, c) => sum + c.amount, 0),
    [categories],
  );

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Billing history"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Billing history</Text>
        <Text style={styles.introText}>Review current charges and open past invoices by year.</Text>
      </View>

      <View style={styles.cyclePill}>
        <Ionicons name="calendar-outline" size={12} color={c.gold} />
        <Text style={styles.cyclePillText}>{cycleName.toUpperCase()}</Text>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>TOTAL THIS CYCLE</Text>
        <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
        <Text style={styles.totalSub}>Charges to your card on {billedOn}.</Text>
      </View>

      <Text style={styles.sectionLabel}>BREAKDOWN</Text>
      <View style={styles.card}>
        {categories.map((cat, i) => (
          <View key={cat.id} style={[styles.catRow, i > 0 && styles.rowDivider]}>
            <View style={styles.catIcon}>
              <Ionicons name={cat.icon} size={18} color={c.gold} />
            </View>
            <View style={styles.catText}>
              <Text style={styles.catTitle}>{cat.title}</Text>
              <Text style={styles.catMeta}>{cat.meta}</Text>
            </View>
            <View style={styles.catRight}>
              <Text style={styles.catAmount}>{formatMoney(cat.amount)}</Text>
              <Text style={styles.catRate}>{cat.rate}</Text>
            </View>
          </View>
        ))}
        <View style={[styles.totalRow, styles.rowDivider]}>
          <Text style={styles.totalRowLabel}>Total</Text>
          <Text style={styles.totalRowAmount}>{formatMoney(total)}</Text>
        </View>
      </View>

      <Text style={styles.sectionLabel}>PAST INVOICES</Text>
      <View style={styles.card}>
        {PAST_YEARS.map((y, i) => (
          <View
            key={y.year}
            style={[
              styles.invRow,
              i > 0 && styles.rowDivider,
            ]}
          >
            <View style={styles.invIcon}>
              <Ionicons name="receipt-outline" size={16} color="#22C55E" />
            </View>
            <View style={styles.invText}>
              <Text style={styles.invTitle}>{y.year}</Text>
              <Text style={styles.invMeta}>
                {y.invoiceCount} invoice{y.invoiceCount === 1 ? '' : 's'} ·{' '}
                {formatMoney(y.total)} paid
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          Invoices are emailed through Stripe, so these rows are informational only.
        </Text>
      </View>
    </OwnerScreen>
  );
}
