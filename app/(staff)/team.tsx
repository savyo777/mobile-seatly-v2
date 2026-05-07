import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

type TeamCard = {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  href: '/(staff)/staff-members' | '/(staff)/roles-permissions' | '/(staff)/staff-pins';
};

const CARDS: TeamCard[] = [
  {
    title: 'Staff members',
    subtitle: 'Invite, remove, and review who is active on the floor.',
    icon: 'people-outline',
    href: '/(staff)/staff-members',
  },
  {
    title: 'Roles & permissions',
    subtitle: 'Set what each role can see and change.',
    icon: 'shield-checkmark-outline',
    href: '/(staff)/roles-permissions',
  },
  {
    title: 'Staff PIN codes',
    subtitle: 'Manage the PINs used for clock-in and device access.',
    icon: 'keypad-outline',
    href: '/(staff)/staff-pins',
  },
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
    fontSize: 28,
    lineHeight: 34,
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
    overflow: 'hidden',
    marginBottom: spacing.md,
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
  rowPressed: { backgroundColor: c.bgElevated },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgElevated,
  },
  textWrap: { flex: 1, gap: 2 },
  title: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.bodySmall,
    color: c.textMuted,
    lineHeight: 16,
  },
  chevron: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));

export default function TeamOverviewScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title="Team"
          accentBack
        />
      }
    >
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Team tools</Text>
        <Text style={styles.introText}>Manage access, roles, and the PINs your team uses every day.</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroLabel}>TEAM MANAGEMENT</Text>
        <Text style={styles.heroTitle}>Everything in one place</Text>
        <Text style={styles.heroText}>
          Open the section you need and make changes without digging through Settings.
        </Text>
      </View>

      {CARDS.map((card, index) => (
        <Pressable
          key={card.title}
          onPress={() => router.push(card.href as never)}
          style={({ pressed }) => [styles.card, pressed && styles.rowPressed]}
          accessibilityRole="button"
        >
          <View style={[styles.row, index > 0 && styles.rowDivider]}>
            <View style={styles.icon}>
              <Ionicons name={card.icon} size={18} color={c.gold} />
            </View>
            <View style={styles.textWrap}>
              <Text style={styles.title}>{card.title}</Text>
              <Text style={styles.subtitle}>{card.subtitle}</Text>
            </View>
            <View style={styles.chevron}>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </View>
          </View>
        </Pressable>
      ))}
    </OwnerScreen>
  );
}
