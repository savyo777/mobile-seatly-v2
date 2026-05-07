import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const ROLES = ['Owner', 'Manager', 'Host', 'Server', 'Kitchen'] as const;
type Role = (typeof ROLES)[number];

function sanitizePin(value: string): string {
  return value.replace(/\D/g, '').slice(0, 4);
}

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

export default function AddPinScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const params = useLocalSearchParams<{ pinId?: string; name?: string; role?: string; pin?: string }>();

  const [name, setName] = useState(typeof params.name === 'string' ? params.name : '');
  const [role, setRole] = useState<Role>(
    ROLES.includes((params.role as Role) ?? '') ? ((params.role as Role) ?? 'Manager') : 'Manager',
  );
  const [pin, setPin] = useState(typeof params.pin === 'string' ? params.pin : '');

  const editing = useMemo(() => typeof params.pinId === 'string' && params.pinId.length > 0, [params.pinId]);
  const canSave = name.trim().length > 0 && sanitizePin(pin).length === 4;

  const onSave = () => {
    if (!canSave) {
      Alert.alert('Missing info', 'Enter a name and a 4-digit PIN.');
      return;
    }
    Alert.alert(
      editing ? 'PIN updated' : 'PIN added',
      `${name.trim()} is now set to ${sanitizePin(pin)} for the ${role} role.`,
      [{ text: 'OK', onPress: () => router.back() }],
    );
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={editing ? 'Edit PIN' : 'Add PIN'}
          accentBack
        />
      }
    >
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.intro}>
          <Text style={styles.introTitle}>{editing ? 'Update a code' : 'Add a new code'}</Text>
          <Text style={styles.introText}>
            Set or change the PIN a team member uses on the floor.
          </Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>STAFF PIN</Text>
          <Text style={styles.heroTitle}>{editing ? 'Change the existing PIN' : 'Create a new PIN'}</Text>
          <Text style={styles.heroText}>
            Keep the code simple for the team and easy to update if someone leaves.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>FULL NAME</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="person-outline" size={16} color={c.textMuted} />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Alex Johnson"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
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

          <View style={[styles.field, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>4-DIGIT PIN</Text>
            <View style={styles.fieldRow}>
              <Ionicons name="keypad-outline" size={16} color={c.textMuted} />
              <TextInput
                value={pin}
                onChangeText={(v) => setPin(sanitizePin(v))}
                placeholder="1234"
                placeholderTextColor={c.textMuted}
                style={styles.fieldInput}
                keyboardType="number-pad"
                maxLength={4}
              />
            </View>
          </View>
        </View>

        <Pressable
          onPress={onSave}
          style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.75 }, !canSave && { opacity: 0.45 }]}
        >
          <Ionicons name={editing ? 'create-outline' : 'add-outline'} size={18} color={c.bgBase} />
          <Text style={styles.saveBtnText}>{editing ? 'Save changes' : 'Add PIN'}</Text>
        </Pressable>

        <View style={styles.noteRow}>
          <Ionicons name="information-circle-outline" size={18} color={c.gold} />
          <Text style={styles.noteText}>
            You can come back here anytime to change a code or add another one.
          </Text>
        </View>
      </ScrollView>
    </OwnerScreen>
  );
}
