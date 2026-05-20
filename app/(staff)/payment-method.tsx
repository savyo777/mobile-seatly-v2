import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  EMPTY_BILLING_ADDRESS,
  formatBillingAddressOneLine,
  getStoredBillingAddress,
  isBillingAddressComplete,
  type RestaurantBillingAddress,
} from '@/lib/storage/restaurantBillingAddress';
import { friendlyError, isUserCancellation } from '@/lib/errors/friendlyError';
import { getCurrentOwnerRestaurantId } from '@/lib/services/ownerRestaurant';
import {
  getRestaurantPaymentMethod,
  updateRestaurantPaymentMethod,
  type RestaurantCardSummary,
} from '@/lib/owner/billing';
import { createRestaurantSetupIntent } from '@/lib/owner/saveSubscriptionPaymentMethod';

function formatBrand(brand: string | null): string {
  if (!brand) return 'Card';
  const v = brand.toLowerCase();
  if (v === 'visa') return 'Visa';
  if (v === 'mastercard') return 'Mastercard';
  if (v === 'amex' || v === 'american_express') return 'Amex';
  return brand.charAt(0).toUpperCase() + brand.slice(1);
}

function formatExpiry(card: RestaurantCardSummary): string | null {
  if (!card.expMonth || !card.expYear) return null;
  return `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`;
}

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },

  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },

  summaryCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  summaryValue: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  summaryText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  formCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  formCardHeader: {
    marginBottom: spacing.md,
    gap: 3,
  },
  formCardTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  formCardSub: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },
  cardList: {
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 72,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  brandBadge: {
    width: 44,
    height: 30,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  brandText: {
    ...typography.label,
    color: c.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.6,
    fontSize: 10,
  },
  cardText: { flex: 1, gap: 2 },
  cardTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  cardSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  defaultBadge: {
    ...typography.label,
    color: c.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
    overflow: 'hidden',
    letterSpacing: 0.6,
  },
  moreBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },

  /* Add card button */
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    marginBottom: spacing.lg,
  },
  addBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
  },

  /* Billing address row */
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginBottom: spacing.lg,
  },
  addressIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,168,76,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addressText: { flex: 1, gap: 2 },
  addressTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  addressSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
  },

  /* Empty */
  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  emptyTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
  },

}));

