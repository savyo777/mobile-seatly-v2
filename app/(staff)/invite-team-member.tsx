import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { normalizeEmail, normalizeName, sanitizeEmailInput, sanitizeNameInput } from '@/lib/validation/input';

const ROLES = ['Manager', 'Host', 'Server', 'Kitchen'] as const;
type Role = (typeof ROLES)[number];

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },
  hero: {
    borderRadius: borderRadius.xl,
    backgroundColor: 'rgba(201,168,76,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    padding: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  heroLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.4,
    fontWeight: '700',
  },
  heroTitle: {
    ...typography.serifDisplay,
    color: c.textPrimary,
    fontSize: 26,
    lineHeight: 32,
  },
  heroText: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  field: {
    paddingVertical: 10,
    gap: 4,
  },
  fieldDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  fieldLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fieldInput: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
    paddingVertical: 0,
    flex: 1,
  },
  roleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.sm,
  },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  roleChipActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(201,168,76,0.14)',
  },
  roleChipText: {
    ...typography.bodySmall,
    color: c.textPrimary,
    fontWeight: '600',
  },
  roleChipTextActive: {
    color: c.gold,
  },
  saveBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  saveBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '800',
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

export default function InviteTeamMemberScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Manager');

  const canSave = useMemo(() => normalizeName(name).length > 0 && normalizeEmail(email) !== null, [name, email]);

  const onSave = () => {
    if (!canSave) {
      Alert.alert('Missing info', 'Add a name and email address first.');
      return;
    }
    Alert.alert(
      'Invite sent',
      `${normalizeName(name)} will receive an invite for the ${role} role.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Invite team member"
          accentBack
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.introTitle}>Invite someone new</Text>
          <Text style={styles.introText}>Send a team invite with the right access from the start.</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>TEAM INVITE</Text>
          <Text style={styles.heroTitle}>Add a new person to the floor</Text>
          <Text style={styles.heroText}>
            Enter their details, choose a role, and send the invite.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="person-outline" size={16} color={c.textMuted} />
              <TextInput
                value={name}
                onChangeText={(value) => setName(sanitizeNameInput(value, 80))}
                placeholder="Alex Johnson"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
              />
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="mail-outline" size={16} color={c.textMuted} />
              <TextInput
                value={email}
                onChangeText={(value) => setEmail(sanitizeEmailInput(value))}
                placeholder="alex@example.com"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                autoCapitalize="none"
              />
            </View>
          </View>

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>ROLE</Text>
            <View style={styles.roleRow}>
              {ROLES.map((r) => {
                const active = role === r;
                return (
                  <Pressable
                    key={r}
                    onPress={() => setRole(r)}
                    style={[styles.roleChip, active && styles.roleChipActive]}
                  >
                    <Text style={[styles.roleChipText, active && styles.roleChipTextActive]}>{r}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }, !canSave && { opacity: 0.45 }]}
        >
          <Ionicons name="paper-plane-outline" size={18} color={c.bgBase} />
          <Text style={styles.saveBtnText}>Send invite</Text>
        </Pressable>

        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={18} color={c.gold} />
          <Text style={styles.noteText}>
            New team members will be able to sign in after they accept the invite.
          </Text>
        </View>
      </ScrollView>
    </OwnerScreen>
  );
}
