import React from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useColors, useTheme, createStyles, spacing, borderRadius, withAlpha, type ThemeMode } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { compactNameLabel, resolveAuthDisplayProfile } from '@/lib/auth/displayProfile';
import { deleteAccount, removeRestaurants, signOutAllDevices } from '@/lib/services/accountSecurity';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';
import { withOwnerReturnTarget } from '@/lib/navigation/ownerReturnTargets';
import { getStoredRestaurantPaymentCards } from '@/lib/storage/restaurantPaymentMethod';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { useOwnerRestaurantContext } from '@/lib/owner/OwnerRestaurantContext';
import type { OwnerRestaurant } from '@/lib/services/ownerRestaurant';
import { readBusinessHours, BUSINESS_HOURS_DAY_KEYS } from '@/lib/owner/businessHoursSettings';
import { readClosures } from '@/lib/owner/closuresSettings';
import { fetchStaffRoster } from '@/lib/owner/staffRoster';

const OWNER_MONTHLY_SUB_DOLLARS = Number(process.env.EXPO_PUBLIC_OWNER_MONTHLY_SUB_DOLLARS) || 0;
const OWNER_MONTHLY_SUB_LABEL = OWNER_MONTHLY_SUB_DOLLARS > 0
  ? `$${OWNER_MONTHLY_SUB_DOLLARS} / month`
  : '';

// ── Types ──────────────────────────────────────────────────────────────────

type RowItem =
  | {
      kind: 'nav';
      label: string;
      value?: string;
      icon: string;
      route?: string;
      danger?: boolean;
      action?: 'switch_to_customer' | 'remove_restaurants' | 'delete_account';
    }
  | { kind: 'toggle'; label: string; icon: string; value: boolean; onChange: (v: boolean) => void };

type Section = { title: string; rows: RowItem[] };

const THEME_OPTIONS: { mode: ThemeMode; label: string; icon: string }[] = [
  { mode: 'light', label: 'Light', icon: 'sunny-outline' },
  { mode: 'dark', label: 'Dark', icon: 'moon-outline' },
  { mode: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

function themeLabel(mode: ThemeMode): string {
  if (mode === 'light') return 'Light';
  if (mode === 'dark') return 'Dark';
  return 'System';
}

function normalizeConfirmationName(value: string): string {
  return value.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim();
}

// ── Styles ─────────────────────────────────────────────────────────────────

const useStyles = createStyles((c) => ({
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: 4,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: 2,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    minHeight: 52,
    gap: spacing.sm,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { backgroundColor: c.bgElevated },
  iconWrap: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  rowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
  },
  rowLabelDanger: { color: c.danger },
  rowValue: {
    fontSize: 14,
    fontWeight: '500',
    color: c.textMuted,
    marginRight: 4,
  },
  appearancePanel: {
    marginTop: spacing.sm,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  appearanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: spacing.sm,
  },
  appearanceOptionActive: {
    backgroundColor: c.bgElevated,
  },
  appearanceOptionDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  appearanceOptionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    maxHeight: '86%',
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.md,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
  },
  modalClose: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  modalBody: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    fontSize: 14,
    lineHeight: 20,
    color: c.textSecondary,
  },
  modalList: {
    maxHeight: 320,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  restaurantChoice: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 62,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.md,
  },
  restaurantChoicePressed: {
    backgroundColor: c.bgElevated,
  },
  restaurantChoiceDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  restaurantChoiceText: {
    flex: 1,
    minWidth: 0,
  },
  restaurantChoiceName: {
    fontSize: 15,
    fontWeight: '800',
    color: c.textPrimary,
  },
  restaurantChoiceMeta: {
    marginTop: 3,
    fontSize: 13,
    color: c.textMuted,
  },
  confirmationPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.danger,
    backgroundColor: withAlpha(c.danger, 0.1),
  },
  confirmationLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
  },
  confirmationTarget: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '800',
    color: c.danger,
  },
  confirmationInput: {
    minHeight: 44,
    marginTop: spacing.sm,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    paddingHorizontal: spacing.md,
    color: c.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  confirmationHint: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17,
    color: c.textMuted,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    padding: spacing.lg,
  },
  modalAction: {
    minHeight: 42,
    minWidth: 104,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  modalActionSecondary: {
    backgroundColor: c.bgElevated,
  },
  modalActionDestructive: {
    backgroundColor: c.danger,
  },
  modalActionDisabled: {
    opacity: 0.55,
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.textPrimary,
  },
  modalActionDestructiveText: {
    color: '#fff',
  },
}));

