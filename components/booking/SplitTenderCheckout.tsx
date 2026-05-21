/**
 * SplitTenderCheckout — diner-side "pass the phone" UX for splitting a
 * restaurant deposit across N cards on the same device.
 *
 * Flow per MOBILE_SPLIT_TENDER_GUIDE.md §6:
 *   1. Diner picks split count (2..10).
 *   2. Tap Place Order:
 *      a. POST create-public-booking with split_tender_payers
 *         → reservation_id + N deposit_row_ids
 *      b. For each slot i:
 *         - POST create-public-payment-intent with deposit_payment_ids:[rowId]
 *         - initPaymentSheet + presentPaymentSheet (this slot's diner taps in their card)
 *         - POST confirm-deposit-paid with 3 retries
 *      c. After every slot settles, onAllPaid fires → parent navigates to step7.
 *   3. Partial failure: paid slots stay paid. Failed slots get a chip
 *      + retry. Re-tap Place Order to re-run only the failed slots.
 *
 * Security per MOBILE_SECURITY_HARDENING.md §2a: each PI must be minted
 * with `deposit_payment_ids: [rowId]` so the server can stamp PI metadata.
 * Without that, confirm-deposit-paid rejects with `pi_payment_id_mismatch`.
 *
 * The reservation lives in `pending_payment` status until the LAST
 * deposit row settles, at which point the SQL settle trigger flips it
 * to `confirmed`.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useStripe } from '@stripe/stripe-react-native';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { Card, Button } from '@/components/ui';
import { computeDinerCharge, formatCents } from '@/lib/stripe/stripeFee';
import { runSinglePaymentSlot } from '@/lib/stripe/runSinglePaymentSlot';
import {
  createPublicBooking,
  confirmDepositPaid,
  type PublicBookingPayload,
} from '@/lib/booking/publicBookingApi';
import { createHoldPaymentIntent } from '@/lib/booking/holdApi';
import { friendlyError } from '@/lib/errors/friendlyError';

const MIN_PAYERS = 2;
const MAX_PAYERS = 10;
const CONFIRM_DEPOSIT_RETRIES = 3;
const CONFIRM_DEPOSIT_BACKOFF_MS = 400; // doubles per attempt

type SlotStatus = 'idle' | 'submitting' | 'paid' | 'failed';

interface Slot {
  status: SlotStatus;
  errorMsg: string | null;
  rowId: string | null;
  piId: string | null;
}

export interface SplitTenderCheckoutProps {
  restaurantId: string;
  partySize: number;
  totalDepositCents: number;
  /** Everything that goes into create-public-booking EXCEPT split_tender_payers. */
  bookingPayload: Omit<PublicBookingPayload, 'split_tender_payers' | 'payment_method'>;
  /** Active reservation hold (only attached to slot 0's PI). */
  holdId: string | null;
  /** Optional billing pre-fill so Person 1 doesn't re-type their email. */
  diner: { name?: string; email?: string; phone?: string };
  onAllPaid: (result: { reservationId: string; confirmationCode: string }) => void;
  onCancel?: () => void;
}

const useStyles = createStyles((c) => ({
  container: {
    gap: spacing.md,
  },
  header: {
    marginBottom: spacing.sm,
  },
  intro: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 20,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  countLabel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  countStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgSurface,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValue: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  shareSummary: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  shareLabel: {
    ...typography.bodySmall,
    color: c.textSecondary,
  },
  shareValue: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },
  shareHint: {
    fontSize: 11,
    lineHeight: 14,
    color: c.textMuted,
    marginTop: 4,
  },
  slotsList: {
    gap: 10,
  },
  slot: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    gap: 12,
  },
  slotPaid: {
    borderColor: c.success,
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  slotFailed: {
    borderColor: c.danger,
    backgroundColor: 'rgba(239, 68, 68, 0.08)',
  },
  slotSubmitting: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201, 168, 76, 0.06)',
  },
  slotIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgBase,
  },
  slotBody: {
    flex: 1,
  },
  slotHeading: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  slotMeta: {
    fontSize: 11,
    lineHeight: 14,
    color: c.textSecondary,
    marginTop: 2,
  },
  slotErrorText: {
    fontSize: 11,
    lineHeight: 14,
    color: c.danger,
    marginTop: 4,
  },
  statusChipPaid: {
    color: c.success,
    fontWeight: '700',
    fontSize: 12,
  },
  statusChipFailed: {
    color: c.danger,
    fontWeight: '700',
    fontSize: 12,
  },
  cta: {
    marginTop: spacing.md,
  },
  ctaFooter: {
    fontSize: 11,
    lineHeight: 14,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
}));

