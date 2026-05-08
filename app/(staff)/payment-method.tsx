import React, { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  getStoredRestaurantPaymentCards,
  removeRestaurantPaymentCard,
  setDefaultRestaurantPaymentCard,
} from '@/lib/storage/restaurantPaymentMethod';
import {
  EMPTY_BILLING_ADDRESS,
  formatBillingAddressOneLine,
  getStoredBillingAddress,
  isBillingAddressComplete,
  type RestaurantBillingAddress,
} from '@/lib/storage/restaurantBillingAddress';

type Card = {
  id: string;
  brand: string;
  funding: 'credit' | 'debit' | 'prepaid' | 'unknown';
  last4: string;
  expiry: string;
  cardholder: string;
  isDefault: boolean;
  source: 'registration' | 'manual';
};

function fundingLabel(funding: Card['funding']): string {
  if (funding === 'credit') return 'Credit';
  if (funding === 'debit') return 'Debit';
  if (funding === 'prepaid') return 'Prepaid';
  return '';
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

const INITIAL_CARDS: Card[] = [];

export default function PaymentMethodScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { source } = useLocalSearchParams<{ source?: string }>();
  const [cards, setCards] = useState<Card[]>(INITIAL_CARDS);
  const [billingAddress, setBillingAddress] = useState<RestaurantBillingAddress>(EMPTY_BILLING_ADDRESS);
  const returnRoute =
    source === 'subscription-plan'
      ? '/(staff)/subscription-plan'
      : '/(staff)/settings';

  const loadCards = useCallback(() => {
    void (async () => {
      const stored = await getStoredRestaurantPaymentCards();
      setCards(
        stored.map((card) => ({
          id: card.id,
          brand: card.brand,
          funding: card.funding,
          last4: card.last4,
          expiry: card.expiry,
          cardholder: card.cardholder,
          isDefault: card.isDefault,
          source: card.source,
        })),
      );
      const address = await getStoredBillingAddress();
      setBillingAddress(address);
    })();
  }, []);

  useFocusEffect(loadCards);

  const setDefault = (id: string) => {
    void (async () => {
      const next = await setDefaultRestaurantPaymentCard(id);
      setCards(
        next.map((card) => ({
          id: card.id,
          brand: card.brand,
          funding: card.funding,
          last4: card.last4,
          expiry: card.expiry,
          cardholder: card.cardholder,
          isDefault: card.isDefault,
          source: card.source,
        })),
      );
    })();
  };

  const removeCard = (id: string) => {
    const target = cards.find((c) => c.id === id);
    if (!target) return;
    if (target.isDefault && cards.length > 1) {
      Alert.alert(
        'Set a new default first',
        'Make another card the default before removing this one.',
      );
      return;
    }
    Alert.alert(
      'Remove card?',
      `${target.brand} ending in ${target.last4} will be removed from billing.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              const next = await removeRestaurantPaymentCard(id);
              setCards(
                next.map((card) => ({
                  id: card.id,
                  brand: card.brand,
                  funding: card.funding,
                  last4: card.last4,
                  expiry: card.expiry,
                  cardholder: card.cardholder,
                  isDefault: card.isDefault,
                  source: card.source,
                })),
              );
            })();
          },
        },
      ],
    );
  };

  const showCardActions = (id: string) => {
    const target = cards.find((c) => c.id === id);
    if (!target) return;
    const buttons: { text: string; style?: 'cancel' | 'destructive' | 'default'; onPress?: () => void }[] = [];
    if (!target.isDefault) {
      buttons.push({
        text: 'Make default',
        onPress: () => setDefault(id),
      });
    }
    buttons.push({ text: 'Remove card', style: 'destructive', onPress: () => removeCard(id) });
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(`${target.brand} ···· ${target.last4}`, undefined, buttons);
  };

  const onAddCard = () => {
    router.push({
      pathname: '/(staff)/add-card',
      params: { source: source ?? 'settings' },
    } as never);
  };

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
          Manage the card used for your restaurant account.
        </Text>
      </View>

      <View style={styles.noteRow}>
        <Ionicons name="lock-closed-outline" size={14} color={c.gold} />
        <Text style={styles.noteText}>
          Use a Visa, Mastercard, debit Visa, or credit card. The default card is used for Cenaiva billing.
        </Text>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Default payment card</Text>
        <Text style={styles.summaryValue}>
          {cards.find((card) => card.isDefault)
            ? `${cards.find((card) => card.isDefault)?.brand} ending in ${cards.find((card) => card.isDefault)?.last4}`
            : 'No card on file'}
        </Text>
        <Text style={styles.summaryText}>
          {cards.find((card) => card.isDefault)?.source === 'registration'
            ? 'This is the card saved when the restaurant account was registered.'
            : 'Add the card you want on file for Cenaiva billing.'}
        </Text>
      </View>

      {cards.length === 0 ? (
        <View style={[styles.formCard, styles.empty]}>
          <View style={styles.emptyIcon}>
            <Ionicons name="card-outline" size={26} color={c.gold} />
          </View>
          <Text style={styles.emptyTitle}>No card on file</Text>
          <Text style={styles.emptyText}>
            Add a card to keep your subscription active and pay booking fees automatically.
          </Text>
        </View>
      ) : (
        <View style={styles.formCard}>
          <View style={styles.formCardHeader}>
            <Text style={styles.formCardTitle}>Saved cards</Text>
            <Text style={styles.formCardSub}>
              The registration card appears here automatically. You can set another card as default anytime.
            </Text>
          </View>

          <View style={styles.cardList}>
            {cards.map((card, i) => (
              <View key={card.id} style={[styles.cardRow, i > 0 && styles.rowDivider]}>
                <View style={styles.brandBadge}>
                  <Text style={styles.brandText}>{card.brand.toUpperCase()}</Text>
                </View>
                <View style={styles.cardText}>
                  <Text style={styles.cardTitle}>
                    {card.brand}{fundingLabel(card.funding) ? ` ${fundingLabel(card.funding)}` : ''} ···· {card.last4}
                  </Text>
                  <Text style={styles.cardSub}>
                    Expires {card.expiry}
                    {card.cardholder ? ` · ${card.cardholder}` : ''}
                  </Text>
                </View>
                {card.isDefault ? <Text style={styles.defaultBadge}>DEFAULT</Text> : null}
                <Pressable
                  onPress={() => showCardActions(card.id)}
                  style={({ pressed }) => [styles.moreBtn, pressed && { opacity: 0.6 }]}
                  hitSlop={6}
                  accessibilityLabel={`More options for card ending in ${card.last4}`}
                >
                  <Ionicons name="ellipsis-horizontal" size={20} color={c.textMuted} />
                </Pressable>
              </View>
            ))}
          </View>
        </View>
      )}

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
        onPress={onAddCard}
        style={({ pressed }) => [styles.addBtn, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
        accessibilityLabel="Add a card"
      >
        <Ionicons name="add" size={18} color={c.bgBase} />
        <Text style={styles.addBtnText}>Add payment card</Text>
      </Pressable>
    </OwnerScreen>
  );
}
