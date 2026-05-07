import React, { useState } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const HOURS = [
  { day: 'Monday', from: '10:00 PM', to: '8:00 AM' },
  { day: 'Tuesday', from: '10:00 PM', to: '8:00 AM' },
  { day: 'Wednesday', from: '10:00 PM', to: '8:00 AM' },
  { day: 'Thursday', from: '10:00 PM', to: '8:00 AM' },
  { day: 'Friday', from: '11:00 PM', to: '9:00 AM' },
  { day: 'Saturday', from: '11:00 PM', to: '9:00 AM' },
  { day: 'Sunday', from: '9:00 PM', to: '7:00 AM' },
];

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
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.22)',
    backgroundColor: 'rgba(201,168,76,0.06)',
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  heroLabel: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.2,
  },
  heroTitle: {
    ...typography.h2,
    color: c.textPrimary,
  },
  heroText: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 18,
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
    minHeight: 64,
  },
  rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  rowText: { flex: 1, gap: 2 },
  rowTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  rowSub: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  scheduleCard: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    minHeight: 54,
  },
  dayText: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
    flex: 1,
  },
  timeText: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontWeight: '600',
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 60,
  },
  toggleLabel: { flex: 1, gap: 2 },
}));

export default function QuietHoursScreen() {
  const c = useColors();
  const styles = useStyles();
  const [enabled, setEnabled] = useState(true);
  const [pushOff, setPushOff] = useState(true);

  return (
    <OwnerScreen header={<SubpageHeader title="Quiet hours" accentBack />}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Quiet hours</Text>
        <Text style={styles.introText}>Pause non-urgent alerts during the hours you choose.</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>NOTIFICATIONS</Text>
        <Text style={styles.heroTitle}>Keep the floor quiet overnight</Text>
        <Text style={styles.heroText}>
          This only affects alerts you do not want during slower hours. Urgent reservation and
          order actions can still come through if needed.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.toggleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="moon-outline" size={16} color={c.gold} />
          </View>
          <View style={styles.toggleLabel}>
            <Text style={styles.rowTitle}>Quiet hours enabled</Text>
            <Text style={styles.rowSub}>Turn this on to silence routine notifications.</Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={setEnabled}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.toggleRow}>
          <View style={styles.iconWrap}>
            <Ionicons name="notifications-off-outline" size={16} color={c.gold} />
          </View>
          <View style={styles.toggleLabel}>
            <Text style={styles.rowTitle}>Pause push notifications</Text>
            <Text style={styles.rowSub}>Stop routine push alerts while quiet hours are active.</Text>
          </View>
          <Switch
            value={pushOff}
            onValueChange={setPushOff}
            trackColor={{ true: c.gold, false: c.border }}
            thumbColor="#fff"
          />
        </View>
      </View>

      <Text style={styles.introTitle}>Weekly schedule</Text>
      <View style={styles.scheduleCard}>
        {HOURS.map((item, index) => (
          <View key={item.day} style={[styles.dayRow, index > 0 && styles.rowDivider]}>
            <Text style={styles.dayText}>{item.day}</Text>
            <Text style={styles.timeText}>
              {item.from} - {item.to}
            </Text>
          </View>
        ))}
      </View>
    </OwnerScreen>
  );
}
