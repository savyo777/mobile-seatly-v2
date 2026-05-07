import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Row = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description: string;
  onPress: () => void;
  value?: string;
};

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: {
    ...typography.h2,
    color: c.textPrimary,
  },
  introText: {
    ...typography.body,
    color: c.textMuted,
    lineHeight: 22,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rowPressed: { backgroundColor: c.bgElevated },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  rowText: { flex: 1, gap: 2 },
  rowLabel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  rowDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  rowValue: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
}));

export default function PasswordSecurityScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  const rows: Row[] = [
    {
      icon: 'lock-closed-outline',
      label: 'Change password',
      description: 'Update the password for this restaurant account.',
      onPress: () => router.push('/(staff)/security/change-password' as never),
    },
    {
      icon: 'mail-outline',
      label: 'Change email',
      description: 'Update the email used to sign in.',
      onPress: () => router.push('/(staff)/security/change-email' as never),
    },
    {
      icon: 'shield-checkmark-outline',
      label: 'Two-factor authentication',
      description: 'Add a second step at sign-in for extra protection.',
      onPress: () => router.push('/(staff)/two-factor' as never),
    },
    {
      icon: 'phone-portrait-outline',
      label: 'Active sessions',
      description: 'Devices that are currently signed in.',
      onPress: () => router.push('/(staff)/active-sessions' as never),
    },
  ];

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Password & security"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Keep your restaurant safe</Text>
        <Text style={styles.introText}>
          Manage how you sign in and protect your account.
        </Text>
      </View>

      <View style={styles.card}>
        {rows.map((r, i) => (
          <Pressable
            key={r.label}
            onPress={r.onPress}
            style={({ pressed }) => [
              styles.row,
              i > 0 && styles.rowDivider,
              pressed && styles.rowPressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={r.label}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={r.icon} size={18} color={c.gold} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{r.label}</Text>
              <Text style={styles.rowDesc} numberOfLines={2}>
                {r.description}
              </Text>
            </View>
            {r.value ? <Text style={styles.rowValue}>{r.value}</Text> : null}
            <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
          </Pressable>
        ))}
      </View>
    </OwnerScreen>
  );
}
