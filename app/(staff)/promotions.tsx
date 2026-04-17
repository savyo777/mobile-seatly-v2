import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { MARKETING_ACTIVE, OWNER_PROMO_ROWS } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

export default function OwnerPromotionsScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <SubpageHeader
        title={t('owner.promotionsTitle')}
        subtitle={t('owner.promotionsSubtitle')}
        fallbackTab="more"
      />

      <Text style={styles.section}>{t('owner.promotionsActive')}</Text>
      <GlassCard style={styles.heroCard}>
        <Text style={styles.heroTitle}>{MARKETING_ACTIVE.title}</Text>
        <Text style={styles.heroSub}>{MARKETING_ACTIVE.subtitle}</Text>
      </GlassCard>

      <Text style={styles.section}>{t('owner.promotionsAll')}</Text>
      {OWNER_PROMO_ROWS.map((row, i) => (
        <Animated.View key={row.id} entering={FadeInDown.delay(i * 40)}>
          <GlassCard style={styles.card}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{row.title}</Text>
              <View style={[styles.pill, row.active ? styles.pillOn : styles.pillOff]}>
                <Text style={styles.pillText}>{row.active ? t('owner.promoOn') : t('owner.promoOff')}</Text>
              </View>
            </View>
            <Text style={styles.rowSub}>{row.subtitle}</Text>
          </GlassCard>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: ownerColors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  heroCard: {
    padding: 18,
    marginBottom: 8,
    borderColor: 'rgba(212, 175, 55, 0.28)',
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.gold,
    marginBottom: 6,
  },
  heroSub: {
    fontSize: 14,
    color: ownerColors.textMuted,
    lineHeight: 20,
  },
  card: {
    padding: 16,
    marginBottom: 10,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: ownerColors.text,
    flex: 1,
  },
  pill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
  },
  pillOn: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  pillOff: {
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  pillText: {
    fontSize: 10,
    fontWeight: '800',
    color: ownerColors.textSecondary,
  },
  rowSub: {
    fontSize: 14,
    color: ownerColors.textMuted,
    lineHeight: 20,
  },
});
