import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ScreenWrapper, Button } from '@/components/ui';
import { profileDisplayUser } from '@/lib/mock/profileDisplayUser';
import { ProfileQuickActions } from '@/components/profile/ProfileQuickActions';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import { useRouter, type Href } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ChevronGlyph } from '@/components/ui/ChevronGlyph';

type SettingsRowDef = {
  icon: keyof typeof Ionicons.glyphMap;
  titleKey: keyof typeof import('@/lib/i18n/locales/en').default.profile;
  subtitleKey?: keyof typeof import('@/lib/i18n/locales/en').default.profile;
  href: Href;
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const user = profileDisplayUser;

  const accountRows: SettingsRowDef[] = useMemo(
    () => [
      {
        icon: 'person-outline',
        titleKey: 'personalInfo',
        subtitleKey: 'personalInfoSub',
        href: '/(customer)/profile/personal-info',
      },
      {
        icon: 'card-outline',
        titleKey: 'paymentMethods',
        subtitleKey: 'paymentMethodsSub',
        href: '/(customer)/profile/payment',
      },
      {
        icon: 'notifications-outline',
        titleKey: 'notifications',
        subtitleKey: 'notificationsSub',
        href: '/(customer)/profile/notifications',
      },
      {
        icon: 'shield-checkmark-outline',
        titleKey: 'privacySecurity',
        href: '/(customer)/profile/privacy',
      },
    ],
    [],
  );

  const generalRows: SettingsRowDef[] = useMemo(
    () => [
      { icon: 'bookmark-outline', titleKey: 'savedRestaurants', href: '/(customer)/profile/saved' },
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

  const handleLogout = () => {
    router.replace('/(auth)/login' as Href);
  };

  return (
    <ScreenWrapper scrollable padded>
      <View style={styles.page}>
        <View style={styles.header}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={32} color={colors.textMuted} />
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>
              {user.fullName}
            </Text>
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
            <Pressable
              onPress={() => router.push('/(customer)/profile/personal-info' as Href)}
              hitSlop={8}
              style={({ pressed }) => [styles.editLink, pressed && styles.editPressed]}
              accessibilityRole="button"
              accessibilityLabel={t('profile.editProfile')}
            >
              <Text style={styles.editLinkText}>{t('profile.editProfile')}</Text>
            </Pressable>
          </View>
          <Pressable
            onPress={() => router.push('/(customer)/discover/post-review/camera')}
            style={({ pressed }) => [styles.snapPlusBtn, pressed && styles.snapPlusPressed]}
            accessibilityRole="button"
            accessibilityLabel="Create a snap"
          >
            <Ionicons name="add" size={20} color={colors.goldLight} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => router.push('/(customer)/profile/my-snaps' as Href)}
          style={({ pressed }) => [styles.mySnapsNav, pressed && styles.mySnapsNavPressed]}
          accessibilityRole="button"
          accessibilityLabel={t('profile.mySnaps')}
        >
          <Text style={styles.mySnapsNavText}>{t('profile.mySnaps')}</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.goldLight} />
        </Pressable>

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
            onPress={handleLogout}
            variant="dangerSoft"
            size="sm"
            fullWidth
          />
        </View>
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
  return (
    <Pressable
      key={`${String(row.titleKey)}-${index}`}
      onPress={() => router.push(row.href)}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
      accessibilityRole="button"
    >
      <Ionicons name={row.icon} size={22} color={colors.gold} style={styles.rowIcon} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>{t(`profile.${row.titleKey}`)}</Text>
        {row.subtitleKey ? <Text style={styles.rowSub}>{t(`profile.${row.subtitleKey}`)}</Text> : null}
      </View>
      <ChevronGlyph color={colors.textMuted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    paddingBottom: spacing['3xl'],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.md,
    paddingTop: spacing.xs,
  },
  mySnapsNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  mySnapsNavPressed: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  mySnapsNavText: {
    ...typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: colors.goldLight,
  },
  snapPlusBtn: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.8)',
    backgroundColor: 'rgba(201, 168, 76, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
  },
  snapPlusPressed: {
    opacity: 0.78,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.bgElevated,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  email: {
    ...typography.bodySmall,
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  editLink: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingVertical: 2,
  },
  editPressed: {
    opacity: 0.7,
  },
  editLinkText: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '600',
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
  },
});
