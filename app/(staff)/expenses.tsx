import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { EXPENSE_LINES } from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors } from '@/lib/theme/ownerTheme';

export default function OwnerExpensesScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <SubpageHeader
        title={t('owner.expensesTitle')}
        subtitle={t('owner.expensesSubtitle')}
        fallbackTab="more"
      />

      {EXPENSE_LINES.map((line, i) => (
        <Animated.View key={line.id} entering={FadeInDown.delay(i * 40)}>
          <GlassCard style={styles.card}>
            <View style={styles.row}>
              <View style={styles.left}>
                <Text style={styles.label}>{line.label}</Text>
                <Text style={styles.period}>{line.period}</Text>
              </View>
              <Text style={styles.amount}>{formatCurrency(line.amount, 'cad')}</Text>
            </View>
          </GlassCard>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  left: {
    flex: 1,
    minWidth: 0,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
  },
  period: {
    fontSize: 13,
    color: ownerColors.textMuted,
    marginTop: 4,
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.gold,
  },
});
