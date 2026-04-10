import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { KDS_TICKETS, LIVE_FEED, type KdsTicket } from '@/lib/mock/ownerApp';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

function statusLabel(t: (k: string) => string, s: KdsTicket['status']) {
  if (s === 'ready') return t('owner.kdsReady');
  if (s === 'in_progress') return t('owner.kdsInProgress');
  return t('owner.kdsFired');
}

function statusStyle(s: KdsTicket['status']) {
  if (s === 'ready') return { borderColor: 'rgba(34, 197, 94, 0.45)', backgroundColor: 'rgba(34, 197, 94, 0.12)' };
  if (s === 'in_progress') return { borderColor: 'rgba(212, 175, 55, 0.5)', backgroundColor: ownerColors.goldSubtle };
  return { borderColor: ownerColors.border, backgroundColor: ownerColors.bgGlass };
}

export default function OwnerOrdersKdsScreen() {
  const { t } = useTranslation();

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('owner.ordersKdsTitle')}</Text>
      <Text style={styles.sub}>{t('owner.ordersKdsSubtitle')}</Text>

      <Text style={styles.section}>{t('owner.kdsTicketsTitle')}</Text>
      {KDS_TICKETS.map((ticket, i) => (
        <Animated.View key={ticket.id} entering={FadeInDown.delay(i * 40)}>
          <GlassCard style={styles.ticketCard}>
            <View style={styles.ticketTop}>
              <Text style={styles.station}>{ticket.station}</Text>
              <Text style={styles.table}>{ticket.table}</Text>
            </View>
            <Text style={styles.items}>{ticket.items}</Text>
            <View style={[styles.statusPill, statusStyle(ticket.status)]}>
              <Text style={styles.statusText}>{statusLabel(t, ticket.status)}</Text>
              {ticket.mins > 0 ? <Text style={styles.mins}> · {ticket.mins}m</Text> : null}
            </View>
          </GlassCard>
        </Animated.View>
      ))}

      <Text style={styles.section}>{t('owner.liveFeedTitle')}</Text>
      {LIVE_FEED.map((item, i) => (
        <Animated.View key={item.id} entering={FadeInDown.delay(120 + i * 35)}>
          <GlassCard style={styles.feedCard}>
            <Text style={styles.feedTime}>{item.timeLabel}</Text>
            <Text style={styles.feedMsg}>{item.message}</Text>
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
  section: {
    fontSize: 13,
    fontWeight: '800',
    color: ownerColors.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 8,
  },
  ticketCard: {
    padding: 16,
    marginBottom: 10,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  station: {
    fontSize: 12,
    fontWeight: '800',
    color: ownerColors.gold,
    letterSpacing: 0.8,
  },
  table: {
    fontSize: 14,
    fontWeight: '800',
    color: ownerColors.text,
  },
  items: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    lineHeight: 22,
  },
  statusPill: {
    alignSelf: 'flex-start',
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
    color: ownerColors.text,
  },
  mins: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.textMuted,
  },
  feedCard: {
    padding: 14,
    marginBottom: 8,
  },
  feedTime: {
    fontSize: 12,
    fontWeight: '800',
    color: ownerColors.textMuted,
    marginBottom: 4,
  },
  feedMsg: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.textSecondary,
  },
});
