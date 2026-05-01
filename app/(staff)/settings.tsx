import React from 'react';
import { View, Text, Switch, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useColors, useTheme, createStyles, spacing, borderRadius, type ThemeMode } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { deleteAccount, signOutAllDevices } from '@/lib/services/accountSecurity';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';

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
      router.push(item.route as never);
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

  const [pushOn, setPushOn] = React.useState(true);
  const [soundOn, setSoundOn] = React.useState(true);
  const [emailDigest, setEmailDigest] = React.useState(true);

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
        { kind: 'nav', label: 'Personal details', value: 'Mark H.', icon: 'person-outline' },
        { kind: 'nav', label: 'Log out of all devices', icon: 'globe-outline' },
        { kind: 'nav', label: 'Password & security', icon: 'lock-closed-outline' },
        { kind: 'nav', label: 'Face ID / Touch ID', value: 'Enabled', icon: 'finger-print-outline' },
      ],
    },
    {
      title: 'Account Security',
      rows: [
        { kind: 'nav', label: 'Change Password', icon: 'lock-closed-outline', route: '/(staff)/security/change-password' },
        { kind: 'nav', label: 'Change Email', icon: 'mail-outline', route: '/(staff)/security/change-email' },
      ],
    },
    {
      title: 'Business',
      rows: [
        { kind: 'nav', label: 'Business hours', value: 'Mon–Sun', icon: 'time-outline' },
        { kind: 'nav', label: 'Reservation settings', value: 'Max 10 · 60d window', icon: 'calendar-outline' },
        { kind: 'nav', label: 'Holiday & closures', value: 'None scheduled', icon: 'ban-outline' },
      ],
    },
    {
      title: 'Payments & Billing',
      rows: [
        { kind: 'nav', label: 'Payout method', value: 'Stripe · ···· 4429', icon: 'card-outline' },
        { kind: 'nav', label: 'Billing history', icon: 'receipt-outline' },
        { kind: 'nav', label: 'Subscription plan', value: 'Pro', icon: 'star-outline' },
      ],
    },
    {
      title: 'Team',
      rows: [
        { kind: 'nav', label: 'Staff members', value: '5 members', icon: 'people-outline' },
        { kind: 'nav', label: 'Roles & permissions', icon: 'shield-checkmark-outline' },
        { kind: 'nav', label: 'Staff PIN codes', icon: 'keypad-outline' },
      ],
    },
    {
      title: 'Notifications',
      rows: [
        { kind: 'toggle', label: 'Push notifications', icon: 'notifications-outline', value: pushOn, onChange: setPushOn },
        { kind: 'toggle', label: 'Sound alerts', icon: 'volume-high-outline', value: soundOn, onChange: setSoundOn },
        { kind: 'toggle', label: 'Email digest', icon: 'mail-outline', value: emailDigest, onChange: setEmailDigest },
        { kind: 'nav', label: 'Quiet hours', value: 'Off', icon: 'moon-outline' },
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
        { kind: 'nav', label: 'Help & support', icon: 'help-circle-outline' },
        { kind: 'nav', label: 'Privacy policy', icon: 'shield-outline' },
        { kind: 'nav', label: 'Terms of service', icon: 'document-outline' },
        { kind: 'nav', label: 'Rate Seatly', icon: 'heart-outline' },
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
          onBack={() => router.replace('/(staff)/profile' as never)}
        />
      }
    >
      {sections.map((s) => (
        <SettingsSection key={s.title} section={s} />
      ))}

    </OwnerScreen>
  );
}
