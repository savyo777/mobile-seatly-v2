import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type RoleId = 'manager' | 'host' | 'server' | 'kitchen';

type Role = {
  id: RoleId;
  name: string;
  blurb: string;
  count: number;
};

type Permission = {
  key: string;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ROLES: Role[] = [
  { id: 'manager', name: 'Manager', blurb: 'Runs the floor and the back-office.', count: 1 },
  { id: 'host', name: 'Host', blurb: 'Greets guests and seats tables.', count: 1 },
  { id: 'server', name: 'Server', blurb: 'Takes orders and runs payments.', count: 1 },
  { id: 'kitchen', name: 'Kitchen', blurb: 'Sees orders, marks dishes ready.', count: 1 },
];

const PERMISSIONS: Permission[] = [
  { key: 'reservations', label: 'View and edit reservations', description: 'See bookings, change times, seat guests.', icon: 'calendar-outline' },
  { key: 'guests', label: 'Access guest CRM', description: 'View guest profiles, notes, and history.', icon: 'people-outline' },
  { key: 'menu', label: 'Edit the menu', description: 'Add, hide, or change dishes and prices.', icon: 'restaurant-outline' },
  { key: 'promos', label: 'Create promotions', description: 'Launch and edit deals or offers.', icon: 'pricetag-outline' },
  { key: 'payouts', label: 'See payouts & billing', description: 'View revenue, invoices, payment methods.', icon: 'card-outline' },
  { key: 'staff', label: 'Manage team', description: 'Invite or remove staff members.', icon: 'shield-checkmark-outline' },
];

const DEFAULT_PERMS: Record<RoleId, Record<string, boolean>> = {
  manager: { reservations: true, guests: true, menu: true, promos: true, payouts: true, staff: true },
  host:    { reservations: true, guests: true, menu: false, promos: false, payouts: false, staff: false },
  server:  { reservations: true, guests: true, menu: false, promos: false, payouts: false, staff: false },
  kitchen: { reservations: false, guests: false, menu: true, promos: false, payouts: false, staff: false },
};

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  rolesScroll: { marginBottom: spacing.lg },
  rolesRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: 2,
    paddingRight: spacing.lg,
  },
  roleChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    minWidth: 126,
    gap: 2,
  },
  roleChipActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  roleChipName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  roleChipNameActive: { color: c.gold },
  roleChipMeta: {
    ...typography.bodySmall,
    color: c.textMuted,
  },

  blurb: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: 4,
  },

  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 64,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  permIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  permText: { flex: 1, gap: 2 },
  permTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  permDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },

  resetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: spacing.md,
  },
  resetText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));

export default function RolesPermissionsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

  const [activeRole, setActiveRole] = useState<RoleId>('manager');
  const [perms, setPerms] = useState<Record<RoleId, Record<string, boolean>>>(DEFAULT_PERMS);

  const togglePerm = (key: string, next: boolean) => {
    setPerms((prev) => ({
      ...prev,
      [activeRole]: { ...prev[activeRole], [key]: next },
    }));
  };

  const resetRole = () => {
    setPerms((prev) => ({ ...prev, [activeRole]: DEFAULT_PERMS[activeRole] }));
  };

  const role = ROLES.find((r) => r.id === activeRole)!;

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Roles & permissions"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>What each role can do</Text>
        <Text style={styles.introText}>
          Pick a role to see and adjust what those team members can access.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.rolesScroll}
        contentContainerStyle={styles.rolesRow}
      >
        {ROLES.map((r) => {
          const active = activeRole === r.id;
          return (
            <Pressable
              key={r.id}
              onPress={() => setActiveRole(r.id)}
              style={[styles.roleChip, active && styles.roleChipActive]}
            >
              <Text style={[styles.roleChipName, active && styles.roleChipNameActive]}>
                {r.name}
              </Text>
              <Text style={styles.roleChipMeta}>
                {r.count} {r.count === 1 ? 'member' : 'members'}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={styles.blurb}>{role.blurb}</Text>

      <View style={styles.card}>
        {PERMISSIONS.map((p, i) => (
          <View key={p.key} style={[styles.permRow, i > 0 && styles.rowDivider]}>
            <View style={styles.permIcon}>
              <Ionicons name={p.icon} size={18} color={c.gold} />
            </View>
            <View style={styles.permText}>
              <Text style={styles.permTitle}>{p.label}</Text>
              <Text style={styles.permDesc}>{p.description}</Text>
            </View>
            <Switch
              value={!!perms[activeRole][p.key]}
              onValueChange={(v) => togglePerm(p.key, v)}
              trackColor={{ true: c.gold, false: c.border }}
              thumbColor="#fff"
            />
          </View>
        ))}
      </View>

      <Pressable
        onPress={resetRole}
        style={({ pressed }) => [styles.resetRow, pressed && { opacity: 0.6 }]}
        accessibilityRole="button"
      >
        <Ionicons name="refresh-outline" size={14} color={c.gold} />
        <Text style={styles.resetText}>Reset to default permissions</Text>
      </Pressable>

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          The Owner role always has full access and can't be edited. Changes apply to every team
          member with this role.
        </Text>
      </View>
    </OwnerScreen>
  );
}
