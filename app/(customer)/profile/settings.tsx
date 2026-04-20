import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper, Button } from '@/components/ui';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';
import { ProfileQuickActions } from '@/components/profile/ProfileQuickActions';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

type SettingsRowDef = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: keyof typeof import('@/lib/i18n/locales/en').default.profile;
  subtitleKey?: keyof typeof import('@/lib/i18n/locales/en').default.profile;
  href: Href;
};

export default function SettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const accountRows: SettingsRowDef[] = useMemo(
    () => [
      { icon: 'person-outline', titleKey: 'personalInfo', subtitleKey: 'personalInfoSub', href: '/(customer)/profile/personal-info' },
      { icon: 'card-outline', titleKey: 'paymentMethods', subtitleKey: 'paymentMethodsSub', href: '/(customer)/profile/payment' },
      { icon: 'notifications-outline', titleKey: 'notifications', subtitleKey: 'notificationsSub', href: '/(customer)/profile/notifications' },
      { icon: 'shield-checkmark-outline', titleKey: 'privacySecurity', href: '/(customer)/profile/privacy' },
    ],
    [],
  );

  const generalRows: SettingsRowDef[] = useMemo(
    () => [
      { icon: 'bookmark-outline', titleKey: 'savedRestaurants', href: '/(customer)/profile/saved' },
      { icon: 'calendar-outline', titleKey: 'bookings' as any, href: '/(customer)/activity' },
      { icon: 'star-outline', titleKey: 'loyalty' as any, href: '/(customer)/loyalty' },
      { icon: 'pricetag-outline', titleKey: 'promotions', href: '/(customer)/profile/promotions' },
      { icon: 'people-outline', titleKey: 'inviteFriends', href: '/(customer)/profile/invite' },
    ],
    [],
  );

  const supportRows: SettingsRowDef[] = useMemo(
    () => [
      { icon: 'help-circle-outline', titleKey: 'help', href: '/(customer)/profile/help' },
      { icon: 'information-circle-outline', titleKey: 'about', href: '/(customer)/profile/about' },
    ],
    [],
  );

  return (
    <ScreenWrapper scrollable padded>
      {/* Back header */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ProfileQuickActions onNavigate={(href) => router.push(href)} />

      <SectionHeader title={t('profile.sectionAccount')} />
      <View style={styles.group}>
        {accountRows.map((row, i) => renderRow(row, i, accountRows.length, t, router))}
      </View>

      <SectionHeader title={t('profile.sectionGeneral')} />
      <View style={styles.group}>
        {generalRows.map((row, i) => renderRow(row, i, generalRows.length, t, router))}
      </View>

      <SectionHeader title={t('profile.sectionSupport')} />
      <View style={styles.group}>
        {supportRows.map((row, i) => renderRow(row, i, supportRows.length, t, router))}
      </View>

      <View style={styles.logoutWrap}>
        <Button
          title={t('common.logout')}
          onPress={() => router.replace('/(auth)/login' as Href)}
          variant="dangerSoft"
          size="sm"
          fullWidth
        />
      </View>
    </ScreenWrapper>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function renderRow(
  row: SettingsRowDef,
  index: number,
  total: number,
  t: (key: string) => string,
  router: ReturnType<typeof useRouter>,
) {
  const isLast = index === total - 1;
  const label = (row.titleKey as string) === 'bookings'
    ? 'Bookings'
    : (row.titleKey as string) === 'loyalty'
    ? 'Loyalty'
    : t(`profile.${row.titleKey}`);

  return (
    <Pressable
      key={`${String(row.titleKey)}-${index}`}
      onPress={() => router.push(row.href)}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <Ionicons name={row.icon} size={22} color={colors.gold} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{label}</Text>
        {row.subtitleKey ? <Text style={styles.rowSub}>{t(`profile.${row.subtitleKey}`)}</Text> : null}
      </View>
      <ChevronGlyph color={colors.textMuted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  sectionHeader: {
    ...typography.label,
    fontSize: 12,
    letterSpacing: 0.8,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
    textTransform: 'uppercase',
  },
  group: {
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.04)',
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rowIcon: {
    width: 28,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowTitle: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  rowSub: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: 3,
  },
  logoutWrap: {
    marginTop: spacing['2xl'],
    paddingTop: spacing.lg,
    paddingBottom: spacing['4xl'],
  },
});
