import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { OwnerAlert } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

type Props = {
  alerts: OwnerAlert[];
};

function severityStyle(s: OwnerAlert['severity']) {
  switch (s) {
    case 'critical':
      return { border: 'rgba(239, 68, 68, 0.45)', bg: 'rgba(239, 68, 68, 0.12)' };
    case 'warning':
      return { border: 'rgba(251, 191, 36, 0.4)', bg: 'rgba(251, 191, 36, 0.1)' };
    default:
      return { border: ownerColors.border, bg: ownerColors.bgGlass };
  }
}

export function OwnerAlertsStrip({ alerts }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t('owner.alertsStripTitle')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {alerts.map((a) => {
          const sev = severityStyle(a.severity);
          return (
            <View key={a.id} style={[styles.pill, { borderColor: sev.border, backgroundColor: sev.bg }]}>
              <Text style={styles.pillText}>{a.message}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 1,
    marginBottom: 10,
  },
  row: {
    gap: 10,
    paddingRight: 8,
  },
  pill: {
    maxWidth: 280,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 13,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
});
