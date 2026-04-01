import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ProfileSectionTitle } from '@/components/profile/ProfileSectionTitle';
import { PreferenceChip } from '@/components/profile/PreferenceChip';
import { mockSeatingOptions } from '@/lib/mock/profileScreens';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

export default function SeatingScreen() {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<string>>(() => new Set(['s1']));

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ProfileStackScreen title={t('profile.seatingPreference')} subtitle={t('profile.seatingPreferenceSub')}>
      <Text style={styles.lead}>Select one or more — we share this with the host when a table is assigned.</Text>
      <ProfileSectionTitle>Preferred areas</ProfileSectionTitle>
      <View style={styles.chipWrap}>
        {mockSeatingOptions.map((opt) => (
          <PreferenceChip key={opt.id} label={opt.label} selected={selected.has(opt.id)} onPress={() => toggle(opt.id)} />
        ))}
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>How hosts use this</Text>
        <Text style={styles.cardBody}>
          Requests are subject to availability. For busy nights, arrive on time to keep window or patio holds (demo copy).
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
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.card,
  },
  cardTitle: {
    ...typography.bodyLarge,
    color: colors.gold,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  cardBody: {
    ...typography.bodySmall,
    color: colors.textMuted,
    lineHeight: 20,
  },
});
