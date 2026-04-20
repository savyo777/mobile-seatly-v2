import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import { ToggleRow } from '@/components/profile/ToggleRow';
import { mockRestrictionOptions } from '@/lib/mock/profileScreens';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography, borderRadius, shadows } from '@/lib/theme';

export default function RestrictionsScreen() {
  const { t } = useTranslation();
  const initial = useMemo(() => {
    const on = new Set<string>();
    if (mockCustomer.allergies.some((a) => a.toLowerCase().includes('nut'))) {
      on.add('a1');
      on.add('a2');
    }
    return on;
  }, []);
  const [active, setActive] = useState(initial);

  const toggle = (id: string, v: boolean) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (v) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  return (
    <ProfileStackScreen title={t('profile.dietaryRestrictions')}>
      <Text style={styles.lead}>
        Mark allergies and intolerances so we can flag risky dishes and share alerts with the kitchen when you dine.
      </Text>
      <View style={styles.group}>
        {mockRestrictionOptions.map((opt, i) => (
          <ToggleRow
            key={opt.id}
            title={opt.label}
            subtitle={opt.severity === 'allergy' ? 'Allergy — kitchen alert' : 'Intolerance — preference'}
            value={active.has(opt.id)}
            onValueChange={(v) => toggle(opt.id, v)}
            isLast={i === mockRestrictionOptions.length - 1}
          />
        ))}
      </View>
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Always confirm with your server on arrival. Cenaiva surfaces this information to restaurants you book (demo).
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
  group: {
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSurface,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.card,
  },
  note: {
    padding: spacing.md,
    backgroundColor: 'rgba(201, 168, 76, 0.08)',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)',
  },
  noteText: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
