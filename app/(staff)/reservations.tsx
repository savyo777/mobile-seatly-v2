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

const DATE_FILTERS: { key: DateFilter; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'Week' },
];

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 40,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.textPrimary,
    borderColor: c.textPrimary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
  },
  chipTextActive: {
    color: c.bgBase,
  },

  stickyHeader: {
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: 8,
    paddingBottom: 6,
  },
  stickyHeaderInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stickyHeaderText: {
    fontSize: 16,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },

  cardMargin: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  rowCard: {
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    minHeight: 68,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: -0.2,
  },
  centerCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  guest: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  vipBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: c.gold,
    letterSpacing: 0.5,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: `${c.gold}1F`,
    borderRadius: 6,
  },
  meta: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },
  timeCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.1,
  },
  pill: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.1,
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

export default function OwnerReservationsScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const [dateFilter, setDateFilter] = useState<DateFilter>('today');
  const [selected, setSelected] = useState<OwnerReservationSlot | null>(null);

  const filtered = useMemo(() => {
    if (dateFilter === 'today' || dateFilter === 'week') return OWNER_RESERVATIONS;
    return OWNER_RESERVATIONS.filter((_, i) => i % 2 === 1);
  }, [dateFilter]);

  const nowSummary = useMemo(() => {
    const seated = OWNER_RESERVATIONS.filter((r) => r.status === 'seated').length;
    const capacity = OWNER_FLOOR_TABLES.length;
    const upcomingNext60 = OWNER_RESERVATIONS.filter(
      (r) => r.status === 'confirmed' || r.status === 'pending',
    ).length;
    const next = [...OWNER_RESERVATIONS]
      .filter((r) => r.status === 'confirmed' || r.status === 'pending')
      .sort((a, b) => parseMinutes(a.startTime) - parseMinutes(b.startTime))[0];
    return { seated, capacity, upcomingNext60, next };
  }, []);

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
      data: [{ sectionId: title, rows }],
    }));
  }, [filtered]);

  const press = (fn: () => void) => () => {
    Haptics.selectionAsync().catch(() => {});
    fn();
  };

  return (
    <View style={styles.root}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.sectionId}
        stickySectionHeadersEnabled
        ListHeaderComponent={
          <>
            <View style={{ paddingTop: insets.top + spacing.xs }} />
            <OwnerHeader
              title="Bookings"
              subtitle="Tonight — who's seated and who's on the way"
            />

            <View style={styles.summaryCard}>
              <View>
                <Text style={styles.summaryTitle}>Right now</Text>
                <Text style={styles.summarySub}>
                  {nowSummary.seated} of {nowSummary.capacity} tables seated ·{' '}
                  {nowSummary.upcomingNext60} reservation
                  {nowSummary.upcomingNext60 === 1 ? '' : 's'} still to arrive
                </Text>
              </View>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={[styles.summaryStatValue, styles.summaryStatValueAccent]}>
                    {nowSummary.seated}
                    <Text style={{ fontSize: 16, fontWeight: '700', color: c.textMuted }}>
                      /{nowSummary.capacity}
                    </Text>
                  </Text>
                  <Text style={styles.summaryStatLabel}>Tables seated</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatValue}>{nowSummary.upcomingNext60}</Text>
                  <Text style={styles.summaryStatLabel}>Still coming</Text>
                </View>
              </View>
              {nowSummary.next ? (
                <Pressable
                  style={styles.nextRow}
                  onPress={press(() => setSelected(nowSummary.next!))}
                  accessibilityRole="button"
                  accessibilityLabel={`Next reservation ${nowSummary.next.guestName}`}
                >
                  <View style={styles.nextAvatar}>
                    <Text style={styles.avatarText}>{initials(nowSummary.next.guestName)}</Text>
                  </View>
                  <View style={styles.nextCol}>
                    <Text style={styles.nextLabel}>Up next</Text>
                    <Text style={styles.nextText} numberOfLines={1}>
                      {nowSummary.next.startTime} · {nowSummary.next.guestName} · party of{' '}
                      {nowSummary.next.partySize}
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.chipRow}>
              {DATE_FILTERS.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={press(() => setDateFilter(f.key))}
                  style={[styles.chip, dateFilter === f.key && styles.chipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: dateFilter === f.key }}
                >
                  <Text
                    style={[styles.chipText, dateFilter === f.key && styles.chipTextActive]}
                  >
                    {f.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            {filtered.length === 0 ? (
              <View style={styles.empty}>
                <Ionicons name="calendar-outline" size={24} color={c.textMuted} />
                <Text style={styles.emptyText}>No reservations for this range.</Text>
              </View>
            ) : null}
          </>
        }
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.stickyHeader}>
            <View style={styles.stickyHeaderInner}>
              <Text style={styles.stickyHeaderText}>{title}</Text>
            </View>
          </View>
        )}
        renderItem={({ item: group }) => (
          <View style={styles.cardMargin}>
            <View style={styles.rowCard}>
              {group.rows.map((row, index) => {
                const pres = statusPresentation(row.status, c);
                const isFirst = index === 0;
                return (
                  <Pressable
                    key={row.id}
                    onPress={press(() => setSelected(row))}
                    style={({ pressed }) => [
                      styles.row,
                      !isFirst && styles.rowDivider,
                      pressed && { backgroundColor: c.bgElevated },
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`${row.guestName}, ${row.startTime}, ${pres.label}`}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{initials(row.guestName)}</Text>
                    </View>
                    <View style={styles.centerCol}>
                      <View style={styles.guestRow}>
                        <Text style={styles.guest} numberOfLines={1}>
                          {row.guestName}
                        </Text>
                        {row.vip ? <Text style={styles.vipBadge}>VIP</Text> : null}
                      </View>
                      <Text style={styles.meta} numberOfLines={1}>
                        {row.partySize} guests{row.table ? ` · ${row.table}` : ''}
                      </Text>
                    </View>
                    <View style={styles.timeCol}>
                      <Text style={styles.timeText}>{row.startTime}</Text>
                      <View style={[styles.pill, { backgroundColor: pres.bg }]}>
                        <Text style={[styles.pillText, { color: pres.text }]}>
                          {pres.label}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: scrollPad }}
        SectionSeparatorComponent={() => <View style={{ height: spacing.xs }} />}
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
