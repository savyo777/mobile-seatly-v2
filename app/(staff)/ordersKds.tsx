import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Swipeable } from 'react-native-gesture-handler';
import { BlurView } from 'expo-blur';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import {
  KDS_TICKETS as DEMO_KDS_TICKETS,
  LIVE_FEED as DEMO_LIVE_FEED,
  type KdsTicket,
  type LiveFeedKind,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { getSupabase } from '@/lib/supabase/client';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';

const KDS_TICKETS: typeof DEMO_KDS_TICKETS = isDemoModeEnabled() ? DEMO_KDS_TICKETS : [];
const LIVE_FEED: typeof DEMO_LIVE_FEED = isDemoModeEnabled() ? DEMO_LIVE_FEED : [];
import { createStyles, useTheme } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii, ownerSpace, useOwnerColors } from '@/lib/theme/ownerTheme';
import { DELAYED_TICKET_MINUTES } from '@/lib/owner/kdsThresholds';

const DELAYED_MINS = DELAYED_TICKET_MINUTES;

function ticketIsDelayed(t: KdsTicket): boolean {
  if (t.status === 'ready') return false;
  if (t.delayed) return true;
  if (t.status === 'in_progress') return t.mins >= DELAYED_MINS;
  return false;
}

type OwnerColors = ReturnType<typeof ownerColorsFromPalette>;
type Styles = ReturnType<typeof useStyles>;

function leftAccentColor(t: KdsTicket, ownerColors: OwnerColors): string {
  if (ticketIsDelayed(t)) return ownerColors.danger;
  if (t.status === 'ready') return ownerColors.success;
  if (t.status === 'in_progress') return ownerColors.gold;
  return ownerColors.textMuted;
}

function stationKey(station: KdsTicket['station']): string {
  const m = { Kitchen: 'owner.kdsStationKitchen', Bar: 'owner.kdsStationBar', Dessert: 'owner.kdsStationDessert' } as const;
  return m[station];
}

function statusLabelKey(t: KdsTicket, tFn: (k: string) => string): string {
  if (ticketIsDelayed(t) && t.status !== 'ready') return 'owner.kdsStatusDelayed';
  if (t.status === 'ready') return 'owner.kdsReady';
  if (t.status === 'in_progress') return 'owner.kdsInProgress';
  return 'owner.kdsFired';
}

function statusPillStyle(t: KdsTicket, styles: Styles) {
  if (ticketIsDelayed(t) && t.status !== 'ready') return styles.pillDelayed;
  if (t.status === 'ready') return styles.pillReady;
  if (t.status === 'in_progress') return styles.pillProgress;
  return styles.pillFired;
}

function feedDotColor(kind: LiveFeedKind, ownerColors: OwnerColors): string {
  switch (kind) {
    case 'seated':
      return ownerColors.success;
    case 'arrived':
      return ownerColors.gold;
    case 'alert':
      return ownerColors.danger;
    default:
      return ownerColors.textMuted;
  }
}

function KdsBackdrop({ onPress }: { onPress: () => void }) {
  const { effective } = useTheme();
  const styles = useStyles();
  return (
    <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
      {Platform.OS === 'web' ? (
        <View style={[StyleSheet.absoluteFillObject, styles.modalDim]} />
      ) : (
        <BlurView intensity={40} tint={effective === 'light' ? 'light' : 'dark'} style={StyleSheet.absoluteFillObject} />
      )}
      <Pressable style={StyleSheet.absoluteFillObject} onPress={onPress} accessibilityRole="button" />
    </View>
  );
}

function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.floor((Date.now() - t) / 60000));
}

function orderStatusToKds(s: string | null | undefined): KdsTicket['status'] {
  switch ((s ?? '').toLowerCase()) {
    case 'ready':
    case 'served':
      return 'ready';
    case 'in_progress':
    case 'preparing':
    case 'cooking':
      return 'in_progress';
    default:
      return 'fired';
  }
}

