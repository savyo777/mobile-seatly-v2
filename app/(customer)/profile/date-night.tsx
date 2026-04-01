import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { PreferenceChip } from '@/components/profile/PreferenceChip';
import { mockDateNightOptions } from '@/lib/mock/profileScreens';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

export default function DateNightScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(new Set(['dn1', 'dn2', 'dn5']));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ProfileStackScreen title={t('profile.dateNightPrefs')} subtitle={t('profile.dateNightPrefsSub')}>
      <Text style={styles.lead}>
        Tune how Seatly ranks date-night picks — rooftops, quiet tables, wine lists, and more.
      </Text>
      <ProfileSectionTitle>Match my dates to</ProfileSectionTitle>
      <View style={styles.chipWrap}>
        {mockDateNightOptions.map((opt) => (
          <PreferenceChip key={opt.id} label={opt.label} selected={selected.has(opt.id)} onPress={() => toggle(opt.id)} />
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Tonight’s picks</Text>
        <Text style={styles.cardBody}>
          Based on your selections, we will prioritize romantic lighting, lower noise levels, and sommelier-led lists when
          you use Date Night filters on Discover or Map.
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
  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.25)',
    padding: spacing.lg,
    ...shadows.card,
  },
  cardTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    fontWeight: '700',
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
