import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';
import { getCurrentOwnerRestaurantId } from '@/lib/services/ownerRestaurant';
import {
  getNextBillPreview,
  listStripePayouts,
  type NextBillPreview,
  type PayoutsSnapshot,
} from '@/lib/owner/billing';

function formatMoneyCents(cents: number, currency = 'cad'): string {
  return new Intl.NumberFormat('en-CA', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((cents || 0) / 100);
}

function formatDateIso(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

const PAYOUT_STATUS_LABEL: Record<string, string> = {
  paid: 'Paid',
  pending: 'In transit',
  in_transit: 'In transit',
  canceled: 'Canceled',
  failed: 'Failed',
};

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },

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

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  rowLeft: { flex: 1, gap: 2 },
  rowTitle: { ...typography.body, color: c.textPrimary, fontWeight: '600' },
  rowMeta: { ...typography.bodySmall, color: c.textMuted, lineHeight: 16 },
  rowAmount: { ...typography.body, color: c.textPrimary, fontWeight: '700' },

  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  pillBox: { flex: 1, gap: 2 },
  pillLabel: { ...typography.label, color: c.textMuted, letterSpacing: 1 },
  pillAmount: { ...typography.body, color: c.textPrimary, fontWeight: '700', fontSize: 18 },

  empty: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  emptyText: { ...typography.bodySmall, color: c.textMuted, lineHeight: 18 },

  badge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: borderRadius.full,
    fontSize: 11,
    fontWeight: '700',
    overflow: 'hidden',
  },
  badgePaid: { backgroundColor: 'rgba(34,197,94,0.12)', color: '#22C55E' },
  badgePending: { backgroundColor: 'rgba(201,168,76,0.15)', color: c.gold },
  badgeFailed: { backgroundColor: 'rgba(239,68,68,0.12)', color: '#EF4444' },

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
  noteText: { ...typography.bodySmall, color: c.textSecondary, lineHeight: 18, flex: 1 },

  refreshBtn: { alignSelf: 'flex-end', paddingHorizontal: 10, paddingVertical: 6 },
  refreshText: { ...typography.bodySmall, color: c.gold, fontWeight: '700' },
}));

function payoutBadgeStyle(status: string, styles: ReturnType<typeof useStyles>) {
  if (status === 'paid') return [styles.badge, styles.badgePaid];
  if (status === 'failed' || status === 'canceled') return [styles.badge, styles.badgeFailed];
  return [styles.badge, styles.badgePending];
}

