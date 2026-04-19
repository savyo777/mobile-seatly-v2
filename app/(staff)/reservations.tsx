import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { OwnerSectionLabel } from '@/components/owner/OwnerSectionLabel';
import {
  OWNER_RESERVATIONS,
  WALKIN_QUEUE,
  WAITLIST_ENTRIES,
  type OwnerReservationSlot,
  type ResFilter,
} from '@/lib/mock/ownerApp';
import { formatCurrency } from '@/lib/utils/formatCurrency';
import { ownerColors, ownerRadii } from '@/lib/theme/ownerTheme';
import { ownerSpace } from '@/lib/theme/ownerTheme';

const FILTERS: ResFilter[] = ['all', 'confirmed', 'pending', 'walkin', 'risk'];

function matchesFilter(r: OwnerReservationSlot, f: ResFilter): boolean {
  if (f === 'all') return true;
  if (f === 'confirmed') return r.status === 'confirmed';
  if (f === 'pending') return r.status === 'pending';
  if (f === 'risk') return r.status === 'risk';
  if (f === 'walkin') return r.walkIn === true;
  return true;
}

/** Sort "6:00 PM" style strings chronologically */
function parseTimeToMinutes(s: string): number {
  const m = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + min;
}

function groupByTime(reservations: OwnerReservationSlot[]): { time: string; items: OwnerReservationSlot[] }[] {
  const map = new Map<string, OwnerReservationSlot[]>();
  for (const r of reservations) {
    const list = map.get(r.startTime) ?? [];
    list.push(r);
    map.set(r.startTime, list);
  }
  const times = [...map.keys()].sort((a, b) => parseTimeToMinutes(a) - parseTimeToMinutes(b));
  return times.map((time) => ({ time, items: map.get(time)! }));
}

function statusTextColor(s: OwnerReservationSlot['status']): string {
  switch (s) {
    case 'confirmed':
    case 'seated':
      return ownerColors.success;
    case 'pending':
      return ownerColors.gold;
    case 'risk':
      return ownerColors.danger;
    default:
      return ownerColors.textMuted;
  }
}