type OrderRowSubset = {
  id: string;
  table_id: string | null;
  status: string | null;
  created_at: string | null;
  notes?: string | null;
};

async function fetchKdsForRestaurant(restaurantId: string): Promise<KdsTicket[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data: orderRows, error } = await supabase
    .from('orders')
    .select('id,table_id,status,created_at,notes')
    .eq('restaurant_id', restaurantId)
    .in('status', ['open', 'in_progress', 'fired', 'preparing', 'ready'])
    .order('created_at', { ascending: true });
  if (error || !orderRows) return [];
  const orders = orderRows as OrderRowSubset[];
  const orderIds = orders.map((o) => o.id);
  if (!orderIds.length) return [];

  const { data: itemRows } = await supabase
    .from('order_items')
    .select('id,order_id,name,quantity,course,status')
    .in('order_id', orderIds);

  const itemIds = (itemRows ?? []).map((r) => String((r as Record<string, unknown>).id ?? '')).filter(Boolean);
  let modifierByItem = new Map<string, string[]>();
  if (itemIds.length) {
    const { data: modRows } = await supabase
      .from('order_item_modifiers')
      .select('order_item_id,modifier_option_id,quantity')
      .in('order_item_id', itemIds);
    (modRows ?? []).forEach((row) => {
      const r = row as Record<string, unknown>;
      const itemId = String(r.order_item_id ?? '');
      if (!itemId) return;
      const list = modifierByItem.get(itemId) ?? [];
      list.push(String(r.modifier_option_id ?? ''));
      modifierByItem.set(itemId, list);
    });
  }

  const tableLabelById = new Map<string, string>();
  const tableIds = Array.from(new Set(orders.map((o) => o.table_id).filter((v): v is string => !!v)));
  if (tableIds.length) {
    const { data: tableRows } = await supabase
      .from('tables')
      .select('id,label,table_number')
      .in('id', tableIds);
    (tableRows ?? []).forEach((row) => {
      const r = row as Record<string, unknown>;
      const id = String(r.id ?? '');
      const label =
        (typeof r.label === 'string' && r.label) ||
        (typeof r.table_number === 'string' && r.table_number) ||
        id.slice(0, 4);
      if (id) tableLabelById.set(id, String(label));
    });
  }

  const itemsByOrder = new Map<string, Array<Record<string, unknown>>>();
  (itemRows ?? []).forEach((row) => {
    const r = row as Record<string, unknown>;
    const orderId = String(r.order_id ?? '');
    if (!orderId) return;
    const list = itemsByOrder.get(orderId) ?? [];
    list.push(r);
    itemsByOrder.set(orderId, list);
  });

  return orders.map<KdsTicket>((order) => {
    const items = itemsByOrder.get(order.id) ?? [];
    const itemsText = items
      .map((it) => {
        const qty = typeof it.quantity === 'number' ? it.quantity : Number(it.quantity ?? 1);
        const name = typeof it.name === 'string' ? it.name : 'Item';
        const mods = modifierByItem.get(String(it.id ?? '')) ?? [];
        const modSuffix = mods.length ? ` (+${mods.length})` : '';
        return `${qty}× ${name}${modSuffix}`;
      })
      .join(' · ') || 'No items';
    const courses = new Set(items.map((it) => typeof it.course === 'string' ? it.course.toLowerCase() : '').filter(Boolean));
    let station: KdsTicket['station'] = 'Kitchen';
    if (courses.has('drinks') || courses.has('bar')) station = 'Bar';
    else if (courses.has('dessert')) station = 'Dessert';
    return {
      id: order.id,
      station,
      table: order.table_id ? (tableLabelById.get(order.table_id) ?? order.table_id.slice(0, 4)) : '—',
      items: itemsText,
      status: orderStatusToKds(order.status),
      mins: minutesSince(order.created_at),
    };
  });
}

