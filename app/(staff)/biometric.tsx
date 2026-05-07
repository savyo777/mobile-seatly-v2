import React, { useState } from 'react';
import { Platform, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  hero: {
    alignItems: 'center',
    paddingTop: spacing.lg,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  heroIcon: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
  },
  heroTitle: {
    ...typography.h2,
    color: c.textPrimary,
    textAlign: 'center',
  },
  heroBody: {
    ...typography.body,
    color: c.textMuted,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 320,
  },

  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  toggleLabel: { flex: 1, gap: 2 },
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
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },
}));

const BIOMETRIC_LABEL = Platform.OS === 'ios' ? 'Face ID / Touch ID' : 'Fingerprint';
const BIOMETRIC_LONG = Platform.OS === 'ios' ? 'Face ID & Touch ID' : 'Fingerprint sign-in';

export default function BiometricScreen() {
  const c = useColors();
  const styles = useStyles();

  // Local state — wire this to expo-local-authentication / SecureStore later.
  const [enabled, setEnabled] = useState(true);
  const [requireOnAppOpen, setRequireOnAppOpen] = useState(true);
  const [requireForPayouts, setRequireForPayouts] = useState(true);

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={BIOMETRIC_LABEL}
          accentBack
        />
      }
    >
      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="finger-print-outline" size={42} color={c.gold} />
        </View>
        <Text style={styles.heroTitle}>{BIOMETRIC_LONG}</Text>
        <Text style={styles.heroBody}>
          Use your device biometrics to unlock the app instead of typing a password.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="key-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.toggleLabel}>
            <Text style={styles.toggleTitle}>Use biometrics to sign in</Text>
            <Text style={styles.toggleDesc}>Skip the password on this device.</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.toggleRow, styles.rowDivider]}>
          <View style={styles.iconWrap}>
            <Ionicons name="lock-closed-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.toggleLabel}>
            <Text style={styles.toggleTitle}>Require when opening the app</Text>
            <Text style={styles.toggleDesc}>Unlock with biometrics each time you open Cenaiva.</Text>
          </View>
          <Switch
            value={enabled && requireOnAppOpen}
            disabled={!enabled}
            onValueChange={setRequireOnAppOpen}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={[styles.toggleRow, styles.rowDivider]}>
          <View style={styles.iconWrap}>
            <Ionicons name="card-outline" size={18} color={c.gold} />
          </View>
          <View style={styles.toggleLabel}>
            <Text style={styles.toggleTitle}>Require for payouts</Text>
            <Text style={styles.toggleDesc}>Confirm with biometrics before transferring funds.</Text>
          </View>
          <Switch
            value={enabled && requireForPayouts}
            disabled={!enabled}
            onValueChange={setRequireForPayouts}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <View style={styles.noteRow}>
        <Ionicons name="information-circle-outline" size={18} color={c.gold} />
        <Text style={styles.noteText}>
          Biometrics stay on this device. They aren't shared with Cenaiva or anyone else.
        </Text>
      </View>
    </OwnerScreen>
  );
}
