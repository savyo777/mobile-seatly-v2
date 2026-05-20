import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useStripe } from '@stripe/stripe-react-native';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { Card, Button, Badge } from '@/components/ui';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { resolveAuthDisplayProfile } from '@/lib/auth/displayProfile';
import {
  createDinerSetupIntent,
  detachSavedCard,
  listSavedCards,
  setDefaultSavedCard,
  type SavedCard,
} from '@/lib/stripe/stripeSavedCards';
import { useColors, createStyles, spacing, typography, borderRadius, shadows } from '@/lib/theme';
import { friendlyError, isUserCancellation } from '@/lib/errors/friendlyError';

const useStyles = createStyles((c) => ({
  card: {
    marginBottom: spacing.md,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    ...shadows.card,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  cardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    flex: 1,
  },
  brandIcon: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  brandLabel: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 4,
  },
  cardActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    paddingTop: spacing.md,
  },
  linkBtn: {
    paddingVertical: spacing.xs,
  },
  linkText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },
  linkDanger: {
    color: '#E8A0A0',
  },
  addBtn: {
    marginBottom: spacing.lg,
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  addressName: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  addressLine: {
    ...typography.body,
    color: c.textSecondary,
  },
  editAddr: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
}));

function brandLabel(brand: string): string {
  switch (brand) {
    case 'visa': return 'Visa';
    case 'mastercard': return 'Mastercard';
    case 'amex': return 'Amex';
    case 'discover': return 'Discover';
    case 'jcb': return 'JCB';
    case 'diners': return 'Diners Club';
    case 'unionpay': return 'UnionPay';
    default: return 'Card';
  }
}

function expiryLabel(card: SavedCard): string | null {
  if (!card.expMonth || !card.expYear) return null;
  return `Exp ${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`;
}

export default function PaymentScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();
  const profile = useMemo(
    () => resolveAuthDisplayProfile(user, { fullName: 'Cardholder' }),
    [user],
  );
  const [methods, setMethods] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingCard, setAddingCard] = useState(false);
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  const refresh = useCallback(async (): Promise<void> => {
    try {
      const next = await listSavedCards();
      setMethods(next);
    } catch (error) {
      Alert.alert('Saved cards', friendlyError(error, 'Could not load saved cards.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const next = await listSavedCards();
        if (active) setMethods(next);
      } catch (error) {
        if (active) {
          Alert.alert('Saved cards', friendlyError(error, 'Could not load saved cards.'));
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleSetDefault = (card: SavedCard) => {
    void (async () => {
      try {
        await setDefaultSavedCard(card.id);
        await refresh();
      } catch (error) {
        Alert.alert('Saved cards', friendlyError(error, 'Could not change the default card.'));
      }
    })();
  };

  const handleRemove = (card: SavedCard) => {
    Alert.alert(
      'Remove card',
      `Remove ${brandLabel(card.brand)} •••• ${card.last4}? You can add it back any time.`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                await detachSavedCard(card.id);
                await refresh();
              } catch (error) {
                Alert.alert('Saved cards', friendlyError(error, 'Could not remove this card.'));
              }
            })();
          },
        },
      ],
    );
  };

  const handleAddCard = () => {
    if (addingCard) return;
    setAddingCard(true);
    void (async () => {
      try {
        const { clientSecret } = await createDinerSetupIntent();
        const initResult = await initPaymentSheet({
          setupIntentClientSecret: clientSecret,
          merchantDisplayName: 'Cenaiva',
          returnURL: 'cenaiva://stripe-redirect',
          allowsDelayedPaymentMethods: false,
          defaultBillingDetails: {
            name: profile.fullName || undefined,
            email: profile.email || undefined,
            phone: profile.phone || undefined,
          },
        });
        if (initResult.error) {
          throw new Error(friendlyError(initResult.error, 'Could not start card setup.'));
        }
        const presentResult = await presentPaymentSheet();
        if (presentResult.error) {
          if (isUserCancellation(presentResult.error)) return;
          throw new Error(friendlyError(presentResult.error, 'Could not save the card.'));
        }
        await refresh();
      } catch (error) {
        Alert.alert('Add card', friendlyError(error, 'Could not add this card. Please try again.'));
      } finally {
        setAddingCard(false);
      }
    })();
  };

  return (
    <ProfileStackScreen title={t('profile.paymentMethods')} subtitle={t('profile.paymentMethodsSub')}>
      <ProfileSectionTitle>Payment methods</ProfileSectionTitle>
      {!loading && methods.length === 0 ? (
        <Text style={styles.emptyText}>
          No cards saved yet. Add one to check out faster next time you book.
        </Text>
      ) : null}
      {methods.map((m) => (
        <Card key={m.id} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.cardLeft}>
              <View style={styles.brandIcon}>
                <Ionicons name="card" size={22} color={c.gold} />
              </View>
              <View>
                <Text style={styles.brandLabel}>
                  {brandLabel(m.brand)} ···· {m.last4}
                </Text>
                <Text style={styles.meta}>
                  {expiryLabel(m) ?? 'Saved card'}
                </Text>
              </View>
            </View>
            {m.isDefault ? <Badge label="Default" variant="gold" size="sm" /> : null}
          </View>
          <View style={styles.cardActions}>
            {!m.isDefault ? (
              <Pressable onPress={() => handleSetDefault(m)} style={styles.linkBtn}>
                <Text style={styles.linkText}>Set as default</Text>
              </Pressable>
            ) : null}
            <Pressable onPress={() => handleRemove(m)} style={styles.linkBtn}>
              <Text style={[styles.linkText, styles.linkDanger]}>Remove</Text>
            </Pressable>
          </View>
        </Card>
      ))}

      <Button
        title={addingCard ? 'Adding card…' : 'Add new card'}
        onPress={handleAddCard}
        variant="outlined"
        size="md"
        style={styles.addBtn}
        disabled={addingCard}
      />

      <ProfileSectionTitle>Billing address</ProfileSectionTitle>
      <Card style={styles.card}>
        <Text style={styles.addressName}>{profile.fullName}</Text>
        <Text style={styles.addressLine}>{profile.email || 'No email on file'}</Text>
        <Text style={styles.addressLine}>{profile.phone || 'No phone number on file'}</Text>
        <Pressable
          style={styles.editAddr}
          onPress={() => Alert.alert('Billing details', 'Billing address editing is coming soon.')}
        >
          <Text style={styles.linkText}>Edit billing address</Text>
          <ChevronGlyph color={c.gold} size={16} />
        </Pressable>
      </Card>
    </ProfileStackScreen>
  );
}
