import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useColors, useTheme, createStyles, spacing, borderRadius, type ThemeMode } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { compactNameLabel, resolveAuthDisplayProfile } from '@/lib/auth/displayProfile';
import { deleteAccount, signOutAllDevices } from '@/lib/services/accountSecurity';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';
import { withOwnerReturnTarget } from '@/lib/navigation/ownerReturnTargets';
import { getStoredRestaurantPaymentCards } from '@/lib/storage/restaurantPaymentMethod';

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
      action?: 'switch_to_customer';
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

function SettingsSection({ section }: { section: Section }) {
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
    } else if (item.label === 'Delete account') {
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
    } else if (item.action === 'switch_to_customer') {
      void (async () => {
        await setAppShellPreference('customer');
        router.replace('/(customer)' as never);
      })();
    } else if (item.route) {
      router.push(withOwnerReturnTarget(item.route, 'settings') as never);
    } else {
      Alert.alert(item.label, 'Coming soon.');
    }
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
          value: 'Mon–Sun',
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
          value: '2 scheduled',
          icon: 'ban-outline',
          route: '/(staff)/closures',
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
          value: '5 members',
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
        { kind: 'nav', label: 'Language', value: 'English', icon: 'language-outline' },
      ],
    },
    {
      title: 'Support & Legal',
      rows: [
        { kind: 'nav', label: 'Support', icon: 'help-circle-outline', route: '/(staff)/support' },
        { kind: 'nav', label: 'Legal', icon: 'shield-outline', route: '/(staff)/legal' },
        { kind: 'nav', label: 'Rate Seatly', icon: 'heart-outline', route: '/(staff)/rate-seatly' },
      ],
    },
    {
      title: 'Danger Zone',
      rows: [
        { kind: 'nav', label: 'Log out', icon: 'log-out-outline', danger: true },
        { kind: 'nav', label: 'Delete account', icon: 'trash-outline', danger: true },
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
        <SettingsSection key={s.title} section={s} />
      ))}

    </OwnerScreen>
  );
}
