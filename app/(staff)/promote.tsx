import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  OWNER_EVENTS as DEMO_OWNER_EVENTS,
  OWNER_PROMOTIONS as DEMO_OWNER_PROMOTIONS,
  type OwnerEventRow,
  type OwnerPromotion,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { fetchUpcomingEvents, type EventRow } from '@/lib/events/getEvents';
import { fetchActivePromotions, type PromotionRow } from '@/lib/promotions/getPromotions';

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  titleBlock: {},
  topSubline: { fontSize: 13, fontWeight: '500', color: c.textMuted, marginBottom: 2 },
  title: { fontSize: 28, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.5 },

  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  newBtnText: { fontSize: 13, fontWeight: '700', color: c.bgBase },

  sectionPad: { paddingHorizontal: spacing.lg, marginBottom: spacing.md },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
    marginBottom: spacing.sm,
  },

  // Event rows
  eventsCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  eventRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  eventDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  eventInfo: { flex: 1 },
  eventTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  eventMeta: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  // Promo rows
  promoCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
  },
  promoDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  promoInfo: { flex: 1 },
  promoName: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  promoDesc: { fontSize: 12, color: c.textMuted, marginTop: 2 },
  promoMeta: { fontSize: 11, color: c.textMuted, marginTop: 3 },
  promoRight: { alignItems: 'flex-end', gap: 4, marginTop: 2 },
  redemptions: { fontSize: 13, fontWeight: '700', color: c.textPrimary },
  redemptionsLabel: { fontSize: 10, color: c.textMuted },
}));

function eventStatusColors(status: OwnerEventRow['status']): { bg: string; text: string } {
  switch (status) {
    case 'live': return { bg: 'rgba(34,197,94,0.12)', text: '#22C55E' };
    case 'sold_out': return { bg: 'rgba(239,68,68,0.12)', text: '#EF4444' };
    default: return { bg: 'rgba(113,113,122,0.12)', text: '#71717A' };
  }
}

function promoStatusColors(status: OwnerPromotion['status']): { bg: string; text: string } {
  switch (status) {
    case 'live': return { bg: 'rgba(34,197,94,0.12)', text: '#22C55E' };
    case 'scheduled': return { bg: 'rgba(59,130,246,0.12)', text: '#3B82F6' };
    case 'paused': return { bg: 'rgba(234,179,8,0.12)', text: '#EAB308' };
    case 'expired': return { bg: 'rgba(113,113,122,0.12)', text: '#71717A' };
    default: return { bg: 'rgba(113,113,122,0.12)', text: '#71717A' };
  }
}

