import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { OwnerSectionLabel } from '@/components/owner/OwnerSectionLabel';
import {
  KDS_TICKETS,
  OWNER_EVENTS,
  OWNER_PROMO_ROWS,
  STAFF_ROSTER,
  WAITLIST_ENTRIES,
} from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

type CommandItem = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
};

function Row({
  item,
  onPress,
  showDivider,
}: {
  item: CommandItem;
  onPress: (href: string) => void;
  showDivider?: boolean;
}) {
  return (
    <>
      {showDivider ? <View style={styles.divider} /> : null}
      <Pressable onPress={() => onPress(item.href)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Ionicons name={item.icon} size={20} color={ownerColors.textSecondary} style={styles.rowIcon} />
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
        </View>
        <View style={styles.rowRight}>
          {item.badge ? (
            <Text style={styles.badgeMuted} numberOfLines={1}>
              {item.badge}
            </Text>
          ) : null}
          <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} />
        </View>
      </Pressable>
    </>
  );
}

export default function OwnerMoreScreen() {
  const router = useRouter();
  const waitlistCount = WAITLIST_ENTRIES.length;
  const openOrdersCount = KDS_TICKETS.filter((t) => t.status !== 'ready').length;
  const onShiftCount = STAFF_ROSTER.filter((s) => s.onClock).length;
  const activePromotions = OWNER_PROMO_ROWS.filter((p) => p.active).length;
  const upcomingEvents = OWNER_EVENTS.filter((e) => e.status !== 'draft').length;

  const tonight: CommandItem[] = [
    {
      key: 'waitlist',
      label: 'Waitlist',
      subtitle: 'Live queue and quoted times',
      href: '/(staff)/waitlist',
      icon: 'hourglass-outline',
      badge: String(waitlistCount),
    },
    {
      key: 'ordersKds',
      label: 'Orders & KDS',
      subtitle: 'Open tickets and kitchen flow',
      href: '/(staff)/ordersKds',
      icon: 'restaurant-outline',
      badge: String(openOrdersCount),
    },
    {
      key: 'floor',
      label: 'Floor',
      subtitle: 'Live tables and seating status',
      href: '/(staff)/floor',
      icon: 'grid-outline',
    },
  ];
  const guestsTeam: CommandItem[] = [
    {
      key: 'crm',
      label: 'CRM',
      subtitle: 'VIP guests and preferences',
      href: '/(staff)/crm',
      icon: 'heart-outline',
    },
    {
      key: 'staff',
      label: 'Staff',
      subtitle: `${onShiftCount} on shift`,
      href: '/(staff)/staff',
      icon: 'people-outline',
      badge: String(onShiftCount),
    },
    {
      key: 'schedule',
      label: 'Schedule & clock',
      subtitle: 'Shifts, coverage, and time',
      href: '/(staff)/schedule',
      icon: 'time-outline',
    },
  ];
  const business: CommandItem[] = [
    {
      key: 'analytics',
      label: 'Analytics',
      subtitle: 'Revenue, performance, trends',
      href: '/(staff)/analytics',
      icon: 'bar-chart-outline',
    },
    {
      key: 'expenses',
      label: 'Expenses',
      subtitle: 'Cost lines and margins',
      href: '/(staff)/expenses',
      icon: 'wallet-outline',
    },
    {
      key: 'export',
      label: 'Export',
      subtitle: 'Reports and data out',
      href: '/(staff)/export',
      icon: 'download-outline',
    },
    {
      key: 'promotions',
      label: 'Promotions',
      subtitle: `${activePromotions} active`,
      href: '/(staff)/promotions',
      icon: 'pricetag-outline',
      badge: String(activePromotions),
    },
    {
      key: 'events',
      label: 'Events',
      subtitle: `${upcomingEvents} upcoming`,
      href: '/(staff)/events',
      icon: 'calendar-outline',
      badge: String(upcomingEvents),
    },
  ];
  const system: CommandItem[] = [
    {
      key: 'settings',
      label: 'Settings',
      subtitle: 'Notifications and account controls',
      href: '/(staff)/settings',
      icon: 'settings-outline',
    },
    {
      key: 'ai',
      label: 'AI',
      subtitle: 'Service intelligence and actions',
      href: '/(staff)/ai',
      icon: 'sparkles-outline',
    },
    {
      key: 'customer',
      label: 'Switch to Customer View',
      subtitle: 'Open guest-facing experience',
      href: '/(customer)/discover',
      icon: 'swap-horizontal-outline',
    },
  ];

  const push = (href: string) => router.push(href as never);

  return (
    <OwnerScreen>
      <Text style={styles.title}>Command Center</Text>
      <Text style={styles.sub}>Operations, guests, and business tools</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{waitlistCount}</Text>
          <Text style={styles.statLabel}>Waitlist</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{openOrdersCount}</Text>
          <Text style={styles.statLabel}>Open orders</Text>
        </View>
        <View style={styles.statSep} />
        <View style={styles.stat}>
          <Text style={styles.statValue}>{onShiftCount}</Text>
          <Text style={styles.statLabel}>On shift</Text>
        </View>
      </View>

      <OwnerSectionLabel marginTop={ownerSpace.md}>Tonight</OwnerSectionLabel>
      <View style={styles.list}>
        {tonight.map((item, i) => (
          <Row key={item.key} item={item} onPress={push} showDivider={i > 0} />
        ))}
      </View>

      <OwnerSectionLabel marginTop={ownerSpace.lg}>Guests & team</OwnerSectionLabel>
      <View style={styles.list}>
        {guestsTeam.map((item, i) => (
          <Row key={item.key} item={item} onPress={push} showDivider={i > 0} />
        ))}
      </View>

      <OwnerSectionLabel marginTop={ownerSpace.lg}>Business</OwnerSectionLabel>
      <View style={styles.list}>
        {business.map((item, i) => (
          <Row key={item.key} item={item} onPress={push} showDivider={i > 0} />
        ))}
      </View>

      <OwnerSectionLabel marginTop={ownerSpace.lg}>System</OwnerSectionLabel>
      <View style={styles.list}>
        {system.map((item, i) => (
          <Row key={item.key} item={item} onPress={push} showDivider={i > 0} />
        ))}
      </View>

      <View style={{ height: ownerSpace.md }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.md,
    fontWeight: '500',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: ownerSpace.sm,
    paddingVertical: ownerSpace.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ownerColors.border,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: ownerSpace.xs,
  },
  statSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: ownerColors.border,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: ownerColors.text,
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: ownerColors.textMuted,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  list: {
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
    overflow: 'hidden',
    marginBottom: ownerSpace.xs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: ownerColors.border,
    marginLeft: ownerSpace.md + 20 + ownerSpace.sm,
  },
  row: {
    minHeight: 56,
    paddingHorizontal: ownerSpace.md,
    paddingVertical: ownerSpace.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowIcon: {
    marginRight: ownerSpace.sm,
    width: 24,
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
  },
  rowSubtitle: {
    fontSize: 13,
    color: ownerColors.textMuted,
    marginTop: 2,
    fontWeight: '500',
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ownerSpace.sm,
    marginLeft: ownerSpace.sm,
  },
  badgeMuted: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
  },
  pressed: {
    opacity: 0.88,
    backgroundColor: ownerColors.bgGlass,
  },
});
