import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type YearInvoice = {
  id: string;
  month: string; // "January"
  paidOn: string; // ISO date
  total: number;
};

/** Mock invoices per year. In production this comes from the backend. */
const INVOICES_BY_YEAR: Record<number, YearInvoice[]> = {
  2026: [
    { id: '2026-02', month: 'February', paidOn: '2026-03-01', total: 558.0 },
    { id: '2026-01', month: 'January', paidOn: '2026-02-01', total: 612.5 },
  ],
  2025: [
    { id: '2025-12', month: 'December', paidOn: '2026-01-01', total: 487.25 },
    { id: '2025-11', month: 'November', paidOn: '2025-12-01', total: 521.0 },
    { id: '2025-10', month: 'October', paidOn: '2025-11-01', total: 538.5 },
    { id: '2025-09', month: 'September', paidOn: '2025-10-01', total: 545.0 },
    { id: '2025-08', month: 'August', paidOn: '2025-09-01', total: 612.0 },
    { id: '2025-07', month: 'July', paidOn: '2025-08-01', total: 598.25 },
    { id: '2025-06', month: 'June', paidOn: '2025-07-01', total: 506.75 },
    { id: '2025-05', month: 'May', paidOn: '2025-06-01', total: 478.0 },
    { id: '2025-04', month: 'April', paidOn: '2025-05-01', total: 461.5 },
    { id: '2025-03', month: 'March', paidOn: '2025-04-01', total: 488.0 },
    { id: '2025-02', month: 'February', paidOn: '2025-03-01', total: 472.5 },
    { id: '2025-01', month: 'January', paidOn: '2025-02-01', total: 376.0 },
  ],
  2024: [
    { id: '2024-12', month: 'December', paidOn: '2025-01-01', total: 478.0 },
    { id: '2024-11', month: 'November', paidOn: '2024-12-01', total: 491.5 },
    { id: '2024-10', month: 'October', paidOn: '2024-11-01', total: 502.0 },
    { id: '2024-09', month: 'September', paidOn: '2024-10-01', total: 469.25 },
    { id: '2024-08', month: 'August', paidOn: '2024-09-01', total: 502.0 },
    { id: '2024-07', month: 'July', paidOn: '2024-08-01', total: 482.5 },
    { id: '2024-06', month: 'June', paidOn: '2024-07-01', total: 451.0 },
    { id: '2024-05', month: 'May', paidOn: '2024-06-01', total: 471.5 },
    { id: '2024-04', month: 'April', paidOn: '2024-05-01', total: 432.25 },
  ],
};

function formatMoney(dollars: number): string {
  return dollars.toLocaleString('en-CA', {
    style: 'currency',
    currency: 'CAD',
  });
}

function formatPaidOn(iso: string): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
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

  totalCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  totalLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.4,
  },
  totalAmount: {
    ...typography.h1,
    color: c.textPrimary,
    fontSize: 36,
    fontWeight: '800',
    letterSpacing: -1,
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

  invRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  rowPressed: { backgroundColor: c.bgElevated },
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

  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
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

export default function BillingYearScreen() {
  const c = useColors();
  const styles = useStyles();
  const { year: yearParam } = useLocalSearchParams<{ year?: string }>();

  const year = useMemo(() => {
    const n = Number(yearParam);
    return Number.isFinite(n) && n > 0 ? n : new Date().getFullYear();
  }, [yearParam]);

  const invoices = INVOICES_BY_YEAR[year] ?? [];
  const total = useMemo(
    () => invoices.reduce((s, inv) => s + inv.total, 0),
    [invoices],
  );

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={`${year} invoices`}
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>{year}</Text>
        <Text style={styles.introText}>
          Every invoice you paid Cenaiva in {year}.
        </Text>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>{`PAID IN ${year}`}</Text>
        <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
        <Text style={styles.totalSub}>
          {invoices.length} invoice{invoices.length === 1 ? '' : 's'} · all paid
        </Text>
      </View>

      <Text style={styles.sectionLabel}>INVOICES</Text>
      {invoices.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Ionicons name="receipt-outline" size={28} color={c.textMuted} />
          <Text style={styles.emptyText}>No invoices on file for {year}.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {invoices.map((inv, i) => (
            <View
              key={inv.id}
              style={[
                styles.invRow,
                i > 0 && styles.rowDivider,
              ]}
            >
              <View style={styles.invIcon}>
                <Ionicons name="checkmark" size={16} color="#22C55E" />
              </View>
              <View style={styles.invText}>
                <Text style={styles.invTitle}>
                  {inv.month} {year}
                </Text>
                <Text style={styles.invMeta}>Paid {formatPaidOn(inv.paidOn)}</Text>
              </View>
              <Text style={styles.invAmount}>{formatMoney(inv.total)}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          Stripe emails the receipt for each invoice automatically.
        </Text>
      </View>
    </OwnerScreen>
  );
}
