import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { friendlyError } from '@/lib/errors/friendlyError';

const TEAM_ADMIN_ROLES = new Set(['owner', 'manager', 'diner_and_owner']);

type StaffRole = 'Owner' | 'Manager' | 'Host' | 'Server' | 'Kitchen';

type StaffMember = {
  id: string;
  name: string;
  role: StaffRole;
  email: string;
  status: 'active' | 'invited';
};

const ROLE_TONE: Record<
  StaffRole,
  { bg: string; fg: string; border: string }
> = {
  Owner: { bg: 'rgba(201,168,76,0.14)', fg: '#C9A84C', border: 'rgba(201,168,76,0.30)' },
  Manager: { bg: 'rgba(96,165,250,0.14)', fg: '#60A5FA', border: 'rgba(96,165,250,0.30)' },
  Host: { bg: 'rgba(34,197,94,0.14)', fg: '#22C55E', border: 'rgba(34,197,94,0.30)' },
  Server: { bg: 'rgba(244,114,182,0.14)', fg: '#F472B6', border: 'rgba(244,114,182,0.30)' },
  Kitchen: { bg: 'rgba(245,158,11,0.14)', fg: '#F59E0B', border: 'rgba(245,158,11,0.30)' },
};

// Real staff list comes from the `staff_members` Supabase table for the
// current restaurant. Until that's wired up, render an empty list rather
// than the seeded "Nova Ristorante" team — a real owner should never see
// fake colleagues on first render.
const INITIAL_TEAM: StaffMember[] = [];

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  inviteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.08)',
    marginBottom: spacing.lg,
  },
  inviteBtnText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },

  filterScroll: { marginBottom: spacing.md },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 2 },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  filterChipActive: {
    backgroundColor: 'rgba(201,168,76,0.16)',
    borderColor: c.gold,
  },
  filterText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  filterTextActive: { color: c.gold },

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
    minHeight: 72,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  rowPressed: { backgroundColor: c.bgElevated },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  avatarText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '800',
    fontSize: 14,
  },
  text: { flex: 1, gap: 3 },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  name: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  pendingPill: {
    ...typography.label,
    color: c.gold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.14)',
    overflow: 'hidden',
    letterSpacing: 0.6,
  },
  meta: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  rolePill: {
    ...typography.label,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    letterSpacing: 0.6,
    borderWidth: 1,
  },

  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
  },

}));

type Filter = 'all' | StaffRole;

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'Owner', label: 'Owners' },
  { key: 'Manager', label: 'Managers' },
  { key: 'Host', label: 'Hosts' },
  { key: 'Server', label: 'Servers' },
  { key: 'Kitchen', label: 'Kitchen' },
];

export default function StaffMembersScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const [team, setTeam] = useState<StaffMember[]>(INITIAL_TEAM);
  const [filter, setFilter] = useState<Filter>('all');
  const { role: viewerRole } = useAuthSession();
  const canAdminTeam = viewerRole ? TEAM_ADMIN_ROLES.has(viewerRole.toLowerCase()) : false;

  const filtered = useMemo(() => {
    if (filter === 'all') return team;
    return team.filter((m) => m.role === filter);
  }, [team, filter]);

  const showActions = (m: StaffMember) => {
    if (!canAdminTeam) {
      Alert.alert(
        'Not allowed',
        friendlyError(undefined, 'Only owners and managers can change roles or remove team members.'),
      );
      return;
    }
    Alert.alert(
      m.name,
      m.role,
      [
        {
          text: 'Change role',
          onPress: () =>
            Alert.alert(
              'Change role',
              'Pick a new role for this team member.',
              (
                ['Owner', 'Manager', 'Host', 'Server', 'Kitchen'] as StaffRole[]
              ).map((r) => ({
                text: r,
                onPress: () =>
                  setTeam((prev) => prev.map((x) => (x.id === m.id ? { ...x, role: r } : x))),
              })),
            ),
        },
        ...(m.status === 'invited'
          ? [
              {
                text: 'Resend invite',
                onPress: () => Alert.alert('Invite resent', `We sent a new invite to ${m.email}.`),
              },
            ]
          : []),
        {
          text: 'Remove from team',
          style: 'destructive' as const,
          onPress: () =>
            Alert.alert('Remove from team?', `${m.name} will no longer have access.`, [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Remove',
                style: 'destructive',
                onPress: () => setTeam((prev) => prev.filter((x) => x.id !== m.id)),
              },
            ]),
        },
        { text: 'Cancel', style: 'cancel' as const },
      ],
    );
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Staff members"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Your team</Text>
        <Text style={styles.introText}>
          Add the people who run your restaurant on Cenaiva.
        </Text>
      </View>

      <Pressable
        onPress={() => router.push('/(staff)/invite-team-member' as never)}
        style={({ pressed }) => [styles.inviteBtn, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <Ionicons name="person-add-outline" size={18} color={c.gold} />
        <Text style={styles.inviteBtnText}>Invite a team member</Text>
      </Pressable>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.filterChip, active && styles.filterChipActive]}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>{f.label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {filtered.length === 0 ? (
        <View style={[styles.card, styles.empty]}>
          <Ionicons name="people-outline" size={28} color={c.textMuted} />
          <Text style={styles.emptyText}>No team members match this filter.</Text>
        </View>
      ) : (
        <View style={styles.card}>
          {filtered.map((m, i) => {
            const tone = ROLE_TONE[m.role];
            return (
              <Pressable
                key={m.id}
                onPress={() => showActions(m)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`${m.name}, ${m.role}`}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(m.name)}</Text>
                </View>
                <View style={styles.text}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name}>{m.name}</Text>
                    {m.status === 'invited' ? (
                      <Text style={styles.pendingPill}>PENDING</Text>
                    ) : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    {m.email}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.rolePill,
                    { color: tone.fg, backgroundColor: tone.bg, borderColor: tone.border },
                  ]}
                >
                  {m.role.toUpperCase()}
                </Text>
              </Pressable>
            );
          })}
        </View>
      )}

    </OwnerScreen>
  );
}
