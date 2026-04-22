import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  Modal,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { OwnerHeader } from '@/components/owner/OwnerHeader';
import { SectionCard } from '@/components/owner/SectionCard';
import { STAFF_ROSTER, WAITLIST_ENTRIES, OWNER_RESERVATIONS } from '@/lib/mock/ownerApp';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function clockInLabel(shift: string): string {
  const first = shift.split(/[–-]/)[0]?.trim() ?? shift;
  return `In ${first}`;
}

const useStyles = createStyles((c) => ({
  onShiftScroll: {
    marginBottom: spacing.md,
  },
  onShiftContent: {
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    flexDirection: 'row',
  },
  avatarWrap: {
    alignItems: 'center',
    width: 72,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '800',
    color: c.gold,
  },
  avatarRole: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
    textAlign: 'center',
  },
  avatarIn: {
    fontSize: 10,
    fontWeight: '700',
    color: c.textSecondary,
    marginTop: 2,
    textAlign: 'center',
  },
  approvalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  approvalLeft: {
    flex: 1,
    gap: 4,
    paddingRight: spacing.md,
  },
  approvalTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  approvalSub: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  badge: {
    minWidth: 28,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.gold,
  },
  rosterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
  },
  rosterDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  rosterAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rosterAvatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.textPrimary,
  },
  rosterMid: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rosterName: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  rosterRole: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  shiftPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  shiftPillOn: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.14)',
  },
  shiftPillOff: {
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  shiftPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: c.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: spacing.md,
  },
  modalLine: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 8,
    fontWeight: '500',
  },
  modalClose: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    backgroundColor: c.gold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.full,
  },
  modalCloseText: {
    fontSize: 14,
    fontWeight: '700',
    color: c.bgBase,
  },
}));

export default function OwnerStaffScreen() {
  const { t } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const [approvalOpen, setApprovalOpen] = useState(false);

  const onShift = useMemo(() => STAFF_ROSTER.filter((m) => m.onClock), []);
  const approvalCount = useMemo(
    () =>
      WAITLIST_ENTRIES.filter((e) => e.risk).length +
      OWNER_RESERVATIONS.filter((r) => r.status === 'pending').length,
    [],
  );

  return (
    <OwnerScreen contentContainerStyle={{ paddingHorizontal: 0 }}>
      <OwnerHeader title={t('owner.staffTitle')} subtitle="Nova Ristorante · Roster" />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.onShiftScroll}
        contentContainerStyle={styles.onShiftContent}
      >
        {onShift.map((member) => (
          <Pressable
            key={member.id}
            style={({ pressed }) => [styles.avatarWrap, pressed && { opacity: 0.85 }]}
            onPress={() =>
              Alert.alert(member.name, `${member.role}\n${member.shift}`, [{ text: 'OK' }])
            }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(member.name)}</Text>
            </View>
            <Text style={styles.avatarRole} numberOfLines={2}>
              {member.role}
            </Text>
            <Text style={styles.avatarIn}>{clockInLabel(member.shift)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionCard sectionTitle="Approvals" marginBottom={spacing.md}>
        <Pressable
          onPress={() => setApprovalOpen(true)}
          style={({ pressed }) => [styles.approvalRow, pressed && { backgroundColor: c.bgElevated }]}
        >
          <View style={styles.approvalLeft}>
            <Text style={styles.approvalTitle}>Pending approvals</Text>
            <Text style={styles.approvalSub}>Waitlist flags & unconfirmed holds</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{approvalCount}</Text>
          </View>
        </Pressable>
      </SectionCard>

      <SectionCard sectionTitle="Full roster" marginBottom={spacing['2xl']}>
        {STAFF_ROSTER.map((member, i) => (
          <View key={member.id} style={[styles.rosterRow, i > 0 && styles.rosterDivider]}>
            <View style={styles.rosterAvatar}>
              <Text style={styles.rosterAvatarText}>{initials(member.name)}</Text>
            </View>
            <View style={styles.rosterMid}>
              <Text style={styles.rosterName}>{member.name}</Text>
              <Text style={styles.rosterRole}>{member.role}</Text>
            </View>
            <View style={[styles.shiftPill, member.onClock ? styles.shiftPillOn : styles.shiftPillOff]}>
              <Text style={styles.shiftPillText}>
                {member.onClock ? t('owner.staffOnClock') : t('owner.staffOff')}
              </Text>
            </View>
          </View>
        ))}
      </SectionCard>

      <Modal visible={approvalOpen} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setApprovalOpen(false)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>Approval queue</Text>
            {WAITLIST_ENTRIES.filter((e) => e.risk).map((e) => (
              <Text key={e.id} style={styles.modalLine}>
                Waitlist · {e.name} ({e.party}p) — {e.quoted}
              </Text>
            ))}
            {OWNER_RESERVATIONS.filter((r) => r.status === 'pending').map((r) => (
              <Text key={r.id} style={styles.modalLine}>
                Booking · {r.guestName} · {r.startTime}
              </Text>
            ))}
            <Pressable style={styles.modalClose} onPress={() => setApprovalOpen(false)}>
              <Text style={styles.modalCloseText}>Done</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </OwnerScreen>
  );
}
