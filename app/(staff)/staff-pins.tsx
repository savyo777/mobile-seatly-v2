import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Pin = {
  id: string;
  name: string;
  role: string;
  pin: string; // 4 digits
};

// Staff PINs are owned by the live `staff_pins` table. Until that's wired
// up, this screen renders with an empty list rather than seeded fake codes
// — shipping fixed default PINs would be a security hazard if a customer
// ever interpreted them as real defaults for their restaurant.
const INITIAL_PINS: Pin[] = [];

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  /* Top toggle: require PIN to clock in */
  toggleCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  toggleIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  toggleText: { flex: 1, gap: 2 },
  toggleTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  toggleDesc: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },

  sectionLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
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
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 72,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
  text: { flex: 1, gap: 2 },
  name: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },

  /* PIN block */
  pinBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pinDigits: {
    backgroundColor: c.bgElevated,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  pinText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '800',
    letterSpacing: 4,
    fontVariant: ['tabular-nums'],
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  iconBtnPressed: { opacity: 0.7 },

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

export default function StaffPinsScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const [pins, setPins] = useState<Pin[]>(INITIAL_PINS);
  const [requirePin, setRequirePin] = useState(true);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  const toggleReveal = (id: string) => {
    setRevealed((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const regenerate = (id: string) => {
    const target = pins.find((p) => p.id === id);
    if (!target) return;
    Alert.alert(
      'Generate a new PIN?',
      `${target.name}'s old PIN will stop working immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate new PIN',
          onPress: () => {
            const newPin = generatePin();
            setPins((prev) => prev.map((p) => (p.id === id ? { ...p, pin: newPin } : p)));
            setRevealed((prev) => ({ ...prev, [id]: true }));
            Alert.alert('New PIN', `${target.name}'s new PIN is ${newPin}.`);
          },
        },
      ],
    );
  };

  const editPin = (pinId: string) => {
    const target = pins.find((p) => p.id === pinId);
    if (!target) return;
    router.push({
      pathname: '/(staff)/add-pin',
      params: {
        pinId: target.id,
        name: target.name,
        role: target.role,
        pin: target.pin,
      },
    } as never);
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Staff PIN codes"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Quick sign-in PINs</Text>
        <Text style={styles.introText}>
          Each team member gets a 4-digit PIN to clock in or unlock the shared device on the floor.
        </Text>
      </View>

      <View style={styles.toggleCard}>
        <View style={styles.toggleIcon}>
          <Ionicons name="lock-closed-outline" size={18} color={c.gold} />
        </View>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>Require PIN to clock in</Text>
          <Text style={styles.toggleDesc}>
            Staff must enter their PIN before opening the floor screen.
          </Text>
        </View>
        <Switch
          value={requirePin}
          onValueChange={setRequirePin}
          trackColor={{ true: c.gold, false: c.border }}
          thumbColor="#fff"
        />
      </View>

      <Pressable
        onPress={() => router.push('/(staff)/add-pin' as never)}
        style={({ pressed }) => [styles.toggleCard, pressed && { opacity: 0.7 }]}
        accessibilityRole="button"
      >
        <View style={styles.toggleIcon}>
          <Ionicons name="add-outline" size={18} color={c.gold} />
        </View>
        <View style={styles.toggleText}>
          <Text style={styles.toggleTitle}>Add staff PIN code</Text>
          <Text style={styles.toggleDesc}>
            Create a new PIN or change an existing code.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
      </Pressable>

      <Text style={styles.sectionLabel}>TEAM PINS</Text>
      <View style={styles.card}>
        {pins.map((p, i) => (
          <View key={p.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials(p.name)}</Text>
            </View>
            <View style={styles.text}>
              <Text style={styles.name}>{p.name}</Text>
              <Text style={styles.meta}>{p.role}</Text>
            </View>
            <View style={styles.pinBlock}>
              <View style={styles.pinDigits}>
                <Text style={styles.pinText}>{revealed[p.id] ? p.pin : '••••'}</Text>
              </View>
              <Pressable
                onPress={() => toggleReveal(p.id)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={6}
                accessibilityLabel={revealed[p.id] ? 'Hide PIN' : 'Show PIN'}
              >
                <Ionicons
                  name={revealed[p.id] ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={c.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={() => editPin(p.id)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={6}
                accessibilityLabel="Edit PIN"
              >
                <Ionicons name="create-outline" size={16} color={c.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => regenerate(p.id)}
                style={({ pressed }) => [styles.iconBtn, pressed && styles.iconBtnPressed]}
                hitSlop={6}
                accessibilityLabel="Generate new PIN"
              >
                <Ionicons name="refresh-outline" size={16} color={c.textPrimary} />
              </Pressable>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          Don't share PINs in chat. If someone leaves the team, regenerate their PIN — that's enough
          to lock them out.
        </Text>
      </View>
    </OwnerScreen>
  );
}
