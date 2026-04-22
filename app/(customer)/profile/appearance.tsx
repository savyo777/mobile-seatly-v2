import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { useTheme, useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import type { ThemeMode } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  group: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  rowPressed: {
    backgroundColor: c.bgElevated,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  rowTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  rowSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 3,
  },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkFilled: {
    backgroundColor: c.gold,
  },
  hint: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
    lineHeight: 19,
    paddingHorizontal: spacing.lg,
  },
}));

type Option = {
  mode: ThemeMode;
  label: string;
  subtitle?: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

export default function AppearanceScreen() {
  const { t } = useTranslation();
  const { mode, setMode } = useTheme();
  const c = useColors();
  const styles = useStyles();

  const options: Option[] = [
    { mode: 'light', label: t('profile.appearanceLight'), icon: 'sunny-outline' },
    { mode: 'dark', label: t('profile.appearanceDark'), icon: 'moon-outline' },
    { mode: 'system', label: t('profile.appearanceSystem'), subtitle: t('profile.appearanceSystemSub'), icon: 'phone-portrait-outline' },
  ];

  return (
    <ProfileStackScreen title={t('profile.appearance')} subtitle={t('profile.appearanceSub')}>
      <View style={styles.group}>
        {options.map((opt, i) => (
          <Pressable
            key={opt.mode}
            onPress={() => setMode(opt.mode)}
            style={({ pressed }) => [
              styles.row,
              i < options.length - 1 && styles.rowBorder,
              pressed && styles.rowPressed,
            ]}
          >
            <View style={styles.iconWrap}>
              <Ionicons name={opt.icon} size={20} color={c.textSecondary} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.rowTitle}>{opt.label}</Text>
              {opt.subtitle ? <Text style={styles.rowSub}>{opt.subtitle}</Text> : null}
            </View>
            <View style={[styles.check, mode === opt.mode && styles.checkFilled]}>
              {mode === opt.mode && (
                <Ionicons name="checkmark" size={13} color={c.bgBase} />
              )}
            </View>
          </Pressable>
        ))}
      </View>
      <Text style={styles.hint}>
        Changes take effect immediately across all screens.
      </Text>
    </ProfileStackScreen>
  );
}
