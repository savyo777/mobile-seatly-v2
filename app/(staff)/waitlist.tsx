import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { WAITLIST_ENTRIES, WALKIN_QUEUE } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

export default function OwnerWaitlistScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <SubpageHeader
        title={t('owner.waitlistScreenTitle')}
        subtitle={t('owner.waitlistScreenSubtitle')}
        fallbackTab="reservations"
      />

      <Text style={styles.section}>{t('owner.walkInQueue')}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queueRow}>
        {WALKIN_QUEUE.map((q, i) => (
          <Animated.View key={q.id} entering={FadeInDown.delay(i * 40)} style={styles.queueCardWrap}>
            <GlassCard style={styles.queueCard}>
              <Text style={styles.queueName}>{q.name}</Text>
              <Text style={styles.queueMeta}>
                {t('owner.queueParty', { n: q.party })} · {t('owner.queueWait', { mins: q.waitMins })}
              </Text>
            </GlassCard>
          </Animated.View>
        ))}
      </ScrollView>

      <Text style={styles.section}>{t('owner.waitlist')}</Text>
      {WAITLIST_ENTRIES.map((w, i) => (
        <Animated.View key={w.id} entering={FadeInDown.delay(i * 45)}>
          <GlassCard style={styles.waitRow}>
            <Text style={styles.waitName}>{w.name}</Text>
            <Text style={styles.waitMeta}>
              {t('owner.waitParty', { n: w.party })} · {t('owner.waitQuoted', { time: w.quoted })}
            </Text>
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
  queueRow: {
    gap: 12,
    marginBottom: 8,
  },
  queueCardWrap: {
    width: 200,
  },
  queueCard: {
    padding: 14,
    borderColor: 'rgba(212, 175, 55, 0.25)',
  },
  queueName: {
    fontSize: 16,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 6,
  },
  queueMeta: {
    fontSize: 13,
    color: ownerColors.textMuted,
  },
  waitRow: {
    padding: 14,
    marginBottom: 8,
  },
  waitName: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
  },
  waitMeta: {
    fontSize: 13,
    color: ownerColors.textMuted,
    marginTop: 4,
  },
});
