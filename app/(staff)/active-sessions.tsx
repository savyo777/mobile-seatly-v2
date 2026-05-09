import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type Session = {
  id: string;
  device: string;
  os: string;
  location: string;
  lastActive: string;
  current: boolean;
  icon: keyof typeof Ionicons.glyphMap;
};

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

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
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  text: { flex: 1, gap: 3 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  device: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  meta: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  thisDevice: {
    ...typography.label,
    color: c.gold,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.12)',
    overflow: 'hidden',
    letterSpacing: 0.6,
  },
  signOutBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
  },
  signOutText: {
    ...typography.bodySmall,
    color: '#EF4444',
    fontWeight: '700',
  },

  signOutAllBtn: {
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: '#EF4444',
    backgroundColor: 'rgba(239,68,68,0.06)',
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: spacing.lg,
  },
  signOutAllText: {
    ...typography.body,
    color: '#EF4444',
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

// Sessions list will come from a real backend endpoint that reads from
// auth.sessions. Until that's wired up, render an empty list — never show
// fabricated devices on a security screen, since a user clicking "sign out
// other devices" would otherwise believe the action took effect when it
// did not.
const INITIAL_SESSIONS: Session[] = [];

export default function ActiveSessionsScreen() {
  const c = useColors();
  const styles = useStyles();
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS);

  const otherCount = sessions.filter((s) => !s.current).length;

  const signOutSession = (id: string) => {
    const target = sessions.find((s) => s.id === id);
    if (!target) return;
    Alert.alert(
      'Sign out of this device?',
      `${target.device} will be signed out immediately.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => setSessions((prev) => prev.filter((s) => s.id !== id)),
        },
      ],
    );
  };

  const signOutAllOthers = () => {
    if (otherCount === 0) return;
    Alert.alert(
      'Sign out everywhere else?',
      `Every signed-in device except this one will be signed out (${otherCount} session${otherCount === 1 ? '' : 's'}).`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out all',
          style: 'destructive',
          onPress: () => setSessions((prev) => prev.filter((s) => s.current)),
        },
      ],
    );
  };

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Active sessions"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Where you're signed in</Text>
        <Text style={styles.introText}>
          Review every device using this restaurant account and sign out the ones you don't recognize.
        </Text>
      </View>

      <View style={styles.card}>
        {sessions.map((s, i) => (
          <View key={s.id} style={[styles.row, i > 0 && styles.rowDivider]}>
            <View style={styles.iconWrap}>
              <Ionicons name={s.icon} size={20} color={c.gold} />
            </View>
            <View style={styles.text}>
              <View style={styles.titleRow}>
                <Text style={styles.device} numberOfLines={1}>
                  {s.device}
                </Text>
                {s.current ? <Text style={styles.thisDevice}>THIS DEVICE</Text> : null}
              </View>
              <Text style={styles.meta} numberOfLines={1}>
                {s.os}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                {s.location} · {s.lastActive}
              </Text>
            </View>
            {!s.current ? (
              <Pressable
                onPress={() => signOutSession(s.id)}
                style={({ pressed }) => [styles.signOutBtn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.signOutText}>Sign out</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>

      {otherCount > 0 ? (
        <Pressable
          onPress={signOutAllOthers}
          style={({ pressed }) => [styles.signOutAllBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text style={styles.signOutAllText}>Sign out of all other devices</Text>
        </Pressable>
      ) : null}

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          See a device you don't recognize? Sign it out, then change your password right away.
        </Text>
      </View>
    </OwnerScreen>
  );
}
