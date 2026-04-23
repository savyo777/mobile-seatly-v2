import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { OWNER_EVENTS } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

function statusKey(s: (typeof OWNER_EVENTS)[0]['status']) {
  if (s === 'live') return 'owner.eventStatusLive';
  if (s === 'sold_out') return 'owner.eventStatusSoldOut';
  return 'owner.eventStatusDraft';
}

export default function OwnerEventsScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <SubpageHeader
        title={t('owner.eventsTitle')}
        subtitle={t('owner.eventsSubtitle')}
        fallbackTab="more"
      />

      {OWNER_EVENTS.map((ev, i) => (
        <Animated.View key={ev.id} entering={FadeInDown.delay(i * 40)}>
          <GlassCard style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t(statusKey(ev.status))}</Text>
              </View>
            </View>
            <Text style={styles.date}>{ev.dateLabel}</Text>
            <Text style={styles.rsvp}>{t('owner.eventRsvp', { count: ev.rsvp })}</Text>
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
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: ownerColors.textSecondary,
    letterSpacing: 0.4,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.gold,
  },
  rsvp: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginTop: 6,
  },
});
