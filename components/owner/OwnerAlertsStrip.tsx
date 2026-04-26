import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OwnerAlert } from '@/lib/mock/ownerApp';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { OwnerSectionLabel } from './OwnerSectionLabel';

type Props = {
  alerts: OwnerAlert[];
};

type OwnerColors = ReturnType<typeof ownerColorsFromPalette>;

function severityStyle(s: OwnerAlert['severity'], ownerColors: OwnerColors) {
  switch (s) {
    case 'critical':
      return { bg: 'rgba(239, 68, 68, 0.1)' };
    case 'warning':
      return { bg: 'rgba(251, 191, 36, 0.08)' };
    default:
      return { bg: ownerColors.bgGlass };
  }
}

export function OwnerAlertsStrip({ alerts }: Props) {
  const { t } = useTranslation();
  const ownerColors = useOwnerColors();
  const styles = useStyles();

  if (alerts.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <OwnerSectionLabel marginBottom={ownerSpace.xs}>{t('owner.alertsStripTitle')}</OwnerSectionLabel>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {alerts.map((a) => {
          const sev = severityStyle(a.severity, ownerColors);
          return (
            <View key={a.id} style={[styles.chip, { backgroundColor: sev.bg }]}>
              <Text style={styles.chipText} numberOfLines={2}>
                {a.message}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  wrap: {
    marginBottom: ownerSpace.md,
  },
  row: {
    gap: ownerSpace.xs,
    paddingRight: ownerSpace.xs,
    paddingVertical: 2,
  },
  chip: {
    maxWidth: 260,
    paddingVertical: ownerSpace.xs,
    paddingHorizontal: ownerSpace.sm,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    lineHeight: 17,
  },
  };
});