export default function BillingHistoryScreen() {
  const c = useColors();
  const styles = useStyles();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [bill, setBill] = useState<NextBillPreview | null>(null);
  const [payouts, setPayouts] = useState<PayoutsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void (async () => {
      const id = await getCurrentOwnerRestaurantId();
      if (active) setRestaurantId(id);
    })();
    return () => {
      active = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!restaurantId) return;
    setLoading(true);
    try {
      const [previewRes, payoutsRes] = await Promise.allSettled([
        getNextBillPreview(restaurantId),
        listStripePayouts(restaurantId),
      ]);
      if (previewRes.status === 'fulfilled') setBill(previewRes.value);
      else
        console.warn(
          '[billing-history] preview failed',
          friendlyError(previewRes.reason, 'Could not load next bill.'),
        );
      if (payoutsRes.status === 'fulfilled') setPayouts(payoutsRes.value);
      else
        console.warn(
          '[billing-history] payouts failed',
          friendlyError(payoutsRes.reason, 'Could not load payouts.'),
        );
    } finally {
      setLoading(false);
    }
  }, [restaurantId]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return (
    <OwnerScreen header={<SubpageHeader title="Billing & payouts" accentBack />}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Billing & payouts</Text>
        <Text style={styles.introText}>
          Your next Cenaiva invoice and the latest Stripe payouts to your bank.
        </Text>
      </View>

      <View style={{ marginBottom: spacing.md }}>
        <RestaurantPicker allowAll size="compact" />
      </View>

      {loading && !bill && !payouts ? (
        <View style={[styles.card, { padding: spacing.lg, alignItems: 'center' }]}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : null}

      {bill && bill.hasUpcoming ? (
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>NEXT BILL</Text>
          <Text style={styles.totalAmount}>
            {formatMoneyCents(bill.nextAmountCents, bill.currency)}
          </Text>
          <Text style={styles.totalSub}>
            Charges your card on {formatDateIso(bill.nextDateIso)}.
          </Text>
        </View>
      ) : bill && !bill.hasUpcoming ? (
        <View style={[styles.card, styles.empty]}>
          <Text style={styles.rowTitle}>No upcoming bill</Text>
          <Text style={styles.emptyText}>
            {bill.reason === 'trialing'
              ? 'You’re still on the free trial — no charge yet.'
              : bill.reason === 'no_subscription'
                ? 'No active subscription. Publish your restaurant to start.'
                : bill.reason === 'no_customer'
                  ? 'Add a card on file under Account → Payment method first.'
                  : 'Nothing scheduled this cycle.'}
          </Text>
        </View>
      ) : null}

      {bill && bill.hasUpcoming && bill.lineItems.length > 0 ? (
        <>
          <Text style={styles.sectionLabel}>LINE ITEMS</Text>
          <View style={styles.card}>
            {bill.lineItems.map((line, i) => (
              <View key={`${line.description}-${i}`} style={[styles.row, i > 0 && styles.rowDivider]}>
                <View style={styles.rowLeft}>
                  <Text style={styles.rowTitle} numberOfLines={2}>
                    {line.description}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {line.isSubscription ? 'Monthly subscription' : `Quantity ${line.quantity}`}
                  </Text>
                </View>
                <Text style={styles.rowAmount}>
                  {formatMoneyCents(line.amountCents, bill.currency)}
                </Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={styles.sectionLabel}>PAYOUTS</Text>
      <View style={styles.card}>
        {payouts?.hasAccount === false ? (
          <View style={styles.empty}>
            <Text style={styles.rowTitle}>Connect Stripe first</Text>
            <Text style={styles.emptyText}>
              Finish Stripe onboarding to start receiving payouts to your bank account.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.pillRow}>
              <View style={styles.pillBox}>
                <Text style={styles.pillLabel}>AVAILABLE</Text>
                <Text style={styles.pillAmount}>
                  {formatMoneyCents(payouts?.availableBalanceCents ?? 0)}
                </Text>
              </View>
              <View style={styles.pillBox}>
                <Text style={styles.pillLabel}>PENDING</Text>
                <Text style={styles.pillAmount}>
                  {formatMoneyCents(payouts?.pendingBalanceCents ?? 0)}
                </Text>
              </View>
            </View>
            {payouts && payouts.payouts.length > 0 ? (
              payouts.payouts.map((p, i) => (
                <View key={p.id} style={[styles.row, styles.rowDivider]}>
                  <View style={styles.rowLeft}>
                    <Text style={styles.rowTitle}>
                      Payout · {formatMoneyCents(p.amountCents, p.currency)}
                    </Text>
                    <Text style={styles.rowMeta}>
                      Arrives {formatDateIso(p.arrivalDateIso)}
                    </Text>
                  </View>
                  <Text style={payoutBadgeStyle(p.status, styles) as never}>
                    {PAYOUT_STATUS_LABEL[p.status] ?? p.status}
                  </Text>
                </View>
              ))
            ) : (
              <View style={[styles.empty, styles.rowDivider]}>
                <Text style={styles.emptyText}>
                  No payouts yet — they start once your first booking deposit settles.
                </Text>
              </View>
            )}
          </>
        )}
      </View>

      <Pressable onPress={() => void refresh()} style={styles.refreshBtn}>
        <Text style={styles.refreshText}>{loading ? 'Refreshing…' : 'Refresh'}</Text>
      </Pressable>

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          Stripe emails the full invoice PDFs. Payouts settle to the bank you connected during
          Stripe onboarding.
        </Text>
      </View>
    </OwnerScreen>
  );
}