// ── Row components ─────────────────────────────────────────────────────────

function NavRow({
  item,
  divider,
  onPress,
}: {
  item: Extract<RowItem, { kind: 'nav' }>;
  divider: boolean;
  onPress: () => void;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <Pressable
      style={({ pressed }) => [styles.row, divider && styles.rowDivider, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={item.label}
    >
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon as any} size={16} color={item.danger ? c.danger : c.gold} />
      </View>
      <Text style={[styles.rowLabel, item.danger && styles.rowLabelDanger]}>{item.label}</Text>
      {item.value ? <Text style={styles.rowValue}>{item.value}</Text> : null}
      <Ionicons name="chevron-forward" size={15} color={c.textMuted} />
    </Pressable>
  );
}

function ToggleRow({ item, divider }: { item: Extract<RowItem, { kind: 'toggle' }>; divider: boolean }) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.row, divider && styles.rowDivider]}>
      <View style={styles.iconWrap}>
        <Ionicons name={item.icon as any} size={16} color={c.gold} />
      </View>
      <Text style={styles.rowLabel}>{item.label}</Text>
      <Switch
        value={item.value}
        onValueChange={item.onChange}
        trackColor={{ true: c.gold, false: c.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

function AppearancePicker() {
  const c = useColors();
  const styles = useStyles();
  const { mode, setMode } = useTheme();

  return (
    <View style={styles.appearancePanel}>
      {THEME_OPTIONS.map((option, index) => {
        const active = mode === option.mode;
        return (
          <Pressable
            key={option.mode}
            onPress={() => setMode(option.mode)}
            style={({ pressed }) => [
              styles.appearanceOption,
              index > 0 && styles.appearanceOptionDivider,
              active && styles.appearanceOptionActive,
              pressed && styles.rowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Use ${option.label} appearance`}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={option.icon as any} size={16} color={active ? c.gold : c.textSecondary} />
            </View>
            <Text style={styles.appearanceOptionText}>{option.label}</Text>
            {active ? <Ionicons name="checkmark-circle" size={20} color={c.gold} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

function RestaurantRemovalModal({
  visible,
  restaurants,
  selectedIds,
  confirmationValue,
  confirmationTarget,
  confirmationMatches,
  removing,
  onCancel,
  onConfirm,
  onToggle,
  onConfirmationChange,
}: {
  visible: boolean;
  restaurants: OwnerRestaurant[];
  selectedIds: string[];
  confirmationValue: string;
  confirmationTarget: string;
  confirmationMatches: boolean;
  removing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  onToggle: (id: string) => void;
  onConfirmationChange: (value: string) => void;
}) {
  const c = useColors();
  const styles = useStyles();
  const selected = React.useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectedCount = selectedIds.length;
  const disabled = removing || selectedCount === 0 || !confirmationMatches;

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={removing ? undefined : onCancel}
    >
      <View style={styles.modalBackdrop}>
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Remove restaurants</Text>
            <Pressable
              onPress={onCancel}
              disabled={removing}
              style={styles.modalClose}
              accessibilityRole="button"
              accessibilityLabel="Close restaurant removal"
            >
              <Ionicons name="close" size={18} color={c.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.modalBody}>
            Selected restaurants will be unpublished immediately and their subscriptions will stop renewing at the end of the current billing period.
          </Text>
          <ScrollView style={styles.modalList} contentContainerStyle={{ paddingVertical: 2 }}>
            {restaurants.map((restaurant, index) => {
              const active = selected.has(restaurant.id);
              return (
                <Pressable
                  key={restaurant.id}
                  onPress={() => onToggle(restaurant.id)}
                  disabled={removing}
                  style={({ pressed }) => [
                    styles.restaurantChoice,
                    index > 0 && styles.restaurantChoiceDivider,
                    pressed && styles.restaurantChoicePressed,
                  ]}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: active, disabled: removing }}
                  accessibilityLabel={`Remove ${restaurant.name}`}
                >
                  <Ionicons
                    name={active ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={active ? c.danger : c.textMuted}
                  />
                  <View style={styles.restaurantChoiceText}>
                    <Text style={styles.restaurantChoiceName} numberOfLines={1}>{restaurant.name}</Text>
                    <Text style={styles.restaurantChoiceMeta} numberOfLines={1}>
                      {restaurant.address || restaurant.city || 'Restaurant'}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
          <View style={styles.confirmationPanel}>
            <Text style={styles.confirmationLabel}>
              {selectedCount <= 1
                ? 'Type the restaurant name to confirm.'
                : 'Type the selected restaurant names exactly as shown to confirm.'}
            </Text>
            {confirmationTarget ? (
              <Text style={styles.confirmationTarget} selectable>
                {confirmationTarget}
              </Text>
            ) : null}
            <TextInput
              value={confirmationValue}
              onChangeText={onConfirmationChange}
              placeholder={confirmationTarget || 'Restaurant name'}
              placeholderTextColor={c.textMuted}
              editable={!removing && selectedCount > 0}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.confirmationInput}
              accessibilityLabel="Restaurant removal confirmation name"
            />
            <Text style={styles.confirmationHint}>
              The name must match exactly before the restaurant and its subscription can be removed.
            </Text>
          </View>
          <View style={styles.modalActions}>
            <Pressable
              onPress={onCancel}
              disabled={removing}
              style={[styles.modalAction, styles.modalActionSecondary, removing && styles.modalActionDisabled]}
              accessibilityRole="button"
            >
              <Text style={styles.modalActionText}>Cancel</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={disabled}
              style={[
                styles.modalAction,
                styles.modalActionDestructive,
                disabled && styles.modalActionDisabled,
              ]}
              accessibilityRole="button"
            >
              {removing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={[styles.modalActionText, styles.modalActionDestructiveText]}>Remove</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function SettingsSection({
  section,
  restaurantCount,
  onOpenRestaurantRemoval,
}: {
  section: Section;
  restaurantCount: number;
  onOpenRestaurantRemoval: () => void;
}) {
  const styles = useStyles();
  const router = useRouter();
  const [appearanceOpen, setAppearanceOpen] = React.useState(false);
  const { signOut } = useAuthSession();

  const handleNav = (item: Extract<RowItem, { kind: 'nav' }>) => {
    if (item.label === 'Log out') {
      Alert.alert('Log out', 'Are you sure you want to log out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/onboarding' as never);
            } catch (e: any) {
              Alert.alert('Logout failed', e?.message ?? 'Failed to log out. Please try again.');
            }
          },
        },
      ]);
    } else if (item.label === 'Log out of all devices') {
      Alert.alert(
        'Log out of all devices',
        'All active sessions will be signed out, including this device.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log out of all devices',
            style: 'destructive',
            onPress: async () => {
              try {
                await signOutAllDevices();
                router.replace('/onboarding' as never);
              } catch (e: any) {
                Alert.alert(
                  'Sign out failed',
                  e?.message ?? 'Could not sign out all devices. Please try again.',
                );
              }
            },
          },
        ],
      );
    } else if (item.action === 'remove_restaurants') {
      onOpenRestaurantRemoval();
    } else if (item.action === 'delete_account') {
      if (restaurantCount > 0) {
        Alert.alert(
          'Remove restaurants first',
          'Remove every restaurant from this account before deleting the owner account. This prevents active subscriptions from being left behind.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Remove restaurants', style: 'destructive', onPress: onOpenRestaurantRemoval },
          ],
        );
        return;
      }
      Alert.alert(
        'Delete account',
        'This action is permanent and cannot be undone. Your account and data will be deleted.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete account',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteAccount();
                router.replace('/onboarding' as never);
              } catch (e: any) {
                Alert.alert(
                  'Delete failed',
                  e?.message ?? 'Could not delete your account. Please try again.',
                );
              }
            },
          },
        ],
      );
    } else if (item.label === 'Appearance') {
      setAppearanceOpen((open) => !open);
    } else if (item.label === 'Currency') {
      Alert.alert(
        `Currency: ${item.value ?? ''}`,
        "This is the currency the app uses for all your revenue, expenses, and analytics. It's set when your restaurant is created. Receipts scanned in a different currency are automatically converted to this one. Contact support if you need to change it.",
      );
    } else if (item.action === 'switch_to_customer') {
      void (async () => {
        await setAppShellPreference('customer');
        router.replace('/(customer)' as never);
      })();
    } else if (item.route) {
      router.push(withOwnerReturnTarget(item.route, 'settings') as never);
    }
    // No silent fallback: every nav row must either have a route or a
    // dedicated branch above. Adding a row without one is a build-time bug
    // we'd rather surface during development than hide behind "Coming soon".
  };

  return (
    <>
      <Text style={styles.sectionLabel}>{section.title}</Text>
      <View style={styles.card}>
        {section.rows.map((item, i) =>
          item.kind === 'toggle' ? (
            <ToggleRow key={item.label} item={item} divider={i > 0} />
          ) : (
            <React.Fragment key={item.label}>
              <NavRow item={item} divider={i > 0} onPress={() => handleNav(item)} />
              {item.label === 'Appearance' && appearanceOpen ? <AppearancePicker /> : null}
            </React.Fragment>
          ),
        )}
      </View>
    </>
  );
}

// ── Screen ─────────────────────────────────────────────────────────────────

export default function OwnerSettingsScreen() {
  const styles = useStyles();
  const router = useRouter();
  const { mode } = useTheme();
  const { user } = useAuthSession();
  const profile = React.useMemo(
    () => resolveAuthDisplayProfile(user, { fullName: 'Restaurant owner' }),
    [user],
  );

  const [pushOn, setPushOn] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(true);
  const [paymentMethodLabel, setPaymentMethodLabel] = React.useState('No card on file');
  const [businessHoursLabel, setBusinessHoursLabel] = React.useState('');
  const [closuresLabel, setClosuresLabel] = React.useState('');
  const [staffMembersLabel, setStaffMembersLabel] = React.useState('');
  const { refresh: refreshOwnerRestaurants } = useOwnerRestaurantContext();
  const { selectedRestaurantId, restaurants, selectedRestaurant } = useOwnerScope();
  const currencyLabel = (selectedRestaurant?.currency ?? 'CAD').toUpperCase();
  const [restaurantRemovalOpen, setRestaurantRemovalOpen] = React.useState(false);
  const [restaurantRemovalIds, setRestaurantRemovalIds] = React.useState<string[]>([]);
  const [restaurantRemovalConfirmation, setRestaurantRemovalConfirmation] = React.useState('');
  const [removingRestaurants, setRemovingRestaurants] = React.useState(false);

  const restaurantById = React.useMemo(
    () => new Map(restaurants.map((restaurant) => [restaurant.id, restaurant])),
    [restaurants],
  );
  const selectedRemovalRestaurants = React.useMemo(
    () => restaurantRemovalIds
      .map((restaurantId) => restaurantById.get(restaurantId))
      .filter((restaurant): restaurant is OwnerRestaurant => Boolean(restaurant)),
    [restaurantById, restaurantRemovalIds],
  );
  const removalConfirmationTarget = React.useMemo(
    () => selectedRemovalRestaurants.map((restaurant) => restaurant.name.trim()).join(', '),
    [selectedRemovalRestaurants],
  );
  const removalConfirmationMatches = removalConfirmationTarget.length > 0
    && normalizeConfirmationName(restaurantRemovalConfirmation) === removalConfirmationTarget;

  const openRestaurantRemoval = React.useCallback(() => {
    const firstSelected = selectedRestaurantId && restaurants.some((restaurant) => restaurant.id === selectedRestaurantId)
      ? selectedRestaurantId
      : restaurants[0]?.id;
    setRestaurantRemovalIds(firstSelected ? [firstSelected] : []);
    setRestaurantRemovalConfirmation('');
    setRestaurantRemovalOpen(true);
  }, [restaurants, selectedRestaurantId]);

  const toggleRestaurantRemoval = React.useCallback((restaurantId: string) => {
    setRestaurantRemovalConfirmation('');
    setRestaurantRemovalIds((current) =>
      current.includes(restaurantId)
        ? current.filter((id) => id !== restaurantId)
        : [...current, restaurantId],
    );
  }, []);

  const performRestaurantRemoval = React.useCallback(async () => {
    if (restaurantRemovalIds.length === 0) {
      Alert.alert('Choose restaurants', 'Choose at least one restaurant to remove.');
      return;
    }
    if (!removalConfirmationMatches) {
      Alert.alert('Type the restaurant name', 'Type the restaurant name exactly as shown before removing it.');
      return;
    }
    setRemovingRestaurants(true);
    try {
      const result = await removeRestaurants(
        restaurantRemovalIds,
        normalizeConfirmationName(restaurantRemovalConfirmation),
      );
      await refreshOwnerRestaurants();
      const failed = result.results.filter((row) => !row.removed);
      const removed = result.results.filter((row) => row.removed);
      if (removed.length > 0) {
        setRestaurantRemovalOpen(false);
        setRestaurantRemovalConfirmation('');
      }

      if (failed.length > 0) {
        Alert.alert(
          'Some restaurants were not removed',
          `${removed.length} removed, ${failed.length} failed. ${failed[0]?.error ?? 'Please try again.'}`,
        );
        return;
      }

      const message = removed.length === 1
        ? 'The restaurant was removed. Its subscription will stop renewing at the end of the current billing period.'
        : `${removed.length} restaurants were removed. Their subscriptions will stop renewing at the end of the current billing period.`;

      if (result.remaining_restaurant_ids.length === 0) {
        Alert.alert('Restaurants removed', message, [
          {
            text: 'OK',
            onPress: async () => {
              await setAppShellPreference('customer');
              router.replace('/(customer)' as never);
            },
          },
        ]);
      } else {
        Alert.alert('Restaurants removed', message);
      }
    } catch (e: any) {
      Alert.alert('Removal failed', e?.message ?? 'Could not remove restaurants. Please try again.');
    } finally {
      setRemovingRestaurants(false);
    }
  }, [
    refreshOwnerRestaurants,
    removalConfirmationMatches,
    restaurantRemovalConfirmation,
    restaurantRemovalIds,
    router,
  ]);

  const confirmRestaurantRemoval = React.useCallback(() => {
    const count = restaurantRemovalIds.length;
    if (count === 0) {
      Alert.alert('Choose restaurants', 'Choose at least one restaurant to remove.');
      return;
    }
    if (!removalConfirmationMatches) {
      Alert.alert('Type the restaurant name', 'Type the restaurant name exactly as shown before removing it.');
      return;
    }
    Alert.alert(
      count === 1 ? 'Remove restaurant?' : `Remove ${count} restaurants?`,
      'Selected restaurants will be unpublished immediately. Subscriptions for those restaurants will stop renewing at the end of the current billing period.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: performRestaurantRemoval },
      ],
    );
  }, [performRestaurantRemoval, removalConfirmationMatches, restaurantRemovalIds.length]);

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      void (async () => {
        const cards = await getStoredRestaurantPaymentCards();
        if (!active) return;
        const defaultCard = cards.find((card) => card.isDefault) ?? cards[0];
        setPaymentMethodLabel(
          defaultCard ? `${defaultCard.brand} ···· ${defaultCard.last4}` : 'No card on file',
        );
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  useFocusEffect(
    React.useCallback(() => {
      let active = true;
      if (!selectedRestaurantId) {
        setBusinessHoursLabel('');
        setClosuresLabel('');
        return () => {
          active = false;
        };
      }
      void (async () => {
        const [hours, closures, roster] = await Promise.all([
          readBusinessHours(selectedRestaurantId),
          readClosures(selectedRestaurantId),
          fetchStaffRoster([selectedRestaurantId]),
        ]);
        if (!active) return;
        if (hours) {
          const openCount = BUSINESS_HOURS_DAY_KEYS.filter((k) => hours[k]?.open).length;
          setBusinessHoursLabel(openCount === 7 ? 'Mon–Sun' : openCount === 0 ? 'Closed' : `${openCount} days`);
        } else {
          setBusinessHoursLabel('');
        }
        setClosuresLabel(closures.length === 0 ? '' : `${closures.length} scheduled`);
        setStaffMembersLabel(roster.length === 0 ? '' : `${roster.length} member${roster.length === 1 ? '' : 's'}`);
      })();
      return () => {
        active = false;
      };
    }, [selectedRestaurantId]),
  );

  const sections: Section[] = [
    {
      title: 'App',
      rows: [
        {
          kind: 'nav',
          label: 'Switch to user side',
          icon: 'person-circle-outline',
          action: 'switch_to_customer',
        },
      ],
    },
    {
      title: 'Account',
      rows: [
        {
          kind: 'nav',
          label: 'Personal details',
          value: compactNameLabel(profile.fullName),
          icon: 'person-outline',
          route: '/(staff)/personal-details',
        },
        { kind: 'nav', label: 'Log out of all devices', icon: 'globe-outline' },
        {
          kind: 'nav',
          label: 'Password & security',
          icon: 'lock-closed-outline',
          route: '/(staff)/password-security',
        },
      ],
    },
    {
      title: 'Business',
      rows: [
        {
          kind: 'nav',
          label: 'Business hours',
          value: businessHoursLabel,
          icon: 'time-outline',
          route: '/(staff)/business-hours',
        },
        {
          kind: 'nav',
          label: 'Reservation settings',
          icon: 'calendar-outline',
          route: '/(staff)/reservation-settings',
        },
        {
          kind: 'nav',
          label: 'Holidays & closures',
          value: closuresLabel,
          icon: 'ban-outline',
          route: '/(staff)/closures',
        },
        {
          kind: 'nav',
          label: 'Currency',
          value: currencyLabel,
          icon: 'cash-outline',
        },
      ],
    },
    {
      title: 'Payments & Billing',
      rows: [
        {
          kind: 'nav',
          label: 'Payment method',
          value: paymentMethodLabel,
          icon: 'card-outline',
          route: '/(staff)/payment-method?source=settings',
        },
        {
          kind: 'nav',
          label: 'Billing history',
          icon: 'receipt-outline',
          route: '/(staff)/billing-history',
        },
        {
          kind: 'nav',
          label: 'Subscription plan',
          value: OWNER_MONTHLY_SUB_LABEL,
          icon: 'star-outline',
          route: '/(staff)/subscription-plan',
        },
      ],
    },
    {
      title: 'Team',
      rows: [
        {
          kind: 'nav',
          label: 'Staff members',
          value: staffMembersLabel,
          icon: 'people-outline',
          route: '/(staff)/staff-members',
        },
        {
          kind: 'nav',
          label: 'Roles & permissions',
          icon: 'shield-checkmark-outline',
          route: '/(staff)/roles-permissions',
        },
        {
          kind: 'nav',
          label: 'Staff PIN codes',
          icon: 'keypad-outline',
          route: '/(staff)/staff-pins',
        },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { kind: 'toggle', label: 'Push notifications', icon: 'notifications-outline', value: pushOn, onChange: setPushOn },
        { kind: 'toggle', label: 'Sound alerts', icon: 'volume-high-outline', value: soundOn, onChange: setSoundOn },
        { kind: 'toggle', label: 'Email digest', icon: 'mail-outline', value: emailDigest, onChange: setEmailDigest },
        { kind: 'nav', label: 'Quiet hours', icon: 'moon-outline', route: '/(staff)/quiet-hours' },
      ],
    },
    {
      title: 'App & Display',
      rows: [
        { kind: 'nav', label: 'Appearance', value: themeLabel(mode), icon: 'contrast-outline' },
      ],
    },
    {
      title: 'Support & Legal',
      rows: [
        { kind: 'nav', label: 'Support', icon: 'help-circle-outline', route: '/(staff)/support' },
        { kind: 'nav', label: 'Legal', icon: 'shield-outline', route: '/(staff)/legal' },
        { kind: 'nav', label: 'Rate Cenaiva', icon: 'heart-outline', route: '/(staff)/rate-cenaiva' },
      ],
    },
    {
      title: 'Danger Zone',
      rows: [
        { kind: 'nav', label: 'Log out', icon: 'log-out-outline', danger: true },
        ...(restaurants.length > 0
          ? [{
              kind: 'nav' as const,
              label: 'Remove restaurants',
              icon: 'business-outline',
              danger: true,
              action: 'remove_restaurants' as const,
            }]
          : []),
        {
          kind: 'nav',
          label: 'Delete account',
          icon: 'trash-outline',
          danger: true,
          action: 'delete_account',
        },
      ],
    },
  ];

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Settings"
          fallbackTab="more"
          accentBack
        />
      }
    >
      {sections.map((s) => (
        <SettingsSection
          key={s.title}
          section={s}
          restaurantCount={restaurants.length}
          onOpenRestaurantRemoval={openRestaurantRemoval}
        />
      ))}

      <RestaurantRemovalModal
        visible={restaurantRemovalOpen}
        restaurants={restaurants}
        selectedIds={restaurantRemovalIds}
        confirmationValue={restaurantRemovalConfirmation}
        confirmationTarget={removalConfirmationTarget}
        confirmationMatches={removalConfirmationMatches}
        removing={removingRestaurants}
        onCancel={() => {
          if (!removingRestaurants) {
            setRestaurantRemovalOpen(false);
            setRestaurantRemovalConfirmation('');
          }
        }}
        onConfirm={confirmRestaurantRemoval}
        onToggle={toggleRestaurantRemoval}
        onConfirmationChange={setRestaurantRemovalConfirmation}
      />
    </OwnerScreen>
  );
}
