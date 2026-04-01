import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { PreferenceChip } from '@/components/profile/PreferenceChip';
import { mockDietaryPreferenceOptions } from '@/lib/mock/profileScreens';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

export default function DietaryScreen() {
  const { t } = useTranslation();
  const initial = new Set<string>(
    mockCustomer.dietaryRestrictions.includes('vegetarian') ? ['d1'] : [],
  );
  const [selected, setSelected] = useState(initial);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ProfileStackScreen title={t('profile.dietaryPreferences')} subtitle={t('profile.dietaryPreferencesSub')}>
      <Text style={styles.lead}>
        We use this to highlight compatible menus and filter recommendations. You can update anytime.
      </Text>
      <ProfileSectionTitle>Your preferences</ProfileSectionTitle>
      <View style={styles.chipWrap}>
        {mockDietaryPreferenceOptions.map((opt) => (
          <PreferenceChip key={opt.id} label={opt.label} selected={selected.has(opt.id)} onPress={() => toggle(opt.id)} />
        ))}
      </View>
      <View style={styles.hintBox}>
        <Text style={styles.hintTitle}>How we use this</Text>
        <Text style={styles.hintBody}>
          Restaurants see anonymized preference tags only when you book, so they can prepare alternatives (demo copy).
        </Text>
      </View>
    </ProfileStackScreen>
  );
}

const styles = StyleSheet.create({
  lead: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
    lineHeight: 22,
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  hintBox: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadows.card,
  },
  hintTitle: {
    ...typography.label,
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  hintBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
