import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  SectionList,
  Pressable,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { OwnerHeader } from '@/components/owner/OwnerHeader';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  OWNER_RESERVATIONS,
  OWNER_FLOOR_TABLES,
  type OwnerReservationSlot,
} from '@/lib/mock/ownerApp';

type DateFilter = 'today' | 'tomorrow' | 'week';
type StatusFilter = 'all' | 'confirmed' | 'pending' | 'seated' | 'risk';

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Week' },
];

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'confirmed', label: 'Booked' },
  { key: 'pending', label: 'Pending' },
  { key: 'seated', label: 'Seated' },
  { key: 'risk', label: 'Risk' },
];

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  /** Uber-style segmented control — one clear choice at the top */
  segmentWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  segmentTrack: {
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 3,
  },
  segmentSlot: { flex: 1 },
  segmentBtn: {
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.sm,
  },
  segmentBtnActive: {
    backgroundColor: c.gold,
  },
  segmentLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textMuted,
  },
  segmentLabelActive: {
    color: c.bgBase,
  },
  statusWrap: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  statusChipOn: {
    borderColor: c.gold,
    backgroundColor: `${c.gold}16`,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
  },
  statusChipTextOn: {
    color: c.gold,
  },
  statusCount: {
    fontSize: 11,
    fontWeight: '800',
    color: c.textMuted,
  },
  statusCountOn: {
    color: c.gold,
  },

  listMeta: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  listMetaText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },

  stickyHeader: {
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  stickyHeaderText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.2,
  },

  /** One reservation = one card (Uber trip-card DNA: accent, hierarchy, breath) */
  bookingCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    flexDirection: 'row',
    alignItems: 'stretch',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bookingCardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.995 }],
  },
  statusAccent: {
    width: 4,
    backgroundColor: c.border,
  },
  bookingInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingRight: spacing.sm,
    paddingLeft: spacing.md,
    gap: spacing.md,
    minHeight: 76,
  },
  timeBlock: {
    width: 52,
    alignItems: 'flex-start',
  },
  timeClock: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.6,
    lineHeight: 26,
  },
  timeMeridiem: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    marginTop: 1,
    letterSpacing: 0.3,
  },
  bookingMain: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guestName: {
    fontSize: 17,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.3,
    flexShrink: 1,
  },
  walkInTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  walkInTagText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textSecondary,
    letterSpacing: 0.1,
  },
  metaLine: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  bookingStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusWord: {
    fontSize: 12,
    fontWeight: '700',
  },
  chevronWrap: {
    paddingLeft: 2,
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.2,
  },

  empty: {
    padding: spacing.xl,
    alignItems: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },

  summaryCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.3,
  },
  summarySub: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  summaryStat: {
    flex: 1,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  summaryStatValue: {
    fontSize: 26,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
  },
  summaryStatValueAccent: { color: c.gold },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    marginTop: 4,
  },
  quickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  quickBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    minHeight: 44,
    borderRadius: borderRadius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
  },
  quickBtnPrimary: {
    backgroundColor: `${c.gold}16`,
    borderColor: `${c.gold}55`,
  },
  quickBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
  },
  quickBtnTextPrimary: {
    color: c.gold,
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  nextAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  nextCol: { flex: 1, minWidth: 0 },
  nextLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
  },
  nextText: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: 2,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: spacing.xl,
    paddingBottom: spacing['3xl'],
    maxHeight: '80%',
  },
  grabber: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: c.textPrimary,
    marginBottom: spacing.xs,
    letterSpacing: -0.4,
  },
  modalLine: {
    fontSize: 14,
    color: c.textMuted,
    marginBottom: 6,
    fontWeight: '500',
  },
  modalSubtitle: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  modalSectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  modalKvRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  modalKvRowFirst: {
    borderTopWidth: 0,
  },
  modalKvLabel: {
    fontSize: 13,
    color: c.textMuted,
    fontWeight: '600',
    flex: 1,
  },
  modalKvValue: {
    fontSize: 14,
    color: c.textPrimary,
    fontWeight: '700',
    textAlign: 'right',
    flexShrink: 1,
  },
  modalNote: {
    fontSize: 13,
    color: c.textPrimary,
    fontWeight: '500',
    lineHeight: 19,
    backgroundColor: c.bgElevated,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
    flexWrap: 'wrap',
  },
  modalActionBtn: {
    flexGrow: 1,
    minWidth: '30%',
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  modalActionPrimary: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  modalActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textPrimary,
  },
  modalActionPrimaryText: {
    color: '#FFFFFF',
  },
  modalRiskPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: `${c.danger}1F`,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${c.danger}55`,
    marginBottom: spacing.sm,
  },
  modalRiskText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.danger,
  },
  modalClose: {
    marginTop: spacing.lg,
    alignSelf: 'flex-start',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  modalCloseText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textPrimary,
  },
}));

function statusPresentation(
  status: OwnerReservationSlot['status'],
  c: ReturnType<typeof useColors>,
): {
  label: string;
  text: string;
  bg: string;
  rail: string;
} {
  switch (status) {
    case 'seated':
      return { label: 'Seated', text: c.info, bg: `${c.info}1F`, rail: c.info };
    case 'risk':
      return { label: 'At risk', text: c.danger, bg: `${c.danger}1F`, rail: c.danger };
    case 'pending':
      return { label: 'Expected', text: c.textSecondary, bg: c.bgElevated, rail: c.border };
    default:
      return { label: 'Confirmed', text: c.success, bg: `${c.success}1F`, rail: c.success };
  }
}

function parseMinutes(t: string): number {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return 0;
  let h = parseInt(m[1], 10);
  const mins = parseInt(m[2], 10);
  const ap = m[3].toUpperCase();
  if (ap === 'PM' && h !== 12) h += 12;
  if (ap === 'AM' && h === 12) h = 0;
  return h * 60 + mins;
}

/** Split "6:00 PM" → big clock + meridiem (Uber-style time column). */
function splitTime(human: string): { clock: string; ap: string } {
  const m = human.match(/^(\d{1,2}:\d{2})\s*(AM|PM)/i);
  if (!m) return { clock: human, ap: '' };
  return { clock: m[1], ap: m[2].toUpperCase() };
}

export default function OwnerReservationsScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [selected, setSelected] = useState<OwnerReservationSlot | null>(null);

  const dateFiltered = useMemo(() => {
    if (dateFilter === 'today' || dateFilter === 'week') return OWNER_RESERVATIONS;
    return OWNER_RESERVATIONS.filter((_, i) => i % 2 === 1);
  }, [dateFilter]);

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return dateFiltered;
    return dateFiltered.filter((r) => r.status === statusFilter);
  }, [dateFiltered, statusFilter]);

  const glance = useMemo(() => {
    const total = filtered.length;
    const seated = filtered.filter((r) => r.status === 'seated').length;
    const upcoming = filtered.filter(
      (r) => r.status === 'confirmed' || r.status === 'pending',
    ).length;
    const next = [...filtered]
      .filter((r) => r.status === 'confirmed' || r.status === 'pending' || r.status === 'risk')
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))[0];
    return { total, seated, upcoming, next };
  }, [filtered]);

  const capacity = OWNER_FLOOR_TABLES.length;

  const headerSubtitle = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return 'Tonight — live reservation control';
      case 'tomorrow':
        return 'Tomorrow — plan before service starts';
      default:
        return 'This week — bookings and risk points';
    }
  }, [dateFilter]);

  const summaryHeading = useMemo(() => {
    switch (dateFilter) {
      case 'today':
        return 'Right now';
      case 'tomorrow':
        return 'Tomorrow';
      default:
        return 'This week';
    }
  }, [dateFilter]);

  const sections = useMemo(() => {
    const sorted = [...filtered].sort(
      (a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime),
    );
    const map = new Map<string, OwnerReservationSlot[]>();
    for (const r of sorted) {
      const list = map.get(r.startTime) ?? [];
      list.push(r);
      map.set(r.startTime, list);
    }
    return Array.from(map.entries()).map(([title, rows]) => ({
      title,
      data: rows,
    }));
  }, [filtered]);

  const press = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  const onSelectFilter = (key: DateFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setDateFilter(key);
  };

  const onSelectStatus = (key: StatusFilter) => {
    Haptics.selectionAsync().catch(() => {});
    setStatusFilter(key);
  };

  const statusCounts = useMemo(
    () => ({
      all: dateFiltered.length,
      confirmed: dateFiltered.filter((r) => r.status === 'confirmed').length,
      pending: dateFiltered.filter((r) => r.status === 'pending').length,
      seated: dateFiltered.filter((r) => r.status === 'seated').length,
      risk: dateFiltered.filter((r) => r.status === 'risk').length,
    }),
    [dateFiltered],
  );

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <>
            <View style={{ paddingTop: insets.top + spacing.sm }} />

            <View style={styles.segmentWrap}>
              <View style={styles.segmentTrack} accessibilityRole="tablist">
                {DATE_FILTERS.map((f) => {
                  const active = dateFilter === f.key;
                  return (
                    <View key={f.key} style={styles.segmentSlot}>
                      <Pressable
                        onPress={() => onSelectFilter(f.key)}
                        style={[styles.segmentBtn, active && styles.segmentBtnActive]}
                        accessibilityRole="tab"
                        accessibilityState={{ selected: active }}
                        accessibilityLabel={`${f.label}. ${active ? 'Selected' : 'Show'} reservations for ${f.label.toLowerCase()}.`}
                      >
                        <Text
                          style={[styles.segmentLabel, active && styles.segmentLabelActive]}
                        >
                          {f.label}
                        </Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>

            <OwnerHeader title="Bookings" subtitle={headerSubtitle} />

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statusWrap}
            >
              <View style={styles.statusRow}>
                {STATUS_FILTERS.map((f) => {
                  const active = statusFilter === f.key;
                  return (
                    <Pressable
                      key={f.key}
                      onPress={() => onSelectStatus(f.key)}
                      style={[styles.statusChip, active && styles.statusChipOn]}
                      accessibilityRole="button"
                      accessibilityLabel={`Filter by ${f.label}`}
                    >
                      <Text style={[styles.statusChipText, active && styles.statusChipTextOn]}>
                        {f.label}
                      </Text>
                      <Text style={[styles.statusCount, active && styles.statusCountOn]}>
                        {statusCounts[f.key]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.quickRow}>
              <Pressable
                style={[styles.quickBtn, styles.quickBtnPrimary]}
                onPress={press(() => setSelected(glance.next ?? filtered[0] ?? null))}
                accessibilityRole="button"
                accessibilityLabel="Open next booking"
              >
                <Ionicons name="flash-outline" size={16} color={c.gold} />
                <Text style={[styles.quickBtnText, styles.quickBtnTextPrimary]}>Next booking</Text>
              </Pressable>
              <Pressable
                style={styles.quickBtn}
                onPress={press(() => setDateFilter('today'))}
                accessibilityRole="button"
                accessibilityLabel="Focus on today"
              >
                <Ionicons name="today-outline" size={16} color={c.textSecondary} />
                <Text style={styles.quickBtnText}>Today view</Text>
              </Pressable>
            </View>

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>{summaryHeading}</Text>
                <Text style={styles.summarySub}>
                  {dateFilter === 'today' ? (
                    <>
                      {glance.seated} of {capacity} tables seated · {glance.upcoming} still
                      expected
                    </>
                  ) : (
                    <>
                      {glance.total} reservation{glance.total === 1 ? '' : 's'} · {glance.upcoming}{' '}
                      still expected
                    </>
                  )}
                </Text>
              </View>
              <View style={styles.summaryStats}>
                {dateFilter === 'today' ? (
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatValue, styles.summaryStatValueAccent]}>
                      {glance.seated}
                      <Text style={{ fontSize: 16, fontWeight: '700', color: c.textMuted }}>
                        /{capacity}
                      </Text>
                    </Text>
                    <Text style={styles.summaryStatLabel}>Tables seated</Text>
                  </View>
                ) : (
                  <View style={styles.summaryStat}>
                    <Text style={[styles.summaryStatValue, styles.summaryStatValueAccent]}>
                      {glance.total}
                    </Text>
                    <Text style={styles.summaryStatLabel}>On the list</Text>
                  </View>
                )}
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>{glance.upcoming}</Text>
                  <Text style={styles.summaryStatLabel}>Still coming</Text>
                </View>
              </View>
              {glance.next ? (
                <Pressable
                  style={styles.nextRow}
                  onPress={press(() => setSelected(glance.next!))}
                  accessibilityRole="button"
                  accessibilityLabel={`Next reservation ${glance.next.guestName}`}
                >
                  <View style={styles.nextAvatar}>
                    <Text style={styles.avatarText}>{initials(glance.next.guestName)}</Text>
                  </View>
                  <View style={styles.nextCol}>
                    <Text style={styles.nextLabel}>Up next</Text>
                    <Text style={styles.nextText} numberOfLines={1}>
                      {glance.next.startTime} · {glance.next.guestName} · party of{' '}
                      {glance.next.partySize}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </Pressable>
              ) : null}
            </View>

            {filtered.length > 0 ? (
              <View style={styles.listMeta}>
                <Text style={styles.listMetaText}>
                  {glance.total} booking{glance.total === 1 ? '' : 's'} · tap a card for details
                </Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color={c.textMuted} />
            <Text style={styles.emptyText}>No reservations for this view.</Text>
            <Text style={[styles.emptyText, { marginTop: 4, fontSize: 13 }]}>
              Try Today, Tomorrow, or Week above.
            </Text>
          </View>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.stickyHeader}>
            <Text style={styles.stickyHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item: row }) => {
          const pres = statusPresentation(row.status, c);
          const { clock, ap } = splitTime(row.startTime);
          const tableBit = row.table ? ` · ${row.table}` : '';
          return (
            <Pressable
              onPress={press(() => setSelected(row))}
              style={({ pressed }) => [styles.bookingCard, pressed && styles.bookingCardPressed]}
              accessibilityRole="button"
              accessibilityLabel={`${row.guestName}, ${row.startTime}, ${pres.label}`}
            >
              <View style={[styles.statusAccent, { backgroundColor: pres.rail }]} />
              <View style={styles.bookingInner}>
                <View style={styles.timeBlock}>
                  <Text style={styles.timeClock}>{clock}</Text>
                  {ap ? <Text style={styles.timeMeridiem}>{ap}</Text> : null}
                </View>
                <View style={styles.bookingMain}>
                  <View style={styles.nameRow}>
                    <Text style={styles.guestName} numberOfLines={1}>
                      {row.guestName}
                    </Text>
                    {row.vip ? (
                      <Ionicons name="star" size={14} color={c.gold} accessibilityLabel="VIP" />
                    ) : null}
                  </View>
                  <Text style={styles.metaLine} numberOfLines={1}>
                    Party of {row.partySize}
                    {tableBit}
                  </Text>
                  <View style={styles.bookingStatusRow}>
                    <View style={[styles.statusDot, { backgroundColor: pres.text }]} />
                    <Text style={[styles.statusWord, { color: pres.text }]}>{pres.label}</Text>
                    {row.walkIn ? (
                      <View style={styles.walkInTag}>
                        <Text style={styles.walkInTagText}>Walk-in</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
                <View style={styles.chevronWrap}>
                  <Ionicons name="chevron-forward" size={20} color={c.textMuted} />
                </View>
              </View>
            </Pressable>
          );
        }}
        contentContainerStyle={{
          paddingBottom: scrollPad,
          flexGrow: 1,
        }}
        SectionSeparatorComponent={() => null}
      />

      <Modal visible={selected !== null} transparent animationType="slide">
        <Pressable style={styles.modalOverlay} onPress={() => setSelected(null)}>
          <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.grabber} />
            <ScrollView showsVerticalScrollIndicator={false}>
              {selected ? (
                <>
                  <Text style={styles.modalTitle} numberOfLines={1}>
                    {selected.guestName}
                    {selected.vip ? ' · VIP' : ''}
                  </Text>
                  <Text style={styles.modalSubtitle}>
                    {selected.startTime} · {selected.partySize} guests
                    {selected.table ? ` · Table ${selected.table}` : ''}
                  </Text>

                  {selected.status === 'risk' ? (
                    <View style={styles.modalRiskPill}>
                      <Ionicons name="warning" size={14} color={c.danger} />
                      <Text style={styles.modalRiskText}>Might not show — consider a quick text</Text>
                    </View>
                  ) : null}

                  <Text style={styles.modalSectionLabel}>Details</Text>
                  {[
                    { label: 'Status', value: statusPresentation(selected.status, c).label },
                    { label: 'Party size', value: `${selected.partySize} people` },
                    { label: 'Table', value: selected.table ?? 'Not assigned yet' },
                    {
                      label: 'How they booked',
                      value: selected.walkIn ? 'Walk-in / waitlist' : 'Reservation',
                    },
                  ].map((r, i) => (
                    <View
                      key={r.label}
                      style={[styles.modalKvRow, i === 0 && styles.modalKvRowFirst]}
                    >
                      <Text style={styles.modalKvLabel}>{r.label}</Text>
                      <Text style={styles.modalKvValue}>{r.value}</Text>
                    </View>
                  ))}

                  <Text style={styles.modalSectionLabel}>Guest</Text>
                  {[
                    { label: 'Past visits', value: String(selected.pastVisits ?? 0) },
                    { label: 'VIP', value: selected.vip ? 'Yes' : 'No' },
                  ].map((r, i) => (
                    <View
                      key={r.label}
                      style={[styles.modalKvRow, i === 0 && styles.modalKvRowFirst]}
                    >
                      <Text style={styles.modalKvLabel}>{r.label}</Text>
                      <Text style={styles.modalKvValue}>{r.value}</Text>
                    </View>
                  ))}

                  {selected.notes ? (
                    <>
                      <Text style={styles.modalSectionLabel}>Notes</Text>
                      <Text style={styles.modalNote}>{selected.notes}</Text>
                    </>
                  ) : null}

                  <View style={styles.modalActions}>
                    <Pressable style={[styles.modalActionBtn, styles.modalActionPrimary]}>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={[styles.modalActionText, styles.modalActionPrimaryText]}>
                        Seat
                      </Text>
                    </Pressable>
                    <Pressable style={styles.modalActionBtn}>
                      <Ionicons name="chatbubble-outline" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>Message</Text>
                    </Pressable>
                    <Pressable style={styles.modalActionBtn}>
                      <Ionicons name="close" size={16} color={c.textPrimary} />
                      <Text style={styles.modalActionText}>Cancel</Text>
                    </Pressable>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <Pressable style={styles.modalClose} onPress={() => setSelected(null)}>
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
