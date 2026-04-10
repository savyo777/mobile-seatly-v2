import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import {
  KDS_TICKETS,
  OWNER_EVENTS,
  OWNER_PROMO_ROWS,
  STAFF_ROSTER,
  WAITLIST_ENTRIES,
} from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

type CommandItem = {
  key: string;
  label: string;
  subtitle?: string;
  href: string;
  icon: keyof typeof Ionicons.glyphMap;
  badge?: string;
};

function FeatureRow({
  item,
  onPress,
}: {
  item: CommandItem;
  onPress: (href: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(item.href)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.rowLeft}>
        <View style={styles.iconWrap}>
          <Ionicons name={item.icon} size={18} color={ownerColors.gold} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{item.label}</Text>
          {item.subtitle ? <Text style={styles.rowSubtitle}>{item.subtitle}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>
        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
        <Ionicons name="chevron-forward" size={18} color={ownerColors.textMuted} />
      </View>
    </Pressable>
  );
}

function PriorityCard({
  item,
  onPress,
}: {
  item: CommandItem;
  onPress: (href: string) => void;
}) {
  return (
    <Pressable onPress={() => onPress(item.href)} style={({ pressed }) => [styles.priorityCard, pressed && styles.pressed]}>
      <View style={styles.priorityTop}>
        <View style={styles.priorityIcon}>
          <Ionicons name={item.icon} size={20} color={ownerColors.gold} />
        </View>
        {item.badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{item.badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.priorityTitle}>{item.label}</Text>
      {item.subtitle ? <Text style={styles.prioritySub}>{item.subtitle}</Text> : null}
    </Pressable>
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

  return (
    <OwnerScreen>
      <Text style={styles.title}>Command Center</Text>
      <Text style={styles.sub}>Operations, guests, and business tools</Text>

      <GlassCard style={styles.summary}>
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{waitlistCount}</Text>
          <Text style={styles.summaryLabel}>Waitlist</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{openOrdersCount}</Text>
          <Text style={styles.summaryLabel}>Open orders</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryCell}>
          <Text style={styles.summaryValue}>{onShiftCount}</Text>
          <Text style={styles.summaryLabel}>On shift</Text>
        </View>
      </GlassCard>

      <Text style={styles.sectionTitle}>Tonight</Text>
      <Text style={styles.sectionSub}>Urgent operations first</Text>
      <View style={styles.priorityGrid}>
        {tonight.slice(0, 2).map((item) => (
          <PriorityCard key={item.key} item={item} onPress={(href) => router.push(href as never)} />
        ))}
      </View>
      <GlassCard style={styles.groupCard}>
        <FeatureRow item={tonight[2]} onPress={(href) => router.push(href as never)} />
      </GlassCard>

      <Text style={styles.sectionTitle}>Guests & Team</Text>
      <GlassCard style={styles.groupCard}>
        {guestsTeam.map((item, index) => (
          <View key={item.key}>
            <FeatureRow item={item} onPress={(href) => router.push(href as never)} />
            {index < guestsTeam.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}
      </GlassCard>

      <Text style={styles.sectionTitle}>Business</Text>
      <GlassCard style={styles.groupCard}>
        {business.map((item, index) => (
          <View key={item.key}>
            <FeatureRow item={item} onPress={(href) => router.push(href as never)} />
            {index < business.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}
      </GlassCard>

      <Text style={styles.sectionTitle}>System</Text>
      <GlassCard style={styles.groupCard}>
        {system.map((item, index) => (
          <View key={item.key}>
            <FeatureRow item={item} onPress={(href) => router.push(href as never)} />
            {index < system.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}
      </GlassCard>
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: 14,
  },
  summary: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 18,
    borderColor: 'rgba(212, 175, 55, 0.22)',
    backgroundColor: '#101115',
  },
  summaryCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    color: ownerColors.gold,
    fontSize: 22,
    fontWeight: '800',
    lineHeight: 26,
  },
  summaryLabel: {
    color: ownerColors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: ownerColors.border,
    marginVertical: 4,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 3,
    letterSpacing: 0.3,
  },
  sectionSub: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    marginBottom: 10,
  },
  priorityGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  priorityCard: {
    flex: 1,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.28)',
    backgroundColor: '#111215',
    padding: 12,
  },
  priorityTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priorityIcon: {
    width: 34,
    height: 34,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  priorityTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 4,
  },
  prioritySub: {
    fontSize: 12,
    color: ownerColors.textMuted,
    lineHeight: 17,
  },
  groupCard: {
    marginBottom: 16,
    paddingVertical: 4,
    backgroundColor: '#101115',
    borderColor: 'rgba(255,255,255,0.08)',
  },
  row: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.goldSubtle,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    minWidth: 0,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: ownerColors.text,
  },
  rowSubtitle: {
    fontSize: 12,
    color: ownerColors.textMuted,
    marginTop: 2,
  },
  rowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: ownerRadii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.45)',
    backgroundColor: ownerColors.goldSubtle,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: ownerColors.gold,
  },
  separator: {
    height: 1,
    backgroundColor: ownerColors.border,
    marginHorizontal: 12,
  },
  pressed: {
    opacity: 0.88,
  },
});
