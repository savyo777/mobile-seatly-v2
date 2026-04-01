import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';
import type { Href } from 'expo-router';

/** Order: Payments, Saved Places, Rewards, Activity — compact shortcuts */
const ACTIONS: {
  key: string;
  labelKey: keyof typeof import('@/lib/i18n/locales/en').default.profile;
  icon: keyof typeof Ionicons.glyphMap;
  href: Href;
}[] = [
  { key: 'pay', labelKey: 'quickPayments', icon: 'wallet-outline', href: '/(customer)/profile/wallet' },
  { key: 'saved', labelKey: 'quickSavedPlaces', icon: 'bookmark-outline', href: '/(customer)/profile/saved' },
  { key: 'rew', labelKey: 'quickRewardsHub', icon: 'gift-outline', href: '/(customer)/profile/rewards' },
  { key: 'hist', labelKey: 'quickHistory', icon: 'time-outline', href: '/(customer)/activity' },
];

type Props = {
  onNavigate: (href: Href) => void;
};

export function ProfileQuickActions({ onNavigate }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.grid}>
      {ACTIONS.map((a) => (
        <Pressable
          key={a.key}
          onPress={() => onNavigate(a.href)}
          style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
        >
          <View style={styles.iconWrap}>
            <Ionicons name={a.icon} size={22} color={colors.gold} />
          </View>
          <Text style={styles.label} numberOfLines={2}>
            {t(`profile.${a.labelKey}`)}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.lg,
  },
  tile: {
    width: '47.5%',
    flexGrow: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center',
    gap: 8,
  },
  tilePressed: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderColor: 'rgba(201, 168, 76, 0.25)',
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    ...typography.bodySmall,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
});
