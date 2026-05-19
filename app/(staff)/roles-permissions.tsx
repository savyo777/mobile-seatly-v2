import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import {
  DEFAULT_PERMS,
  PERMISSIONS,
  ROLES,
  readRolePermissions,
  writeRolePermissions,
  type RoleId,
  type RolePermissionMatrix,
} from '@/lib/owner/rolePermissionsSettings';
import { friendlyError } from '@/lib/errors/friendlyError';

const useStyles = createStyles((c) => ({
  pickerRow: {
    paddingHorizontal: 4,
    paddingBottom: spacing.md,
  },
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
  pickCta: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  pickCtaText: {
    ...typography.body,
    color: c.textMuted,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingRow: {
    padding: spacing.xl,
    alignItems: 'center',
  },
}));

export default function RolesPermissionsScreen() {
  const c = useColors();
  const styles = useStyles();
  const { selectedRestaurantId, isAll } = useOwnerScope();

  const [activeRole, setActiveRole] = useState<RoleId>('manager');
  const [perms, setPerms] = useState<RolePermissionMatrix>(DEFAULT_PERMS);
  const [loading, setLoading] = useState<boolean>(false);

  // Track the latest scope so we can ignore stale fetch results.
  const fetchSeq = useRef(0);

  useEffect(() => {
    if (isAll || !selectedRestaurantId) {
      setPerms(DEFAULT_PERMS);
      setLoading(false);
      return;
    }
    const seq = ++fetchSeq.current;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const next = await readRolePermissions(selectedRestaurantId);
        if (cancelled || seq !== fetchSeq.current) return;
        setPerms(next);
      } catch {
        if (cancelled || seq !== fetchSeq.current) return;
        setPerms(DEFAULT_PERMS);
      } finally {
        if (!cancelled && seq === fetchSeq.current) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedRestaurantId, isAll]);

  const persist = (next: RolePermissionMatrix, previous: RolePermissionMatrix) => {
    if (isAll || !selectedRestaurantId) return;
    writeRolePermissions(selectedRestaurantId, next).catch(() => {
      // Rollback on persistence failure so the toggle doesn't silently
      // drift out of sync with the server.
      setPerms(previous);
      Alert.alert(
        'Permissions not saved',
        friendlyError(undefined, 'We couldn’t save that change. Check your connection and try again.'),
      );
    });
  };

  const togglePerm = (key: string, next: boolean) => {
    setPerms((prev) => {
      const updated: RolePermissionMatrix = {
        ...prev,
        [activeRole]: { ...(prev[activeRole] ?? {}), [key]: next },
      };
      persist(updated, prev);
      return updated;
    });
  };

  const resetRole = () => {
    setPerms((prev) => {
      const updated: RolePermissionMatrix = {
        ...prev,
        [activeRole]: { ...DEFAULT_PERMS[activeRole] },
      };
      persist(updated, prev);
      return updated;
    });
  };

  const role = ROLES.find((r) => r.id === activeRole)!;
  const activeRolePerms = perms[activeRole] ?? DEFAULT_PERMS[activeRole] ?? {};

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Roles & permissions"
          accentBack
        />
      }
    >
      <View style={styles.pickerRow}>
        <RestaurantPicker allowAll={false} size="compact" />
      </View>

      {isAll ? (
        <View style={styles.pickCta}>
          <Text style={styles.pickCtaText}>
            Pick a restaurant to manage role permissions
          </Text>
        </View>
      ) : (
        <>
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

          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={c.gold} />
            </View>
          ) : (
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
                    value={!!activeRolePerms[p.key]}
                    onValueChange={(v) => togglePerm(p.key, v)}
                    trackColor={{ true: c.gold, false: c.border }}
                    thumbColor="#fff"
                  />
                </View>
              ))}
            </View>
          )}

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
        </>
      )}
    </OwnerScreen>
  );
}