function freshSlots(count: number): Slot[] {
  return Array.from({ length: count }, () => ({
    status: 'idle' as SlotStatus,
    errorMsg: null,
    rowId: null,
    piId: null,
  }));
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function SplitTenderCheckout({
  restaurantId,
  partySize,
  totalDepositCents,
  bookingPayload,
  holdId,
  diner,
  onAllPaid,
}: SplitTenderCheckoutProps) {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  // Default to partySize when reasonable (2..MAX_PAYERS), else MIN_PAYERS.
  const defaultCount = useMemo(() => {
    if (partySize >= MIN_PAYERS && partySize <= MAX_PAYERS) return partySize;
    if (partySize > MAX_PAYERS) return MAX_PAYERS;
    return MIN_PAYERS;
  }, [partySize]);

  const [splitCount, setSplitCount] = useState<number>(defaultCount);
  const [slots, setSlots] = useState<Slot[]>(() => freshSlots(defaultCount));
  const [reservationId, setReservationId] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Keep slots length in sync with splitCount. Changing the count RESETS
  // everything per guide §5.2 — any mid-flow charge is cancelled.
  useEffect(() => {
    setSlots(freshSlots(splitCount));
    setReservationId(null);
    setConfirmationCode(null);
  }, [splitCount]);

  const shareCents = useMemo(
    () => Math.max(0, Math.floor(totalDepositCents / splitCount)),
    [totalDepositCents, splitCount],
  );
  const dinerCharge = useMemo(() => computeDinerCharge(shareCents), [shareCents]);

  const canDecrement = splitCount > MIN_PAYERS && !submitting;
  const canIncrement = splitCount < Math.min(MAX_PAYERS, Math.max(MIN_PAYERS, partySize))
    && !submitting;

  const updateSlot = useCallback((index: number, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }, []);

  const placeOrder = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    let activeReservationId = reservationId;
    let activeConfirmationCode = confirmationCode;
    let activeRowIds: (string | null)[] = slots.map((s) => s.rowId);

    try {
      // Step 1: create the reservation + N pending deposit rows IF this
      // is the first attempt. Retries reuse the same reservation.
      if (!activeReservationId) {
        const bookResp = await createPublicBooking({
          ...bookingPayload,
          payment_method: 'split',
          split_tender_payers: splitCount,
        });
        if (!bookResp.reservation_id) {
          throw new Error(bookResp.error || 'Could not create reservation');
        }
        const rowIds = bookResp.split_tender_deposit_row_ids ?? [];
        if (rowIds.length !== splitCount) {
          throw new Error(
            `Server returned ${rowIds.length} payer slots but we asked for ${splitCount}.`,
          );
        }
        activeReservationId = bookResp.reservation_id;
        activeConfirmationCode = bookResp.confirmation_code;
        activeRowIds = rowIds;
        setReservationId(bookResp.reservation_id);
        setConfirmationCode(bookResp.confirmation_code);
        // Seed each slot with its row id.
        setSlots((prev) =>
          prev.map((s, i) => (s.rowId ? s : { ...s, rowId: rowIds[i] ?? null })),
        );
      }

      // Step 2: per-slot pipeline. Skip already-paid slots so a partial
      // failure recovery only retries the ones that need it.
      for (let i = 0; i < splitCount; i += 1) {
        const slot = slots[i];
        if (slot?.status === 'paid') continue;
        const rowId = activeRowIds[i] ?? slot?.rowId ?? null;
        if (!rowId) {
          updateSlot(i, {
            status: 'failed',
            errorMsg: 'Missing payer slot id — please contact support.',
          });
          continue;
        }
        updateSlot(i, { status: 'submitting', errorMsg: null, rowId });

        // 2a. Mint PaymentIntent for this slot.
        let piResp;
        try {
          piResp = await createHoldPaymentIntent({
            restaurant_id: restaurantId,
            amount_cents: shareCents,
            currency: 'cad',
            customer_email: i === 0 ? (diner.email ?? null) : null,
            customer_name: i === 0 ? (diner.name ?? null) : null,
            save_card: false,
            deposit_payment_ids: [rowId],
            // hold_id ONLY on slot 0 per guide §2.2 + §10.4
            hold_id: i === 0 ? (holdId ?? undefined) : undefined,
          });
        } catch (err) {
          updateSlot(i, {
            status: 'failed',
            errorMsg: friendlyError(err, 'Could not start the payment for this share.'),
          });
          continue;
        }
        if (!piResp.client_secret || !piResp.payment_intent_id) {
          updateSlot(i, {
            status: 'failed',
            errorMsg: 'Could not start the payment for this share.',
          });
          continue;
        }
        const piId = piResp.payment_intent_id;

        // 2b. Open Stripe PaymentSheet for THIS person.
        const result = await runSinglePaymentSlot({
          initPaymentSheet,
          presentPaymentSheet,
          clientSecret: piResp.client_secret,
          merchantDisplayName: 'Cenaiva',
          billing: {
            // Only Slot 0 (the diner running checkout) gets pre-filled.
            // Everyone else types their own card without their friend's
            // email auto-populating.
            name: i === 0 ? diner.name : undefined,
            email: i === 0 ? diner.email : undefined,
            phone: i === 0 ? diner.phone : undefined,
            country: 'CA',
          },
        });
        if (result.outcome === 'cancelled') {
          // User dismissed PaymentSheet. Pause the loop — paid slots
          // stay paid, this slot returns to idle so they can re-tap
          // Place Order.
          updateSlot(i, { status: 'idle', errorMsg: null, piId });
          break;
        }
        if (result.outcome === 'error') {
          updateSlot(i, { status: 'failed', errorMsg: result.message, piId });
          continue;
        }

        // 2c. confirm-deposit-paid with retries. The Stripe charge already
        // succeeded; we just need our server to flip the deposit row.
        // If the server doesn't respond after CONFIRM_DEPOSIT_RETRIES,
        // treat as paid — stripe-webhook reconciliation will settle it.
        let confirmed = false;
        for (let attempt = 0; attempt < CONFIRM_DEPOSIT_RETRIES && !confirmed; attempt += 1) {
          try {
            await confirmDepositPaid({ payment_id: rowId, payment_intent_id: piId });
            confirmed = true;
          } catch {
            if (attempt === CONFIRM_DEPOSIT_RETRIES - 1) {
              // Last attempt — treat charged + webhook reconciles.
              confirmed = true;
            } else {
              await sleep(CONFIRM_DEPOSIT_BACKOFF_MS * (attempt + 1));
            }
          }
        }
        updateSlot(i, { status: 'paid', errorMsg: null, piId, rowId });
      }
    } catch (err) {
      Alert.alert(
        t('common.somethingWentWrong') as string,
        friendlyError(err, 'Could not start the split payment. Please try again.'),
      );
    } finally {
      setSubmitting(false);
    }

    // Use a microtask-deferred slot read so the setState updates above
    // have time to flush. We can't trust the closure-captured `slots`
    // array — read fresh via a functional setState after the loop ends.
    setSlots((latest) => {
      const allPaid = latest.length === splitCount && latest.every((s) => s.status === 'paid');
      if (allPaid && activeReservationId && activeConfirmationCode) {
        onAllPaid({
          reservationId: activeReservationId,
          confirmationCode: activeConfirmationCode,
        });
      }
      return latest;
    });
  }, [
    submitting,
    reservationId,
    confirmationCode,
    slots,
    splitCount,
    bookingPayload,
    restaurantId,
    shareCents,
    diner.name,
    diner.email,
    diner.phone,
    holdId,
    initPaymentSheet,
    presentPaymentSheet,
    updateSlot,
    t,
    onAllPaid,
  ]);

  const failedCount = slots.filter((s) => s.status === 'failed').length;
  const paidCount = slots.filter((s) => s.status === 'paid').length;
  const allPaid = paidCount === splitCount && splitCount > 0;
  const ctaLabel = allPaid
    ? (t('booking.paymentSplitAllPaid') as string)
    : failedCount > 0
      ? (t('booking.paymentSplitRetryFailed', { count: failedCount }) as string)
      : (t('booking.paymentSplitPlaceOrder') as string);

  return (
    <View style={styles.container}>
      <Card>
        <View style={styles.header}>
          <Text style={styles.intro}>{t('booking.paymentSplitIntro')}</Text>
        </View>

        <View style={styles.countRow}>
          <Text style={styles.countLabel}>{t('booking.paymentSplitPeopleCount')}</Text>
          <View style={styles.countStepper}>
            <TouchableOpacity
              style={[styles.stepperBtn, !canDecrement && styles.stepperBtnDisabled]}
              onPress={() => canDecrement && setSplitCount((n) => Math.max(MIN_PAYERS, n - 1))}
              disabled={!canDecrement}
              accessibilityLabel={t('booking.paymentSplitDecrement') as string}
            >
              <Ionicons name="remove" size={18} color={c.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.stepperValue}>{splitCount}</Text>
            <TouchableOpacity
              style={[styles.stepperBtn, !canIncrement && styles.stepperBtnDisabled]}
              onPress={() => canIncrement && setSplitCount((n) => Math.min(MAX_PAYERS, n + 1))}
              disabled={!canIncrement}
              accessibilityLabel={t('booking.paymentSplitIncrement') as string}
            >
              <Ionicons name="add" size={18} color={c.textPrimary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.shareSummary}>
          <View>
            <Text style={styles.shareLabel}>{t('booking.paymentSplitPerShare')}</Text>
            {dinerCharge.dinerPaysFee ? (
              <Text style={styles.shareHint}>
                {t('booking.paymentSplitFeeHint', {
                  base: formatCents(dinerCharge.baseCents),
                  fee: formatCents(dinerCharge.processingFeeCents),
                })}
              </Text>
            ) : null}
          </View>
          <Text style={styles.shareValue}>
            {formatCents(dinerCharge.dinerTotalCents)}
          </Text>
        </View>
      </Card>

      <View style={styles.slotsList}>
        {slots.map((slot, i) => {
          const containerStyle = [
            styles.slot,
            slot.status === 'paid' && styles.slotPaid,
            slot.status === 'failed' && styles.slotFailed,
            slot.status === 'submitting' && styles.slotSubmitting,
          ];
          return (
            <View key={i} style={containerStyle}>
              <View style={styles.slotIcon}>
                {slot.status === 'paid' ? (
                  <Ionicons name="checkmark" size={16} color={c.success} />
                ) : slot.status === 'failed' ? (
                  <Ionicons name="close" size={16} color={c.danger} />
                ) : slot.status === 'submitting' ? (
                  <ActivityIndicator size="small" color={c.gold} />
                ) : (
                  <Text style={{ color: c.textPrimary, fontWeight: '700' }}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.slotBody}>
                <Text style={styles.slotHeading}>
                  {t('booking.paymentSplitPersonHeader', { n: i + 1, total: splitCount })}
                </Text>
                <Text style={styles.slotMeta}>
                  {formatCents(dinerCharge.dinerTotalCents)}
                </Text>
                {slot.errorMsg ? (
                  <Text style={styles.slotErrorText}>{slot.errorMsg}</Text>
                ) : null}
              </View>
              {slot.status === 'paid' ? (
                <Text style={styles.statusChipPaid}>
                  {(t('booking.paymentSplitStatusPaid') as string).toUpperCase()}
                </Text>
              ) : slot.status === 'failed' ? (
                <Text style={styles.statusChipFailed}>
                  {(t('booking.paymentSplitStatusFailed') as string).toUpperCase()}
                </Text>
              ) : null}
            </View>
          );
        })}
      </View>

      <View style={styles.cta}>
        <Button
          title={ctaLabel}
          onPress={() => { void placeOrder(); }}
          disabled={submitting || allPaid}
          loading={submitting}
        />
        <Text style={styles.ctaFooter}>{t('booking.paymentSplitFooter')}</Text>
      </View>
    </View>
  );
}
