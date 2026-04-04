import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import {
  OWNER_RESERVATIONS,
  WALKIN_QUEUE,
  WAITLIST_ENTRIES,
  type OwnerReservationSlot,
  type ResFilter,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';

const FILTERS: ResFilter[] = ['all', 'confirmed', 'pending', 'walkin', 'risk'];

function matchesFilter(r: OwnerReservationSlot, f: ResFilter): boolean {
  if (f === 'all') return true;
  if (f === 'confirmed') return r.status === 'confirmed';
  if (f === 'pending') return r.status === 'pending';
  if (f === 'risk') return r.status === 'risk';
  if (f === 'walkin') return r.walkIn === true;
  return true;
}

export default function OwnerReservationsScreen() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState<ResFilter>('all');

  const rows = useMemo(
    () => OWNER_RESERVATIONS.filter((r) => matchesFilter(r, filter)),
    [filter],
  );

  const labelForFilter = (f: ResFilter) => {
    const map: Record<ResFilter, string> = {
      all: t('owner.filterAll'),
      confirmed: t('owner.filterConfirmed'),
      pending: t('owner.filterPending'),
      walkin: t('owner.filterWalkin'),
      risk: t('owner.filterRisk'),
    };
    return map[f];
  };

  const statusLabel = (s: OwnerReservationSlot['status']) => {
    const map: Record<OwnerReservationSlot['status'], string> = {
      confirmed: t('owner.statusConfirmed'),
      pending: t('owner.statusPending'),
      seated: t('owner.statusSeated'),
      risk: t('owner.statusRisk'),
    };
    return map[s];
  };

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('staff.reservations')}</Text>
      <Text style={styles.sub}>{t('owner.reservationsTimeline')}</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {FILTERS.map((f) => {
          const active = filter === f;
          return (
            <Pressable
              key={f}
              onPress={() => setFilter(f)}
              style={[styles.filterChip, active && styles.filterChipOn]}
            >
              <Text style={[styles.filterText, active && styles.filterTextOn]}>{labelForFilter(f)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
      {WAITLIST_ENTRIES.map((w) => (
        <GlassCard key={w.id} style={styles.waitRow}>
          <View>
            <Text style={styles.waitName}>{w.name}</Text>
            <Text style={styles.waitMeta}>
              {t('owner.waitParty', { n: w.party })} · {t('owner.waitQuoted', { time: w.quoted })}
            </Text>
          </View>
        </GlassCard>
      ))}

      <Text style={styles.section}>{t('owner.reservationsListTitle')}</Text>
      {rows.map((r, index) => (
        <Animated.View key={r.id} entering={FadeInDown.delay(index * 35)}>
          <GlassCard style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.time}>{r.startTime}</Text>
              {r.vip ? (
                <View style={styles.vipPill}>
                  <Text style={styles.vipText}>{t('owner.crmVip')}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.guest}>{r.guestName}</Text>
            <Text style={styles.meta}>
              {t('owner.resParty', { n: r.partySize })}
              {r.table ? ` · ${r.table}` : ''}
            </Text>
            {r.notes ? (
              <Text style={styles.notes}>
                {t('owner.notesLabel')}: {r.notes}
              </Text>
            ) : null}
            {r.pastVisits != null && r.avgSpend != null ? (
              <Text style={styles.historyHint}>
                {t('owner.historyHint', {
                  visits: r.pastVisits,
                  avg: formatCurrency(r.avgSpend, 'cad'),
                })}
              </Text>
            ) : null}
            <View style={[styles.badge, badgeStyle(r.status)]}>
              <Text style={[styles.badgeText, badgeTextStyle(r.status)]}>{statusLabel(r.status)}</Text>
            </View>
            <View style={styles.actions}>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                onPress={() =>
                  Alert.alert(t('owner.receiptTitle'), t('owner.receiptMock'))
                }
              >
                <Text style={styles.actionBtnText}>{t('owner.viewReceipt')}</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                onPress={() =>
                  Alert.alert(
                    t('owner.customerHistory'),
                    r.pastVisits != null
                      ? t('owner.historyDetail', { visits: r.pastVisits, avg: formatCurrency(r.avgSpend ?? 0, 'cad') })
                      : t('owner.historyNew'),
                  )
                }
              >
                <Text style={styles.actionBtnText}>{t('owner.customerHistory')}</Text>
              </Pressable>
            </View>
          </GlassCard>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

function badgeStyle(s: OwnerReservationSlot['status']) {
  switch (s) {
    case 'confirmed':
      return { backgroundColor: 'rgba(34, 197, 94, 0.18)', borderColor: 'rgba(34, 197, 94, 0.35)' };
    case 'pending':
      return { backgroundColor: ownerColors.goldSubtle, borderColor: 'rgba(212, 175, 55, 0.4)' };
    case 'seated':
      return { backgroundColor: 'rgba(34, 197, 94, 0.22)', borderColor: 'rgba(34, 197, 94, 0.4)' };
    case 'risk':
      return { backgroundColor: 'rgba(239, 68, 68, 0.18)', borderColor: 'rgba(239, 68, 68, 0.4)' };
    default:
      return { backgroundColor: ownerColors.bgGlass, borderColor: ownerColors.border };
  }
}

function badgeTextStyle(s: OwnerReservationSlot['status']) {
  switch (s) {
    case 'risk':
      return { color: ownerColors.danger };
    case 'pending':
      return { color: ownerColors.gold };
    default:
      return { color: ownerColors.success };
  }
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 4,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: 16,
  },
  filters: {
    gap: 8,
    marginBottom: 20,
  },
  filterChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  filterChipOn: {
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  filterTextOn: {
    color: ownerColors.gold,
  },
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
  card: {
    padding: 16,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  time: {
    fontSize: 18,
    fontWeight: '800',
    color: ownerColors.gold,
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
  guest: {
    fontSize: 17,
    fontWeight: '700',
    color: ownerColors.text,
  },
  meta: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginTop: 6,
  },
  notes: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.textSecondary,
    marginTop: 10,
    fontStyle: 'italic',
  },
  historyHint: {
    fontSize: 13,
    color: ownerColors.textMuted,
    marginTop: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.borderStrong,
    backgroundColor: ownerColors.bgElevated,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: ownerColors.gold,
  },
  pressed: {
    opacity: 0.88,
  },
});
