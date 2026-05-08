import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  getStoredRestaurantPaymentCards,
  type RestaurantPaymentCard,
} from '@/lib/storage/restaurantPaymentMethod';

const PLAN = {
  name: 'Cenaiva Pro',
  priceMonthly: Number(process.env.EXPO_PUBLIC_OWNER_MONTHLY_SUB_DOLLARS) || 0,
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** "April 1, 2026" — the next time we'd charge the card after today.
 *  Cenaiva charges on the 1st of each month. */
function nextBillDateLabel(now: Date = new Date()): string {
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return `${MONTH_NAMES[next.getMonth()]} 1, ${next.getFullYear()}`;
}

function midCycleCancelNote(now: Date = new Date()): string | null {
  if (now.getDate() <= 1) return null;
  return 'If you cancel before the month ends, you keep access for this month. You will not be billed next month.';
}

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  /* Plan card */
  planCard: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  planTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  activeText: {
    ...typography.label,
    color: '#22C55E',
    letterSpacing: 0.6,
  },
  planName: {
    ...typography.h2,
    color: c.textPrimary,
    fontWeight: '700',
    letterSpacing: 0,
  },
  planPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  planPrice: {
    ...typography.h1,
    color: c.textPrimary,
    fontSize: 32,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: 0,
  },
  planUnit: {
    ...typography.body,
    color: c.textMuted,
    fontWeight: '600',
  },
  planMeta: {
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
  bullet: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 48,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  bulletIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  bulletText: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
    lineHeight: 20,
  },

  /* Manage row */
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  manageIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  manageText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  manageMeta: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
    marginTop: 1,
  },

  /* Cancel info note */
  cancelInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: spacing.sm,
  },
  cancelInfoText: {
    ...typography.bodySmall,
    color: c.textMuted,
    flex: 1,
    lineHeight: 17,
  },

  /* Cancel button */
  cancelBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#EF4444',
    backgroundColor: c.bgSurface,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  cancelBtnText: {
    ...typography.body,
    color: '#EF4444',
    fontWeight: '700',
  },

  /* Cancelled card */
  cancelledCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.25)',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  cancelledLabel: {
    ...typography.label,
    color: '#EF4444',
    letterSpacing: 1.2,
  },
  cancelledTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  cancelledText: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },
  resumeBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    backgroundColor: c.textPrimary,
  },
  resumeBtnText: {
    ...typography.bodySmall,
    color: c.bgBase,
    fontWeight: '700',
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));

export default function SubscriptionPlanScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const [active, setActive] = useState(true);
  const [defaultCard, setDefaultCard] = useState<RestaurantPaymentCard | null>(null);

  const NEXT_BILL_DATE = nextBillDateLabel();
  const midCycleNote = midCycleCancelNote();

  const loadPaymentMethod = useCallback(() => {
    void (async () => {
      const cards = await getStoredRestaurantPaymentCards();
      setDefaultCard(cards.find((card) => card.isDefault) ?? cards[0] ?? null);
    })();
  }, []);

  useFocusEffect(loadPaymentMethod);

  const onCancel = () => {
    const messageParts = [
      `You'll keep full access to ${PLAN.name} through the end of this billing period.`,
    ];
    if (midCycleNote) messageParts.push(midCycleNote);

    Alert.alert(
      'Cancel subscription?',
      messageParts.join('\n\n'),
      [
        { text: 'Keep my plan', style: 'cancel' },
        {
          text: 'Cancel subscription',
          style: 'destructive',
          onPress: () => {
            setActive(false);
            Alert.alert(
              'Subscription cancelled',
              `You can resume anytime before ${NEXT_BILL_DATE} to keep your account active.`,
            );
          },
        },
      ],
    );
  };

  const onResume = () => {
    setActive(true);
    Alert.alert('Subscription resumed', 'Your plan will keep renewing as before.');
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Subscription plan"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Subscription</Text>
        <Text style={styles.introText}>Review your plan, billing card, invoices, and renewal status.</Text>
      </View>

      {!active ? (
        <View style={styles.cancelledCard}>
          <Text style={styles.cancelledLabel}>CANCELLED</Text>
          <Text style={styles.cancelledTitle}>Access ends on {NEXT_BILL_DATE}</Text>
          <Text style={styles.cancelledText}>
            You'll keep full access to {PLAN.name} until then. Resume anytime to stay live on Cenaiva.
          </Text>
          <Pressable
            onPress={onResume}
            style={({ pressed }) => [styles.resumeBtn, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.resumeBtnText}>Resume subscription</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.planCard}>
        <View style={styles.planTopRow}>
          <Text style={styles.planLabel}>CURRENT PLAN</Text>
          {active ? (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeText}>ACTIVE</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.planName}>{PLAN.name}</Text>
        <View style={styles.planPriceRow}>
          <Text style={styles.planPrice}>${PLAN.priceMonthly}</Text>
          <Text style={styles.planUnit}>/ month</Text>
        </View>
        <Text style={styles.planMeta}>
          {active
            ? `Renews automatically on ${NEXT_BILL_DATE}`
            : `Access ends on ${NEXT_BILL_DATE}`}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>BILLING</Text>
      <View style={styles.card}>
        <Pressable
          onPress={() => router.push('/(staff)/payment-method?source=subscription-plan' as never)}
          style={({ pressed }) => [styles.manageRow, pressed && { backgroundColor: c.bgElevated }]}
          accessibilityRole="button"
          accessibilityLabel="Payment method"
        >
          <View style={styles.manageIcon}>
            <Ionicons name="card-outline" size={16} color={c.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.manageText}>Payment method</Text>
            <Text style={styles.manageMeta}>
              {defaultCard
                ? `${defaultCard.brand} ending in ${defaultCard.last4} · Exp ${defaultCard.expiry}`
                : 'Add or update the card used for billing.'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
        <Pressable
          onPress={() => router.push('/(staff)/billing-history' as never)}
          style={({ pressed }) => [
            styles.manageRow,
            styles.rowDivider,
            pressed && { backgroundColor: c.bgElevated },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Billing history"
        >
          <View style={styles.manageIcon}>
            <Ionicons name="receipt-outline" size={16} color={c.textSecondary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.manageText}>Billing history</Text>
            <Text style={styles.manageMeta}>Review past invoices that were already emailed.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
        </Pressable>
      </View>

      {active && midCycleNote ? (
        <View style={styles.cancelInfoRow}>
          <Ionicons name="information-circle-outline" size={16} color={c.textMuted} />
          <Text style={styles.cancelInfoText}>{midCycleNote}</Text>
        </View>
      ) : null}

      {active ? (
        <Pressable
          onPress={onCancel}
          style={({ pressed }) => [styles.cancelBtn, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
        >
          <Ionicons name="close-circle-outline" size={18} color="#EF4444" />
          <Text style={styles.cancelBtnText}>Cancel subscription</Text>
        </Pressable>
      ) : null}

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.textMuted} />
        <Text style={styles.noteText}>
          Cancelling stops the next renewal. You keep access through this billing month, and you
          can resume anytime before the next charge.
        </Text>
      </View>
    </OwnerScreen>
  );
}