export default function OwnerOrdersKdsScreen() {
  const { t } = useTranslation();
  const ownerColors = useOwnerColors();
  const styles = useStyles();
  const [tickets, setTickets] = useState<KdsTicket[]>(() => [...KDS_TICKETS]);
  const [detail, setDetail] = useState<KdsTicket | null>(null);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const refresh = useCallback(async (rid: string) => {
    const rows = await fetchKdsForRestaurant(rid);
    setTickets(rows);
  }, []);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      try {
        const owner = await fetchCurrentOwnerRestaurant();
        if (!active || !owner?.id) return;
        setRestaurantId(owner.id);
        await refresh(owner.id);
      } catch {
        // silent
      }
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    if (!restaurantId || isDemoModeEnabled()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    const channel = supabase
      .channel(`orders-kds:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          void refresh(restaurantId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [restaurantId, refresh]);

  const metrics = useMemo(() => {
    const active = tickets.filter((x) => x.status === 'in_progress' || x.status === 'fired');
    const activeCount = active.length;
    const avgMins =
      active.length === 0
        ? null
        : Math.round(active.reduce((s, x) => s + x.mins, 0) / active.length);
    const delayedCount = tickets.filter((x) => ticketIsDelayed(x)).length;
    return { activeCount, avgMins, delayedCount };
  }, [tickets]);

  const persistOrderStatus = useCallback((id: string, status: string) => {
    if (isDemoModeEnabled()) return;
    const supabase = getSupabase();
    if (!supabase) return;
    void supabase.from('orders').update({ status }).eq('id', id);
  }, []);

  const markReady = useCallback((id: string) => {
    setTickets((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'ready' as const, mins: 0, delayed: false } : x)),
    );
    persistOrderStatus(id, 'ready');
  }, [persistOrderStatus]);

  const markFired = useCallback((id: string) => {
    setTickets((prev) =>
      prev.map((x) => (x.id === id ? { ...x, status: 'fired' as const, delayed: false } : x)),
    );
    persistOrderStatus(id, 'fired');
  }, [persistOrderStatus]);

  const completeTicket = useCallback((id: string) => {
    setTickets((prev) => prev.filter((x) => x.id !== id));
    setDetail((d) => (d?.id === id ? null : d));
    persistOrderStatus(id, 'completed');
  }, [persistOrderStatus]);

  const openMenu = useCallback(() => {
    Alert.alert(t('owner.ordersKdsTitle'), undefined, [
      {
        text: t('owner.kdsMenuRefresh'),
        onPress: () => {
          if (isDemoModeEnabled()) {
            setTickets([...KDS_TICKETS]);
          } else if (restaurantId) {
            void refresh(restaurantId);
          }
        },
      },
      {
        text: t('owner.settingsAccount'),
        onPress: () => Alert.alert(t('owner.settingsAccount'), t('owner.kdsComingSoon')),
      },
      { text: t('owner.menuCancel'), style: 'cancel' },
    ]);
  }, [t, restaurantId, refresh]);

  const headerRight = (
    <Pressable
      onPress={openMenu}
      style={({ pressed }) => [styles.headerIconBtn, pressed && styles.headerIconPressed]}
      accessibilityRole="button"
      accessibilityLabel={t('owner.kdsOverflowMenu')}
    >
      <Ionicons name="ellipsis-horizontal" size={20} color={ownerColors.gold} />
    </Pressable>
  );

  const renderSwipeActions = (ticket: KdsTicket) => (
    <View style={styles.swipeActions}>
      <Pressable
        onPress={() => markReady(ticket.id)}
        style={({ pressed }) => [styles.swipeBtn, styles.swipeReady, pressed && styles.swipePressed]}
      >
        <Text style={styles.swipeBtnText}>{t('owner.kdsSwipeReady')}</Text>
      </Pressable>
      <Pressable
        onPress={() => markFired(ticket.id)}
        style={({ pressed }) => [styles.swipeBtn, styles.swipeFired, pressed && styles.swipePressed]}
      >
        <Text style={styles.swipeBtnText}>{t('owner.kdsSwipeFired')}</Text>
      </Pressable>
      <Pressable
        onPress={() => completeTicket(ticket.id)}
        style={({ pressed }) => [styles.swipeBtn, styles.swipeDone, pressed && styles.swipePressed]}
      >
        <Text style={styles.swipeBtnText}>{t('owner.kdsSwipeComplete')}</Text>
      </Pressable>
    </View>
  );

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={t('owner.ordersKdsTitle')}
          subtitle={t('owner.ordersKdsSubtitle')}
          fallbackTab="reservations"
          rightAction={headerRight}
        />
      }
    >
      <View style={styles.summaryRow}>
        <Text style={styles.summaryText}>{t('owner.kdsSummaryActive', { count: metrics.activeCount })}</Text>
        <Text style={styles.summarySep}>·</Text>
        <Text style={styles.summaryText}>
          {metrics.avgMins != null ? t('owner.kdsSummaryAvgPrep', { mins: metrics.avgMins }) : t('owner.kdsSummaryAvgPlaceholder')}
        </Text>
        <Text style={styles.summarySep}>·</Text>
        <Text style={[styles.summaryText, metrics.delayedCount > 0 && styles.summaryDelayed]}>
          {t('owner.kdsSummaryDelayed', { count: metrics.delayedCount })}
        </Text>
      </View>

      <Text style={styles.sectionLabel}>{t('owner.kdsTicketsTitle')}</Text>

      {tickets.length === 0 ? (
        <Text style={styles.emptyTickets}>{t('common.noResults')}</Text>
      ) : (
        tickets.map((ticket, i) => (
          <Animated.View key={ticket.id} entering={FadeInDown.delay(i * 38).springify()}>
            <Swipeable friction={2} overshootRight={false} renderRightActions={() => renderSwipeActions(ticket)}>
              <Pressable onPress={() => setDetail(ticket)} style={({ pressed }) => [pressed && styles.cardPressed]}>
                <View style={styles.ticketCard}>
                  <View style={[styles.ticketAccent, { backgroundColor: leftAccentColor(ticket, ownerColors) }]} />
                  <View style={styles.ticketInner}>
                    <View style={styles.ticketTop}>
                      <Text style={styles.stationLabel}>{t(stationKey(ticket.station))}</Text>
                      <Text style={styles.tableLabel}>{ticket.table}</Text>
                    </View>
                    <Text style={styles.itemsText}>{ticket.items}</Text>
                    <View style={styles.ticketBottom}>
                      <View style={[styles.statusPill, statusPillStyle(ticket, styles)]}>
                        <Text style={[styles.statusPillText, statusPillTextStyle(ticket, styles)]}>
                          {t(statusLabelKey(ticket, t))}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.timeText,
                          ticketIsDelayed(ticket) && ticket.status !== 'ready' && styles.timeTextWarn,
                        ]}
                      >
                        {t('owner.kdsTimeMin', { n: ticket.mins })}
                      </Text>
                    </View>
                  </View>
                </View>
              </Pressable>
            </Swipeable>
          </Animated.View>
        ))
      )}

      <Text style={[styles.sectionLabel, styles.feedSectionLabel]}>{t('owner.liveFeedTitle')}</Text>
      <View style={styles.feedTimeline}>
        {LIVE_FEED.map((item, i) => (
          <Animated.View
            key={item.id}
            entering={FadeInDown.delay(60 + i * 32).springify()}
            style={styles.feedRow}
          >
            <View style={styles.feedLineCol}>
              <View style={[styles.feedDot, { backgroundColor: feedDotColor(item.kind, ownerColors) }]} />
              {i < LIVE_FEED.length - 1 ? <View style={styles.feedLine} /> : null}
            </View>
            <View style={[styles.feedContent, i === LIVE_FEED.length - 1 && styles.feedContentLast]}>
              <Text style={styles.feedTime}>{item.timeLabel}</Text>
              <Text style={styles.feedMsg}>{item.message}</Text>
            </View>
          </Animated.View>
        ))}
      </View>

      <View style={{ height: ownerSpace.lg }} />

      <Modal visible={detail != null} animationType="fade" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalRoot}>
          <KdsBackdrop onPress={() => setDetail(null)} />
          {detail ? (
            <Animated.View entering={FadeInDown.duration(280).springify()} style={styles.modalCard}>
              <View style={styles.modalTop}>
                <Text style={styles.modalStation}>{t(stationKey(detail.station))}</Text>
                <Text style={styles.modalTable}>{detail.table}</Text>
              </View>
              <Text style={styles.modalItems}>{detail.items}</Text>
              <View style={[styles.statusPill, statusPillStyle(detail, styles), styles.modalPill]}>
                <Text style={[styles.statusPillText, statusPillTextStyle(detail, styles)]}>
                  {t(statusLabelKey(detail, t))}
                </Text>
              </View>
              <View style={styles.modalActions}>
                <Pressable
                  onPress={() => {
                    markReady(detail.id);
                    setDetail(null);
                  }}
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]}
                >
                  <Ionicons name="checkmark-circle-outline" size={22} color={ownerColors.gold} />
                  <Text style={styles.modalBtnText}>{t('owner.kdsSwipeReady')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    markFired(detail.id);
                    setDetail(null);
                  }}
                  style={({ pressed }) => [styles.modalBtn, pressed && styles.modalBtnPressed]}
                >
                  <Ionicons name="flame-outline" size={22} color={ownerColors.textMuted} />
                  <Text style={styles.modalBtnText}>{t('owner.kdsSwipeFired')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    completeTicket(detail.id);
                  }}
                  style={({ pressed }) => [styles.modalBtn, styles.modalBtnDanger, pressed && styles.modalBtnPressed]}
                >
                  <Ionicons name="checkmark-done-outline" size={22} color={ownerColors.danger} />
                  <Text style={[styles.modalBtnText, styles.modalBtnDangerText]}>{t('owner.kdsSwipeComplete')}</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => setDetail(null)} style={styles.modalClose}>
                <Text style={styles.modalCloseText}>{t('owner.menuCancel')}</Text>
              </Pressable>
            </Animated.View>
          ) : null}
        </View>
      </Modal>
    </OwnerScreen>
  );
}

function statusPillTextStyle(ticket: KdsTicket, styles: Styles) {
  if (ticketIsDelayed(ticket) && ticket.status !== 'ready') return styles.pillTxtDelayed;
  if (ticket.status === 'ready') return styles.pillTxtReady;
  if (ticket.status === 'in_progress') return styles.pillTxtProgress;
  return styles.pillTxtFired;
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
    marginBottom: ownerSpace.md,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
    letterSpacing: 0.2,
  },
  summaryDelayed: {
    color: ownerColors.danger,
    fontWeight: '700',
  },
  summarySep: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.goldMuted,
    opacity: 0.85,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
    marginBottom: ownerSpace.sm,
  },
  feedSectionLabel: {
    marginTop: ownerSpace.lg,
  },
  emptyTickets: {
    fontSize: 14,
    color: ownerColors.textMuted,
    fontStyle: 'italic',
    marginBottom: ownerSpace.md,
  },
  ticketCard: {
    flexDirection: 'row',
    borderRadius: ownerRadii.md,
    backgroundColor: ownerColors.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    marginBottom: ownerSpace.sm,
    overflow: 'hidden',
  },
  ticketAccent: {
    width: 5,
  },
  ticketInner: {
    flex: 1,
    padding: ownerSpace.md,
  },
  ticketTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ownerSpace.sm,
  },
  stationLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  tableLabel: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    letterSpacing: -0.3,
  },
  itemsText: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
    lineHeight: 24,
  },
  ticketBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: ownerSpace.md,
    gap: ownerSpace.sm,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  pillProgress: {
    borderColor: ownerColors.goldMuted,
    backgroundColor: ownerColors.goldSubtle,
  },
  pillFired: {
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  pillReady: {
    borderColor: 'rgba(34, 197, 94, 0.45)',
    backgroundColor: 'rgba(34, 197, 94, 0.12)',
  },
  pillDelayed: {
    borderColor: 'rgba(248, 113, 113, 0.45)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
  },
  pillTxtProgress: {
    color: ownerColors.gold,
  },
  pillTxtFired: {
    color: ownerColors.textMuted,
  },
  pillTxtReady: {
    color: ownerColors.success,
  },
  pillTxtDelayed: {
    color: ownerColors.danger,
  },
  timeText: {
    fontSize: 15,
    fontWeight: '800',
    color: ownerColors.textSecondary,
  },
  timeTextWarn: {
    color: ownerColors.danger,
  },
  cardPressed: {
    opacity: 0.92,
  },
  swipeActions: {
    flexDirection: 'row',
    marginBottom: ownerSpace.sm,
  },
  swipeBtn: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 88,
    paddingVertical: ownerSpace.md,
    marginLeft: 4,
    borderRadius: ownerRadii.sm,
  },
  swipeReady: {
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
  },
  swipeFired: {
    backgroundColor: ownerColors.bgGlass,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  swipeDone: {
    backgroundColor: 'rgba(248, 113, 113, 0.2)',
  },
  swipePressed: {
    opacity: 0.88,
  },
  swipeBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.text,
  },
  feedTimeline: {
    paddingLeft: 2,
  },
  feedRow: {
    flexDirection: 'row',
    minHeight: 52,
  },
  feedLineCol: {
    width: 14,
    alignItems: 'center',
    marginRight: ownerSpace.sm,
  },
  feedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
  },
  feedLine: {
    flex: 1,
    width: 2,
    marginTop: 2,
    backgroundColor: ownerColors.border,
    opacity: 0.6,
    minHeight: 28,
  },
  feedContent: {
    flex: 1,
    paddingBottom: ownerSpace.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: ownerColors.border,
  },
  feedContentLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  feedTime: {
    fontSize: 11,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 0.3,
    marginBottom: 3,
  },
  feedMsg: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    lineHeight: 20,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIconPressed: {
    opacity: 0.88,
    backgroundColor: ownerColors.bgGlass,
  },
  modalRoot: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: ownerSpace.md,
  },
  modalDim: {
    backgroundColor: 'rgba(0,0,0,0.78)',
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    zIndex: 2,
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii.xl,
    padding: ownerSpace.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
  },
  modalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: ownerSpace.sm,
  },
  modalStation: {
    fontSize: 13,
    fontWeight: '700',
    color: ownerColors.gold,
  },
  modalTable: {
    fontSize: 20,
    fontWeight: '800',
    color: ownerColors.text,
  },
  modalItems: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
    lineHeight: 24,
    marginBottom: ownerSpace.md,
  },
  modalPill: {
    alignSelf: 'flex-start',
  },
  modalActions: {
    gap: ownerSpace.sm,
    marginTop: ownerSpace.md,
  },
  modalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ownerSpace.sm,
    paddingVertical: 12,
    paddingHorizontal: ownerSpace.md,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgElevated,
  },
  modalBtnDanger: {
    borderColor: 'rgba(248, 113, 113, 0.35)',
  },
  modalBtnPressed: {
    opacity: 0.9,
  },
  modalBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
  },
  modalBtnDangerText: {
    color: ownerColors.danger,
  },
  modalClose: {
    marginTop: ownerSpace.md,
    alignSelf: 'center',
    paddingVertical: 8,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  };
});
