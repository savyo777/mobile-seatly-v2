import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
  rowPressed: {
    backgroundColor: c.bgElevated,
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

type LegalRow = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  path: string;
};

const ROWS: LegalRow[] = [
  {
    icon: 'document-text-outline',
    title: 'Terms of Service',
    subtitle: 'Rules for diners, staff, and account access (v2026-05-21).',
    path: '/(customer)/profile/legal/terms',
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Privacy Policy',
    subtitle: 'How diner data and your billing details are handled (v1.1).',
    path: '/(customer)/profile/legal/privacy-policy',
  },
  {
    icon: 'business-outline',
    title: 'Restaurant Partner Agreement',
    subtitle: 'Fees, obligations, and your data rights as a partner (v2.1).',
    path: '/(customer)/profile/legal/partner-agreement',
  },
  {
    icon: 'server-outline',
    title: 'Sub-Processors',
    subtitle: 'Third-party providers we share data with — 30 days\' notice before changes.',
    path: '/(customer)/profile/legal/sub-processors',
  },
  {
    icon: 'time-outline',
    title: 'Agreement History',
    subtitle: 'Version-by-version log of Partner Agreement changes.',
    path: '/(customer)/profile/legal/agreement-history',
  },
];

export default function StaffLegalScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();

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
        {ROWS.map((row, i) => (
          <React.Fragment key={row.path}>
            {i > 0 ? <View style={styles.rowDivider} /> : null}
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() => router.push(row.path as never)}
              accessibilityRole="button"
              accessibilityLabel={row.title}
            >
              <View style={styles.iconWrap}>
                <Ionicons name={row.icon} size={16} color={c.gold} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>{row.title}</Text>
                <Text style={styles.rowSub}>{row.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          </React.Fragment>
        ))}
      </View>
    </OwnerScreen>
  );
}
