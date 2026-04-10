import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { CRM_SPOTLIGHT } from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

export default function OwnerCrmScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('owner.crmScreenTitle')}</Text>
      <Text style={styles.sub}>{t('owner.crmScreenSubtitle')}</Text>

      {CRM_SPOTLIGHT.map((c, i) => (
        <Animated.View key={c.id} entering={FadeInDown.delay(i * 45)}>
          <GlassCard style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.name}>{c.name}</Text>
              {c.vip ? (
                <View style={styles.vipPill}>
                  <Text style={styles.vipText}>{t('owner.crmVip')}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.meta}>
              {t('owner.crmVisits', { count: c.visits })} · {t('owner.crmAvg', { amount: formatCurrency(c.avgSpend, 'cad') })}{' '}
              · {c.frequency}
            </Text>
            <Text style={styles.pref}>
              {t('owner.crmPref')}: {c.preference}
            </Text>
          </GlassCard>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: 16,
  },
  card: {
    padding: 16,
    marginBottom: 10,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    flex: 1,
  },
  vipPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  vipText: {
    fontSize: 10,
    fontWeight: '800',
    color: ownerColors.gold,
    letterSpacing: 0.5,
  },
  meta: {
    fontSize: 14,
    color: ownerColors.textMuted,
    lineHeight: 20,
  },
  pref: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    marginTop: 10,
  },
});