export default function PaymentMethodScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const { initPaymentSheet, presentPaymentSheet, retrieveSetupIntent } = useStripe();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [card, setCard] = useState<RestaurantCardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [billingAddress, setBillingAddress] = useState<RestaurantBillingAddress>(EMPTY_BILLING_ADDRESS);
  const returnRoute =
    source === 'subscription-plan'
      ? '/(staff)/subscription-plan'
      : '/(staff)/settings';

  useEffect(() => {
    let active = true;
    void (async () => {
      const id = await getCurrentOwnerRestaurantId();
      if (!active) return;
      setRestaurantId(id);
    })();
    return () => {
      active = false;
    };
  }, []);

  const refreshCard = useCallback(async (id: string) => {
    try {
      const next = await getRestaurantPaymentMethod(id);
      setCard(next);
    } catch (err) {
      Alert.alert('Payment method', friendlyError(err, 'Could not load the card on file.'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAll = useCallback(() => {
    if (!restaurantId) return;
    void refreshCard(restaurantId);
    void (async () => {
      try {
        setBillingAddress(await getStoredBillingAddress());
      } catch {
        /* best effort */
      }
    })();
  }, [restaurantId, refreshCard]);

  useFocusEffect(loadAll);

  const handleChangeCard = useCallback(() => {
    if (!restaurantId || updating) return;
    setUpdating(true);
    void (async () => {
      try {
        const { clientSecret } = await createRestaurantSetupIntent(restaurantId);
        const initResult = await initPaymentSheet({
          setupIntentClientSecret: clientSecret,
          merchantDisplayName: 'Cenaiva',
          returnURL: 'cenaiva://stripe-redirect',
          allowsDelayedPaymentMethods: false,
        });
        if (initResult.error) {
          throw new Error(friendlyError(initResult.error, 'Could not start card setup.'));
        }
        const presentResult = await presentPaymentSheet();
        if (presentResult.error) {
          if (isUserCancellation(presentResult.error)) return;
          throw new Error(friendlyError(presentResult.error, 'Could not save the new card.'));
        }
        // PaymentSheet attached the new PM during confirmSetup. Read the
        // SetupIntent to discover its id, then promote it to the
        // subscription's default and detach the previous card.
        const retrieved = await retrieveSetupIntent(clientSecret);
        const newPmId =
          (retrieved.setupIntent?.paymentMethodId as string | undefined) ??
          (retrieved.setupIntent as unknown as { payment_method?: string })?.payment_method ??
          null;
        if (!newPmId) {
          throw new Error('Could not read the saved card from Stripe. Please try again.');
        }
        await updateRestaurantPaymentMethod({
          restaurantId,
          paymentMethodId: newPmId,
        });
        await refreshCard(restaurantId);
        Alert.alert('Card updated', 'Cenaiva will charge your new card going forward.');
      } catch (err) {
        Alert.alert('Card not updated', friendlyError(err, 'Please try again.'));
      } finally {
        setUpdating(false);
      }
    })();
  }, [restaurantId, updating, initPaymentSheet, presentPaymentSheet, retrieveSetupIntent, refreshCard]);

  const onEditBillingAddress = () => {
    router.push({
      pathname: '/(staff)/billing-address',
      params: { source: source ?? 'settings' },
    } as never);
  };

  const billingAddressComplete = isBillingAddressComplete(billingAddress);
  const billingAddressLine = billingAddressComplete
    ? formatBillingAddressOneLine(billingAddress)
    : 'Add a billing address for receipts and tax docs.';
  const expiry = card ? formatExpiry(card) : null;

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Payment method"
          accentBack
          onBack={() => router.replace(returnRoute as never)}
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Payment details</Text>
        <Text style={styles.introText}>
          The card on file is used for your Cenaiva subscription and per-booking fees. Updating
          replaces the old card automatically.
        </Text>
      </View>

      <View style={styles.noteRow}>
        <Ionicons name="lock-closed-outline" size={14} color={c.gold} />
        <Text style={styles.noteText}>
          Your card is collected by Stripe — Cenaiva never sees the full number or CVC.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Default payment card</Text>
        <Text style={styles.summaryValue}>
          {card?.hasCard
            ? `${formatBrand(card.brand)} ending in ${card.last4 ?? '••••'}`
            : loading ? 'Loading…' : 'No card on file'}
        </Text>
        <Text style={styles.summaryText}>
          {card?.hasCard && expiry
            ? `Expires ${expiry}`
            : 'Add a card to keep your subscription active.'}
        </Text>
      </View>

      {!loading && !card?.hasCard ? (
        <View style={[styles.formCard, styles.empty]}>
          <View style={styles.emptyIcon}>
            <Ionicons name="card-outline" size={26} color={c.gold} />
          </View>
          <Text style={styles.emptyTitle}>No card on file</Text>
          <Text style={styles.emptyText}>
            Tap “Add payment card” below to save one via Stripe. Cenaiva uses it for the monthly
            subscription and per-booking fees.
          </Text>
        </View>
      ) : null}

      <Pressable
        onPress={onEditBillingAddress}
        style={({ pressed }) => [styles.addressRow, pressed && { opacity: 0.85 }]}
        accessibilityRole="button"
        accessibilityLabel="Edit billing address"
      >
        <View style={styles.addressIcon}>
          <Ionicons name="home-outline" size={18} color={c.gold} />
        </View>
        <View style={styles.addressText}>
          <Text style={styles.addressTitle}>
            {billingAddressComplete ? 'Billing address' : 'Add billing address'}
          </Text>
          <Text style={styles.addressSub} numberOfLines={2}>
            {billingAddressLine}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </Pressable>

      <Pressable
        onPress={handleChangeCard}
        disabled={updating || !restaurantId}
        style={({ pressed }) => [styles.addBtn, (pressed || updating) && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel={card?.hasCard ? 'Change payment card' : 'Add payment card'}
      >
        <Ionicons name={card?.hasCard ? 'swap-horizontal' : 'add'} size={18} color={c.bgBase} />
        <Text style={styles.addBtnText}>
          {updating ? 'Opening Stripe…' : card?.hasCard ? 'Change payment card' : 'Add payment card'}
        </Text>
      </Pressable>
    </OwnerScreen>
  );
}
