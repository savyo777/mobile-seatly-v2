import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { RevenueHero } from '@/components/owner/RevenueHero';
import { AIInsightsCard } from '@/components/owner/AIInsightsCard';
import { QuickActions } from '@/components/owner/QuickActions';
import { OwnerLiveMetrics } from '@/components/owner/OwnerLiveMetrics';
import { OwnerLiveFeed } from '@/components/owner/OwnerLiveFeed';
import { OwnerAlertsStrip } from '@/components/owner/OwnerAlertsStrip';
import {
  AI_INSIGHTS_HOME,
  LIVE_FEED,
  OWNER_ALERTS_STRIP,
  OWNER_FIRST_NAME,
  TONIGHT_SUMMARY,
  type RevenuePeriod,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

const FEED_PREVIEW = 3;
const ALERTS_MAX = 2;

export default function OwnerHomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const [period, setPeriod] = useState<RevenuePeriod>('day');

  const summary = t('owner.tonightSummary', {
    revenue: formatCurrency(TONIGHT_SUMMARY.revenue, 'cad'),
    guests: TONIGHT_SUMMARY.guests,
    risks: TONIGHT_SUMMARY.risks,
  });

  const alerts = useMemo(() => OWNER_ALERTS_STRIP.slice(0, ALERTS_MAX), []);
  const feedPreview = useMemo(() => LIVE_FEED.slice(0, FEED_PREVIEW), []);

  return (
    <OwnerScreen contentContainerStyle={styles.scrollTight}>
      <Animated.View entering={FadeInDown.duration(380).springify()}>
        <Text style={styles.greeting}>{t('owner.goodEvening', { name: OWNER_FIRST_NAME })}</Text>
        <Text style={styles.sub}>{summary}</Text>
      </Animated.View>

      <RevenueHero period={period} onPeriodChange={setPeriod} />

      <QuickActions
        actions={[
          { key: 'res', label: t('owner.quickAddReservation'), onPress: () => router.push('/(staff)/reservations') },
          { key: 'walk', label: t('owner.quickWalkIn'), onPress: () => router.push('/(staff)/reservations') },
          { key: 'open', label: t('owner.quickOpenTable'), onPress: () => router.push('/(staff)/floor') },
          { key: 'floor', label: t('owner.quickViewFloor'), onPress: () => router.push('/(staff)/floor') },
        ]}
      />

      <OwnerAlertsStrip alerts={alerts} />

      <OwnerLiveMetrics />

      <OwnerLiveFeed
        items={feedPreview}
        onViewAll={LIVE_FEED.length > FEED_PREVIEW ? () => router.push('/(staff)/reservations') : undefined}
        viewAllLabel={t('owner.overviewViewAll')}
      />

      <AIInsightsCard
        title={t('owner.aiInsightsTitle')}
        insight={AI_INSIGHTS_HOME[0] ?? ''}
        onSeeMore={() => router.push('/(staff)/ai')}
        seeMoreLabel={t('owner.overviewSeeMoreAi')}
      />

      <View style={{ height: ownerSpace.sm }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  scrollTight: {
    paddingTop: 4,
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.5,
    marginBottom: ownerSpace.xs,
  },
  sub: {
    fontSize: 15,
    fontWeight: '500',
    color: ownerColors.textSecondary,
    marginBottom: ownerSpace.sm,
    lineHeight: 22,
  },
});
