import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { RevenueHero } from '@/components/owner/RevenueHero';
import { AIInsightsCard } from '@/components/owner/AIInsightsCard';
import { QuickActions } from '@/components/owner/QuickActions';
import { LiveTimeline } from '@/components/owner/LiveTimeline';
import { OwnerLiveMetrics } from '@/components/owner/OwnerLiveMetrics';
import { OwnerLiveFeed } from '@/components/owner/OwnerLiveFeed';
import { OwnerAlertsStrip } from '@/components/owner/OwnerAlertsStrip';
import {
  AI_INSIGHTS_HOME,
  LIVE_FEED,
  LIVE_TIMELINE,
  MARKETING_ACTIVE,
  OPERATIONS_PULSE,
  OWNER_ALERTS_STRIP,
  OWNER_FIRST_NAME,
  RECEIPTS_EXPORT_HINT,
  TONIGHT_SUMMARY,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { GlassCard } from '@/components/owner/GlassCard';

export default function OwnerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [period, setPeriod] = useState<RevenuePeriod>('day');

  const summary = t('owner.tonightSummary', {
    revenue: formatCurrency(TONIGHT_SUMMARY.revenue, 'cad'),
    guests: TONIGHT_SUMMARY.guests,
    risks: TONIGHT_SUMMARY.risks,
  });

  return (
    <OwnerScreen>
      <Animated.View entering={FadeInDown.duration(420).springify()}>
        <Text style={styles.greeting}>{t('owner.goodEvening', { name: OWNER_FIRST_NAME })}</Text>
        <Text style={styles.sub}>{summary}</Text>
      </Animated.View>

      <OwnerAlertsStrip alerts={OWNER_ALERTS_STRIP} />

      <RevenueHero period={period} onPeriodChange={setPeriod} />

      <OwnerLiveMetrics />

      <OwnerLiveFeed items={LIVE_FEED} />

      <AIInsightsCard title={t('owner.aiInsightsTitle')} bullets={AI_INSIGHTS_HOME} />

      <View style={styles.sectionLabelWrap}>
        <Text style={styles.sectionLabel}>{t('owner.operationsTitle')}</Text>
      </View>
      <GlassCard style={styles.opsCard}>
        {OPERATIONS_PULSE.map((op, i) => (
          <Text key={op.id} style={[styles.opsLine, i > 0 && styles.opsBorder]}>
            {op.message}
          </Text>
        ))}
      </GlassCard>

      <Text style={styles.sectionLabel}>{t('owner.marketingTitle')}</Text>
      <GlassCard style={styles.promoCard}>
        <Text style={styles.promoTitle}>{MARKETING_ACTIVE.title}</Text>
        <Text style={styles.promoSub}>{MARKETING_ACTIVE.subtitle}</Text>
        <Pressable style={({ pressed }) => [styles.promoBtn, pressed && styles.pressed]}>
          <Text style={styles.promoBtnText}>{t('owner.marketingEdit')}</Text>
        </Pressable>
      </GlassCard>

      <Pressable style={({ pressed }) => [styles.receiptRow, pressed && styles.pressed]}>
        <Text style={styles.receiptText}>{RECEIPTS_EXPORT_HINT}</Text>
        <Text style={styles.receiptArrow}>›</Text>
      </Pressable>

      <QuickActions
        actions={[
          { key: 'res', label: t('owner.quickAddReservation'), onPress: () => router.push('/(staff)/reservations') },
          { key: 'walk', label: t('owner.quickWalkIn'), onPress: () => router.push('/(staff)/reservations') },
          { key: 'open', label: t('owner.quickOpenTable'), onPress: () => router.push('/(staff)/floor') },
          { key: 'floor', label: t('owner.quickViewFloor'), onPress: () => router.push('/(staff)/floor') },
        ]}
      />

      <LiveTimeline entries={LIVE_TIMELINE} />

      <View style={{ height: 12 }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  greeting: {
    fontSize: 32,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.8,
    marginBottom: 8,
  },
  sub: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    marginBottom: 14,
  },
  sectionLabelWrap: {
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 12,
    marginTop: 8,
  },
  opsCard: {
    padding: 16,
    marginBottom: 8,
  },
  opsLine: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    paddingVertical: 10,
  },
  opsBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  promoCard: {
    padding: 18,
    marginBottom: 16,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  promoTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.gold,
    marginBottom: 6,
  },
  promoSub: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginBottom: 14,
    lineHeight: 20,
  },
  promoBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.gold,
  },
  promoBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: ownerColors.gold,
  },
  receiptRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  receiptText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
  receiptArrow: {
    fontSize: 22,
    color: ownerColors.gold,
    fontWeight: '300',
  },
  pressed: {
    opacity: 0.88,
  },
});