export default function OwnerReservationsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ crmGuestId?: string | string[]; crmGuestName?: string | string[] }>();
  const crmGuestId = Array.isArray(params.crmGuestId) ? params.crmGuestId[0] : params.crmGuestId;
  const crmGuestName = Array.isArray(params.crmGuestName) ? params.crmGuestName[0] : params.crmGuestName;
  const [crmBannerDismissed, setCrmBannerDismissed] = useState(false);
  const showCrmFromGuests = Boolean(crmGuestId && crmGuestName) && !crmBannerDismissed;
  const decodedGuestName = crmGuestName ? decodeURIComponent(String(crmGuestName)) : '';

  const [filter, setFilter] = useState<ResFilter>('all');

  const rows = useMemo(
    () => OWNER_RESERVATIONS.filter((r) => matchesFilter(r, filter)),
    [filter],
  );

  const timeline = useMemo(() => groupByTime(rows), [rows]);

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

  const openReservationDetail = (r: OwnerReservationSlot) => {
    const lines = [
      `${t('owner.resParty', { n: r.partySize })}${r.table ? ` · ${r.table}` : ''}`,
      `${t('owner.notesLabel')}: ${r.notes ?? '—'}`,
      r.pastVisits != null && r.avgSpend != null
        ? t('owner.historyHint', { visits: r.pastVisits, avg: formatCurrency(r.avgSpend, 'cad') })
        : null,
    ].filter(Boolean) as string[];
    Alert.alert(r.guestName, lines.join('\n'));
  };

  return (
    <OwnerScreen>
      <Text style={styles.title}>{t('staff.reservations')}</Text>
      <Text style={styles.sub}>{t('owner.reservationsTimeline')}</Text>

      {showCrmFromGuests ? (
        <View style={styles.crmBanner}>
          <View style={styles.crmBannerTextCol}>
            <Text style={styles.crmBannerLabel}>{t('owner.crmFromCrmBanner')}</Text>
            <Text style={styles.crmBannerName} numberOfLines={1}>
              {decodedGuestName}
            </Text>
            <Text style={styles.crmBannerHint}>{t('owner.crmReserveBanner')}</Text>
          </View>
          <Pressable
            onPress={() => setCrmBannerDismissed(true)}
            style={({ pressed }) => [styles.crmBannerClose, pressed && styles.rowPressed]}
            accessibilityRole="button"
            accessibilityLabel={t('common.done')}
          >
            <Ionicons name="close" size={22} color={ownerColors.textMuted} />
          </Pressable>
        </View>
      ) : null}

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

      <OwnerSectionLabel marginTop={ownerSpace.xs}>{t('owner.walkInQueue')}</OwnerSectionLabel>
      <View style={styles.listBlock}>
        {WALKIN_QUEUE.map((q, i) => (
          <Pressable
            key={q.id}
            onPress={() =>
              Alert.alert(q.name, `${t('owner.queueParty', { n: q.party })} · ${t('owner.queueWait', { mins: q.waitMins })}`)
            }
            style={({ pressed }) => [styles.compactRow, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{q.name}</Text>
              <Text style={styles.rowMeta}>
                {t('owner.queueParty', { n: q.party })} · {t('owner.queueWait', { mins: q.waitMins })}
              </Text>
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <OwnerSectionLabel marginTop={ownerSpace.md}>{t('owner.waitlist')}</OwnerSectionLabel>
      <View style={styles.listBlock}>
        {WAITLIST_ENTRIES.map((w, i) => (
          <Pressable
            key={w.id}
            onPress={() =>
              Alert.alert(w.name, `${t('owner.waitParty', { n: w.party })} · ${t('owner.waitQuoted', { time: w.quoted })}`)
            }
            style={({ pressed }) => [styles.compactRow, i > 0 && styles.rowDivider, pressed && styles.rowPressed]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.rowName}>{w.name}</Text>
              <Text style={styles.rowMeta}>
                {t('owner.waitParty', { n: w.party })} · {t('owner.waitQuoted', { time: w.quoted })}
              </Text>
            </View>
            <Text style={styles.rowChevron}>›</Text>
          </Pressable>
        ))}
      </View>

      <OwnerSectionLabel marginTop={ownerSpace.lg}>{t('owner.reservationsListTitle')}</OwnerSectionLabel>
      <View style={styles.listBlock}>
        {timeline.length === 0 ? (
          <Text style={styles.empty}>{t('common.noResults')}</Text>
        ) : (
          timeline.map(({ time, items }) => (
            <View key={time}>
              <Text style={styles.timeHeader}>{time}</Text>
              {items.map((r, idx) => (
                <Pressable
                  key={r.id}
                  onPress={() => openReservationDetail(r)}
                  style={({ pressed }) => [
                    styles.bookingRow,
                    idx > 0 && styles.rowDivider,
                    pressed && styles.rowPressed,
                  ]}
                >
                  <View style={styles.bookingRowInner}>
                    <View style={styles.nameLine}>
                      <View style={styles.nameWithVip}>
                        <Text style={styles.rowName} numberOfLines={1}>
                          {r.guestName}
                        </Text>
                        {r.vip ? <Text style={styles.vipTag}> {t('owner.crmVip')}</Text> : null}
                      </View>
                      <Text style={[styles.statusText, { color: statusTextColor(r.status) }]}>
                        {statusLabel(r.status)}
                      </Text>
                    </View>
                    <Text style={styles.rowMeta}>
                      {t('owner.resParty', { n: r.partySize })}
                      {r.table ? ` · ${r.table}` : ''}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </View>
          ))
        )}
      </View>

      <View style={{ height: ownerSpace.lg }} />
    </OwnerScreen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: ownerColors.text,
    marginBottom: 4,
    letterSpacing: -0.4,
  },
  sub: {
    fontSize: 15,
    color: ownerColors.textMuted,
    marginBottom: ownerSpace.sm,
    fontWeight: '500',
  },
  crmBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: ownerSpace.sm,
    padding: ownerSpace.md,
    marginBottom: ownerSpace.sm,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  crmBannerTextCol: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  crmBannerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  crmBannerName: {
    fontSize: 17,
    fontWeight: '700',
    color: ownerColors.text,
    letterSpacing: -0.3,
  },
  crmBannerHint: {
    fontSize: 13,
    color: ownerColors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  crmBannerClose: {
    padding: 4,
    marginTop: -2,
  },
  filters: {
    gap: 6,
    marginBottom: ownerSpace.md,
    paddingVertical: 2,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: ownerRadii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgSurface,
  },
  filterChipOn: {
    borderColor: ownerColors.gold,
    backgroundColor: ownerColors.goldSubtle,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
  filterTextOn: {
    color: ownerColors.gold,
  },
  listBlock: {
    backgroundColor: ownerColors.bgSurface,
    borderRadius: ownerRadii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    overflow: 'hidden',
    marginBottom: ownerSpace.xs,
  },
  compactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: ownerSpace.sm,
    paddingHorizontal: ownerSpace.md,
    paddingRight: ownerSpace.sm,
  },
  bookingRow: {
    paddingVertical: ownerSpace.sm,
    paddingHorizontal: ownerSpace.md,
  },
  bookingRowInner: {
    gap: 4,
  },
  nameLine: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: ownerSpace.sm,
  },
  nameWithVip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    minWidth: 0,
  },
  rowMain: {
    flex: 1,
    minWidth: 0,
  },
  rowName: {
    fontSize: 16,
    fontWeight: '600',
    color: ownerColors.text,
    letterSpacing: -0.2,
  },
  vipTag: {
    fontSize: 11,
    fontWeight: '700',
    color: ownerColors.gold,
    letterSpacing: 0.3,
  },
  rowMeta: {
    fontSize: 13,
    color: ownerColors.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'capitalize',
    maxWidth: '42%',
    textAlign: 'right',
  },
  rowChevron: {
    fontSize: 18,
    color: ownerColors.textMuted,
    fontWeight: '300',
    marginLeft: ownerSpace.xs,
  },
  timeHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: ownerColors.textMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    paddingTop: ownerSpace.md,
    paddingBottom: ownerSpace.xs,
    paddingHorizontal: ownerSpace.md,
    backgroundColor: ownerColors.bg,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: ownerColors.border,
  },
  rowPressed: {
    backgroundColor: ownerColors.bgGlass,
  },
  empty: {
    padding: ownerSpace.md,
    fontSize: 14,
    color: ownerColors.textMuted,
    textAlign: 'center',
  },
});