function mapEventRow(row: EventRow): OwnerEventRow {
  const sold = row.tickets_sold ?? 0;
  const capacity = row.capacity ?? 0;
  const status: OwnerEventRow['status'] =
    !row.is_active ? 'draft' : capacity > 0 && sold >= capacity ? 'sold_out' : 'live';
  let dateLabel = '';
  if (row.date) {
    const d = new Date(row.date + (row.start_time ? `T${row.start_time}` : 'T00:00:00'));
    if (!Number.isNaN(d.getTime())) {
      dateLabel = d.toLocaleString(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } else {
      dateLabel = row.date;
    }
  }
  return { id: row.id, title: row.name, dateLabel, rsvp: sold, status };
}

function mapPromotionRow(row: PromotionRow): OwnerPromotion {
  const valueStr = row.discount_value != null
    ? row.discount_unit === 'percentage' || row.promo_type === 'percentage'
      ? `${row.discount_value}% off`
      : `$${row.discount_value} off`
    : '';
  return {
    id: row.id,
    name: row.title,
    type: (row.promo_type ?? 'percentage_off') as OwnerPromotion['type'],
    startDate: row.starts_at ?? '',
    endDate: row.ends_at ?? '',
    startTime: '',
    endTime: '',
    daysOfWeek: [],
    appliesTo: { dineIn: true, takeout: false, bar: false, patio: false, menuItems: false, guestGroups: false },
    autoApply: false,
    description: row.description ?? valueStr,
    status: row.is_active ? 'live' : 'expired',
    targetAudience: '',
    whereApplies: '',
    analytics: { redemptions: row.current_uses ?? 0, guestsReached: 0, revenueGenerated: 0 },
    estimatedLiftPct: 0,
    offerTag: valueStr,
    coverImage: row.cover_image_url ?? undefined,
  };
}

export default function OwnerPromoteScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { restaurantIds } = useOwnerScope();
  const restaurantIdsKey = restaurantIds.join('|');
  const [liveEvents, setLiveEvents] = useState<OwnerEventRow[]>(
    isDemoModeEnabled() ? DEMO_OWNER_EVENTS : [],
  );
  const [livePromos, setLivePromos] = useState<OwnerPromotion[]>(
    isDemoModeEnabled() ? DEMO_OWNER_PROMOTIONS : [],
  );

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (restaurantIds.length === 0) {
      setLiveEvents([]);
      setLivePromos([]);
      return;
    }
    let active = true;
    void (async () => {
      const [evRows, prRows] = await Promise.all([
        fetchUpcomingEvents({ restaurantIds, includePrivate: true }).catch(() => [] as EventRow[]),
        fetchActivePromotions({ restaurantIds, includePrivate: true }).catch(() => [] as PromotionRow[]),
      ]);
      if (!active) return;
      setLiveEvents(evRows.map(mapEventRow));
      setLivePromos(prRows.map(mapPromotionRow));
    })();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey]);

  const events = isDemoModeEnabled() ? DEMO_OWNER_EVENTS : liveEvents;
  const promos = isDemoModeEnabled() ? DEMO_OWNER_PROMOTIONS : livePromos;

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.md, paddingBottom: spacing.lg }}
      >
        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.titleBlock}>
            <Text style={styles.topSubline}>Marketing</Text>
            <Text style={styles.title}>Promote</Text>
          </View>
          <Pressable style={styles.newBtn}>
            <Ionicons name="add" size={16} color={c.bgBase} />
            <Text style={styles.newBtnText}>New</Text>
          </Pressable>
        </View>

        {/* Events */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Events</Text>
          <View style={styles.eventsCard}>
            {events.map((ev, i) => {
              const sc = eventStatusColors(ev.status);
              return (
                <View key={ev.id} style={[styles.eventRow, i > 0 && styles.eventDivider]}>
                  <Ionicons name="ticket-outline" size={20} color={c.gold} />
                  <View style={styles.eventInfo}>
                    <Text style={styles.eventTitle}>{ev.title}</Text>
                    <Text style={styles.eventMeta}>{ev.dateLabel} · {ev.rsvp} RSVPs</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusText, { color: sc.text }]}>
                      {ev.status.replace('_', ' ').charAt(0).toUpperCase() + ev.status.replace('_', ' ').slice(1)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Promotions */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Promotions</Text>
          <View style={styles.promoCard}>
            {promos.map((promo, i) => {
              const sc = promoStatusColors(promo.status);
              return (
                <View key={promo.id} style={[styles.promoRow, i > 0 && styles.promoDivider]}>
                  <Ionicons name="megaphone-outline" size={20} color={c.gold} />
                  <View style={styles.promoInfo}>
                    <Text style={styles.promoName}>{promo.name}</Text>
                    <Text style={styles.promoDesc}>{promo.description}</Text>
                    <Text style={styles.promoMeta}>{promo.startTime}–{promo.endTime} · {promo.targetAudience}</Text>
                  </View>
                  <View style={styles.promoRight}>
                    <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                      <Text style={[styles.statusText, { color: sc.text }]}>
                        {promo.status.charAt(0).toUpperCase() + promo.status.slice(1)}
                      </Text>
                    </View>
                    {promo.analytics.redemptions > 0 && (
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={styles.redemptions}>{promo.analytics.redemptions}</Text>
                        <Text style={styles.redemptionsLabel}>redemptions</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
