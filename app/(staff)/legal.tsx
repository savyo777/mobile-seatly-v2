import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

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
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 60,
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
}));

export default function LegalScreen() {
  const c = useColors();
  const styles = useStyles();

  return (
    <OwnerScreen header={<SubpageHeader title="Legal" accentBack />}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Legal</Text>
        <Text style={styles.introText}>Quick access to the documents that govern the restaurant side.</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>DOCUMENTS</Text>
        <Text style={styles.heroTitle}>Clear, direct policies</Text>
        <Text style={styles.heroText}>
          These pages cover account use, privacy, and the rules for using Cenaiva as a restaurant partner.
        </Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="document-text-outline" size={16} color={c.gold} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Terms of service</Text>
            <Text style={styles.rowSub}>Rules for restaurants, staff, and account access.</Text>
          </View>
        </View>
        <View style={styles.rowDivider} />
        <View style={styles.row}>
          <View style={styles.iconWrap}>
            <Ionicons name="shield-checkmark-outline" size={16} color={c.gold} />
          </View>
          <View style={styles.rowText}>
            <Text style={styles.rowTitle}>Privacy policy</Text>
            <Text style={styles.rowSub}>How restaurant data and billing details are handled.</Text>
          </View>
        </View>
      </View>
    </OwnerScreen>
  );
}
