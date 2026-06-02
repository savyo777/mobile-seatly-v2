import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  deleteEvent,
  deletePromotion,
  fetchEventAttendees,
  fetchPromotionRedemptions,
  setPromotionActive,
  type EventGuest,
} from '@/lib/owner/eventPromoManage';
// Importing only the shared types from the mock module — no mock data on
// the Promote screen anymore. Lists render from the live promotions /
// events queries, or stay empty.
import { type OwnerEventRow, type OwnerPromotion } from '@/lib/mock/ownerApp';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { fetchUpcomingEvents, type EventRow } from '@/lib/events/getEvents';
import { fetchActivePromotions, type PromotionRow } from '@/lib/promotions/getPromotions';
import { isPromoCreationEnabled } from '@/lib/config/staffFeatures';

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
  // Live-only data. No demo fallback — empty state when nothing has been
  // created. Matches the Promos tab in app/(staff)/promotions/index.tsx.
  const [events, setEvents] = useState<OwnerEventRow[]>([]);
  const [promos, setPromos] = useState<OwnerPromotion[]>([]);

  const reload = useCallback(async () => {
    if (restaurantIds.length === 0) {
      setEvents([]);
      setPromos([]);
      return;
    }
    const [evRows, prRows] = await Promise.all([
      fetchUpcomingEvents({ restaurantIds, includePrivate: true }).catch(() => [] as EventRow[]),
      fetchActivePromotions({ restaurantIds, includePrivate: true }).catch(() => [] as PromotionRow[]),
    ]);
    setEvents(evRows.map(mapEventRow));
    setPromos(prRows.map(mapPromotionRow));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const showGuestList = useCallback(async (title: string, fetcher: Promise<EventGuest[]>, noun: string) => {
    const list = await fetcher;
    if (list.length === 0) {
      Alert.alert(title, `No ${noun} yet.`);
      return;
    }
    const lines = list.slice(0, 12).map((g) => {
      let timeLabel = '';
      if (g.reservedAt) {
        try {
          timeLabel = ` · ${new Date(g.reservedAt).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
        } catch {
          timeLabel = '';
        }
      }
      return `• ${g.guestName} · party ${g.partySize}${timeLabel}`;
    });
    const more = list.length > 12 ? `\n…and ${list.length - 12} more` : '';
    Alert.alert(`${title} · ${list.length} ${noun}`, lines.join('\n') + more);
  }, []);

  const handleEventPress = useCallback((ev: OwnerEventRow) => {
    Alert.alert(ev.title, ev.dateLabel || undefined, [
      { text: 'View attendees', onPress: () => void showGuestList(ev.title, fetchEventAttendees(ev.id), 'attendees') },
      {
        text: 'Delete event',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete event?', `Permanently delete "${ev.title}"? This can't be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deleteEvent(ev.id);
                  await reload();
                } catch (e) {
                  Alert.alert('Could not delete', friendlyError(e, 'It may have reservations attached. Please try again.'));
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [reload, showGuestList]);

  const handlePromoPress = useCallback((promo: OwnerPromotion) => {
    const isLive = promo.status === 'live';
    Alert.alert(promo.name, promo.description || undefined, [
      { text: 'View redemptions', onPress: () => void showGuestList(promo.name, fetchPromotionRedemptions(promo.id), 'redemptions') },
      {
        text: isLive ? 'Pause' : 'Resume',
        onPress: async () => {
          try {
            await setPromotionActive(promo.id, !isLive);
            await reload();
          } catch (e) {
            Alert.alert('Could not update', friendlyError(e, 'Please try again.'));
          }
        },
      },
      {
        text: 'Delete promotion',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete promotion?', `Permanently delete "${promo.name}"? This can't be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Delete',
              style: 'destructive',
              onPress: async () => {
                try {
                  await deletePromotion(promo.id);
                  await reload();
                } catch (e) {
                  Alert.alert('Could not delete', friendlyError(e, 'Please try again.'));
                }
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [reload, showGuestList]);

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
          {isPromoCreationEnabled() ? (
            <Pressable style={styles.newBtn}>
              <Ionicons name="add" size={16} color={c.bgBase} />
              <Text style={styles.newBtnText}>New</Text>
            </Pressable>
          ) : null}
        </View>

        {/* Events */}
        <View style={styles.sectionPad}>
          <Text style={styles.sectionLabel}>Events</Text>
          <View style={styles.eventsCard}>
            {events.map((ev, i) => {
              const sc = eventStatusColors(ev.status);
              return (
                <Pressable
                  key={ev.id}
                  onPress={() => handleEventPress(ev)}
                  style={({ pressed }) => [styles.eventRow, i > 0 && styles.eventDivider, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${ev.title} — manage`}
                >
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
                </Pressable>
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
                <Pressable
                  key={promo.id}
                  onPress={() => handlePromoPress(promo)}
                  style={({ pressed }) => [styles.promoRow, i > 0 && styles.promoDivider, pressed && { opacity: 0.6 }]}
                  accessibilityRole="button"
                  accessibilityLabel={`${promo.name} — manage`}
                >
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
                </Pressable>
              );
            })}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
