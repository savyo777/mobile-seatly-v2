import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Href } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { profileDisplayUser } from '@/lib/mock/profileDisplayUser';
import { mockCustomer } from '@/lib/mock/users';
import { mockReservations } from '@/lib/mock/reservations';
import { listSnapPostsByUser } from '@/lib/mock/snaps';
import { listCollections } from '@/lib/mock/collections';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';

const ME = mockCustomer.id;
const GUEST_ID = 'g1';

function getUpcomingCount() {
  const active = ['pending', 'confirmed', 'seated'];
  return mockReservations.filter(
    (r) => r.guestId === GUEST_ID && active.includes(r.status),
  ).length;
}

type RowDef = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sub?: string;
  href: Href;
  badge?: string;
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = profileDisplayUser;
  const upcomingCount = getUpcomingCount();
  const postCount = listSnapPostsByUser(ME).length;
  const collectionsCount = listCollections(ME).length;

  const activityRows: RowDef[] = [
    {
      icon: 'calendar-outline',
      label: 'My Bookings',
      sub: upcomingCount > 0 ? `${upcomingCount} upcoming` : 'No upcoming reservations',
      href: '/(customer)/activity',
      badge: upcomingCount > 0 ? String(upcomingCount) : undefined,
    },
    {
      icon: 'receipt-outline',
      label: 'Orders',
      sub: 'Past orders & receipts',
      href: '/(customer)/orders',
    },
    {
      icon: 'star-outline',
      label: 'Loyalty & Rewards',
      sub: `${user.loyaltyPointsBalance?.toLocaleString() ?? 0} points · ${user.loyaltyTier ?? 'Member'}`,
      href: '/(customer)/loyalty',
    },
    {
      icon: 'bookmark-outline',
      label: 'Saved Restaurants',
      href: '/(customer)/profile/saved',
    },
    {
      icon: 'albums-outline',
      label: 'Collections',
      sub: `${collectionsCount} list${collectionsCount !== 1 ? 's' : ''}`,
      href: '/(customer)/profile/collections',
    },
    {
      icon: 'images-outline',
      label: 'My Food Posts',
      sub: `${postCount} post${postCount !== 1 ? 's' : ''}`,
      href: '/(customer)/profile/my-snaps',
    },
  ];

  const accountRows: RowDef[] = [
    { icon: 'person-outline', label: 'Personal Info', href: '/(customer)/profile/personal-info' },
    { icon: 'card-outline', label: 'Payment Methods', href: '/(customer)/profile/payment' },
    { icon: 'notifications-outline', label: 'Notifications', href: '/(customer)/profile/notifications' },
    { icon: 'shield-checkmark-outline', label: 'Privacy & Security', href: '/(customer)/profile/privacy' },
    { icon: 'help-circle-outline', label: 'Help', href: '/(customer)/profile/help' },
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + 100 }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.avatarWrap}>
          {user.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]}>
              <Ionicons name="person" size={32} color={colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.headerText}>
          <Text style={styles.name}>{user.fullName}</Text>
          <Text style={styles.email}>{user.email}</Text>
          <Pressable
            onPress={() => router.push('/(customer)/profile/personal-info' as Href)}
            hitSlop={8}
            style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
          >
            <Text style={styles.editLink}>Edit profile</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => router.push('/(customer)/profile/settings' as Href)}
          hitSlop={10}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Ionicons name="settings-outline" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* Quick stat pills */}
      <View style={styles.statsRow}>
        <StatPill
          icon="calendar"
          value={upcomingCount}
          label="Upcoming"
          onPress={() => router.push('/(customer)/activity' as Href)}
        />
        <StatPill
          icon="star"
          value={user.loyaltyPointsBalance ?? 0}
          label="Points"
          onPress={() => router.push('/(customer)/loyalty' as Href)}
        />
        <StatPill
          icon="images"
          value={postCount}
          label="Posts"
          onPress={() => router.push('/(customer)/profile/my-snaps' as Href)}
        />
      </View>

      {/* Activity section */}
      <Text style={styles.sectionLabel}>Activity</Text>
      <View style={styles.group}>
        {activityRows.map((row, i) => (
          <Row key={row.label} row={row} isLast={i === activityRows.length - 1} router={router} />
        ))}
      </View>

      {/* Account section */}
      <Text style={styles.sectionLabel}>Account</Text>
      <View style={styles.group}>
        {accountRows.map((row, i) => (
          <Row key={row.label} row={row} isLast={i === accountRows.length - 1} router={router} />
        ))}
      </View>

      {/* Logout */}
      <Pressable
        onPress={() => router.replace('/(auth)/login' as Href)}
        style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.logoutText}>{t('common.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatPill({
  icon,
  value,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: number;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.statPill, pressed && { opacity: 0.75 }]}
    >
      <Ionicons name={icon} size={18} color={colors.gold} />
      <Text style={styles.statValue}>{value.toLocaleString()}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

function Row({
  row,
  isLast,
  router,
}: {
  row: RowDef;
  isLast: boolean;
  router: ReturnType<typeof useRouter>;
}) {
  return (
    <Pressable
      onPress={() => router.push(row.href)}
      style={({ pressed }) => [styles.row, !isLast && styles.rowBorder, pressed && styles.rowPressed]}
    >
      <View style={styles.rowIconWrap}>
        <Ionicons name={row.icon} size={20} color={colors.gold} />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{row.label}</Text>
        {row.sub ? <Text style={styles.rowSub}>{row.sub}</Text> : null}
      </View>
      {row.badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{row.badge}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },
  content: { paddingHorizontal: spacing.lg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  avatarWrap: {
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: 36,
    padding: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  name: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  email: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  editLink: { ...typography.bodySmall, color: colors.gold, fontWeight: '600', marginTop: spacing.xs },

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  statPill: {
    flex: 1,
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.md,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '700', color: colors.textPrimary },
  statLabel: { ...typography.bodySmall, color: colors.textMuted },

  // Section
  sectionLabel: {
    ...typography.label,
    color: colors.textMuted,
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  group: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.xl,
    overflow: 'hidden',
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
    borderBottomColor: colors.border,
  },
  rowPressed: { backgroundColor: 'rgba(255,255,255,0.04)' },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(201,168,76,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { ...typography.body, fontWeight: '600', color: colors.textPrimary },
  rowSub: { ...typography.bodySmall, color: colors.textMuted, marginTop: 2 },
  badge: {
    backgroundColor: colors.gold,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 11, fontWeight: '700', color: colors.bgBase },

  // Logout
  logoutBtn: {
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  logoutText: { ...typography.body, color: colors.danger, fontWeight: '600' },
});
