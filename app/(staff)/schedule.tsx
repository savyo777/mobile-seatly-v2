import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { useOwnerTabScrollPadding } from '@/hooks/useOwnerTabScrollPadding';
import {
  TONIGHT_BRIEFING,
  TONIGHT_GUESTS,
  type TonightGuest,
  type TonightBadge,
} from '@/lib/mock/ownerApp';

// ── Helpers ──────────────────────────────────────────────────────────────────
function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dayLabel(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();
}

function badgeLabel(badge: TonightBadge, partySize: number): string {
  if (badge === 'vip') return 'VIP';
  if (badge === 'large-party') return `PARTY OF ${partySize}`;
  if (badge === 'first-visit') return 'FIRST VISIT';
  if (badge === 'allergy') return 'ALLERGY';
  return '';
}

// ── Styles ───────────────────────────────────────────────────────────────────
const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  // Header
  pageHeader: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  kickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.gold },
  kickerText: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.9 },
  pageTitle: { fontSize: 36, fontWeight: '800', color: c.textPrimary, letterSpacing: -1, lineHeight: 40 },
  pageSub: { fontSize: 14, color: c.textMuted, fontWeight: '500', marginTop: 4 },

  // Status card
  statusCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderRadius: borderRadius.xl, backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    padding: spacing.lg,
  },
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.md },
  quietBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.full, backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  quietDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: c.textMuted },
  quietBadgeText: { fontSize: 12, fontWeight: '800', color: c.textSecondary, letterSpacing: 0.5 },
  vsPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.full, backgroundColor: '#3D1A2E',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#8B3A5A',
  },
  vsPillText: { fontSize: 12, fontWeight: '700', color: '#E87EA1' },

  coversRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 4 },
  coversLeft: {},
  coversNum: { fontSize: 52, fontWeight: '800', color: c.textPrimary, letterSpacing: -2, lineHeight: 56 },
  coversSuffix: { fontSize: 18, fontWeight: '600', color: c.textMuted },
  coversSub: { fontSize: 13, fontWeight: '500', color: c.textMuted, marginTop: 2 },
  busiestBlock: { alignItems: 'flex-end' },
  busiestWindow: { fontSize: 28, fontWeight: '800', color: c.textSecondary, letterSpacing: -0.8 },
  busiestSub: { fontSize: 12, fontWeight: '500', color: c.textMuted, marginTop: 2 },

  progressWrap: { marginTop: spacing.md },
  progressLabel: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6,
  },
  progressLabelText: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.5 },
  progressLabelPct: { fontSize: 11, fontWeight: '700', color: c.textMuted },
  progressTrack: {
    height: 6, borderRadius: 3, backgroundColor: c.bgElevated,
    overflow: 'hidden',
  },
  progressFill: { height: 6, borderRadius: 3, backgroundColor: c.gold },

  // Runway card
  runwayCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderRadius: borderRadius.xl, backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    padding: spacing.lg,
  },
  runwayTopRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.sm,
  },
  runwayKicker: { fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8 },
  runwayAfterBadge: {
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: borderRadius.full, backgroundColor: '#1A2A4A',
    borderWidth: StyleSheet.hairlineWidth, borderColor: '#3A5A8A',
  },
  runwayAfterText: { fontSize: 11, fontWeight: '700', color: '#6A9AD4' },
  runwayBig: {
    fontSize: 38, fontWeight: '800', color: c.textPrimary,
    letterSpacing: -1, lineHeight: 42, marginBottom: spacing.md,
  },
  runwayBigSuffix: { fontSize: 18, fontWeight: '600', color: c.textMuted },
  runwayTrackRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  runwayDotOpen: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#3B82F6', marginRight: 0,
  },
  runwayLine: { flex: 1, height: 2, backgroundColor: '#3B82F6' },
  runwayDotFirst: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: '#3B82F6',
  },
  runwayTrackRemainder: { flex: 2, height: 2, backgroundColor: c.bgElevated },
  runwayLabelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  runwayLabelLeft: {},
  runwayLabelTime: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
  runwayLabelSub: { fontSize: 11, fontWeight: '600', color: c.textMuted, marginTop: 2 },
  runwayLabelRight: { alignItems: 'flex-end' },
  runwayLabelTimeRight: { fontSize: 15, fontWeight: '800', color: c.gold },
  runwayLabelSubRight: { fontSize: 11, fontWeight: '600', color: c.textMuted, marginTop: 2, textAlign: 'right' },

  // Guests to know
  sectionLabel: {
    fontSize: 22, fontWeight: '800', color: c.textPrimary,
    letterSpacing: -0.5, paddingHorizontal: spacing.lg, marginBottom: spacing.sm,
  },
  guestsCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.lg,
    borderRadius: borderRadius.xl, backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border, overflow: 'hidden',
  },
  guestRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 14, gap: spacing.md, minHeight: 68,
  },
  guestRowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  guestRowPressed: { backgroundColor: c.bgElevated },
  guestAvatar: {
    width: 42, height: 42, borderRadius: 21,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  guestAvatarText: { fontSize: 13, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.2 },
  guestMain: { flex: 1, minWidth: 0 },
  guestNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3, flexWrap: 'wrap' },
  guestName: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },
  guestBadgeVip: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.full,
    backgroundColor: `${c.gold}28`, borderWidth: 1, borderColor: `${c.gold}66`,
  },
  guestBadgeVipText: { fontSize: 10, fontWeight: '800', color: c.gold, letterSpacing: 0.4 },
  guestBadgeBlue: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.full,
    backgroundColor: '#1A2A4A', borderWidth: 1, borderColor: '#3A5A8A',
  },
  guestBadgeBlueText: { fontSize: 10, fontWeight: '800', color: '#6A9AD4', letterSpacing: 0.4 },
  guestBadgeAllergy: {
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: borderRadius.full,
    backgroundColor: '#3D1A1A', borderWidth: 1, borderColor: '#8B3A3A',
  },
  guestBadgeAllergyText: { fontSize: 10, fontWeight: '800', color: '#E87A7A', letterSpacing: 0.4 },
  guestSub: { fontSize: 13, fontWeight: '500', color: c.textMuted },

  // Walk-in capacity
  walkCard: {
    marginHorizontal: spacing.lg, marginBottom: spacing.xl,
    borderRadius: borderRadius.xl, backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    padding: spacing.lg,
  },
  walkTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  walkSeatsNum: { fontSize: 44, fontWeight: '800', color: c.textPrimary, letterSpacing: -1.5, lineHeight: 48 },
  walkSeatsSuffix: { fontSize: 16, fontWeight: '600', color: c.textMuted },
  walkSub: { fontSize: 13, fontWeight: '500', color: c.textMuted, marginBottom: spacing.md },
  walkInBtn: {
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: borderRadius.full, backgroundColor: c.gold,
    marginTop: 4,
  },
  walkInBtnText: { fontSize: 13, fontWeight: '800', color: '#000' },
  walkTrack: { height: 6, borderRadius: 3, backgroundColor: c.bgElevated, overflow: 'hidden', marginBottom: spacing.sm },
  walkFill: { height: 6, borderRadius: 3, backgroundColor: c.gold },
  walkLegend: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg },
  walkLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  walkLegendSwatch: { width: 10, height: 10, borderRadius: 2 },
  walkLegendText: { fontSize: 12, fontWeight: '600', color: c.textMuted },
}));

// ── Component ────────────────────────────────────────────────────────────────
export default function TonightScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const scrollPad = useOwnerTabScrollPadding();
  const { width: screenW } = useWindowDimensions();
  const trackW = screenW - spacing.lg * 2 - spacing.lg * 2; // card margins + padding

  const b = TONIGHT_BRIEFING;
  const runwayFrac = Math.min(1, b.runwayMin / 90); // runway as fraction of 90 min max

  function GuestBadge({ badge, partySize }: { badge: TonightBadge; partySize: number }) {
    const label = badgeLabel(badge, partySize);
    if (badge === 'vip') {
      return <View style={styles.guestBadgeVip}><Text style={styles.guestBadgeVipText}>{label}</Text></View>;
    }
    if (badge === 'allergy') {
      return <View style={styles.guestBadgeAllergy}><Text style={styles.guestBadgeAllergyText}>{label}</Text></View>;
    }
    return <View style={styles.guestBadgeBlue}><Text style={styles.guestBadgeBlueText}>{label}</Text></View>;
  }

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: insets.top + spacing.sm, paddingBottom: scrollPad }}
      >
        {/* ── Header ── */}
        <View style={styles.pageHeader}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kickerText}>TONIGHT · {dayLabel()}</Text>
          </View>
          <Text style={styles.pageTitle}>{b.headline}</Text>
          <Text style={styles.pageSub}>Pre-service briefing</Text>
        </View>

        {/* ── Status card ── */}
        <View style={styles.statusCard}>
          <View style={styles.statusBadgeRow}>
            <View style={styles.quietBadge}>
              <View style={styles.quietDot} />
              <Text style={styles.quietBadgeText}>{b.statusLabel}</Text>
            </View>
            <View style={styles.vsPill}>
              <Ionicons name="arrow-down" size={11} color="#E87EA1" />
              <Text style={styles.vsPillText}>{b.vsTypical}% vs typical {dayLabel().split(' ')[0].charAt(0) + dayLabel().split(' ')[0].slice(1).toLowerCase().split(',')[0]}</Text>
            </View>
          </View>

          <View style={styles.coversRow}>
            <View style={styles.coversLeft}>
              <Text style={styles.coversNum}>{b.covers}<Text style={styles.coversSuffix}> covers</Text></Text>
              <Text style={styles.coversSub}>across {b.bookings} bookings</Text>
            </View>
            <View style={styles.busiestBlock}>
              <Text style={styles.busiestWindow}>{b.busiestWindow}</Text>
              <Text style={styles.busiestSub}>busiest · {b.busiestCovers} covers</Text>
            </View>
          </View>

          <View style={styles.progressWrap}>
            <View style={styles.progressLabel}>
              <Text style={styles.progressLabelText}>BOOKED</Text>
              <Text style={styles.progressLabelPct}>{b.bookedPct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${b.bookedPct}%` }]} />
            </View>
          </View>
        </View>

        {/* ── Runway card ── */}
        <View style={styles.runwayCard}>
          <View style={styles.runwayTopRow}>
            <Text style={styles.runwayKicker}>START OF SERVICE</Text>
            <View style={styles.runwayAfterBadge}>
              <Text style={styles.runwayAfterText}>{b.runwayMin} min after open</Text>
            </View>
          </View>
          <Text style={styles.runwayBig}>
            {b.runwayMin} <Text style={styles.runwayBigSuffix}>min runway</Text>
          </Text>
          <View style={styles.runwayTrackRow}>
            <View style={styles.runwayDotOpen} />
            <View style={[styles.runwayLine, { flex: runwayFrac * 3 }]} />
            <View style={styles.runwayDotFirst} />
            <View style={[styles.runwayTrackRemainder, { flex: (1 - runwayFrac) * 3 }]} />
          </View>
          <View style={styles.runwayLabelsRow}>
            <View style={styles.runwayLabelLeft}>
              <Text style={styles.runwayLabelTime}>{b.doorsOpen}</Text>
              <Text style={styles.runwayLabelSub}>DOORS OPEN</Text>
            </View>
            <View style={styles.runwayLabelRight}>
              <Text style={styles.runwayLabelTimeRight}>{b.firstResTime}</Text>
              <Text style={styles.runwayLabelSubRight}>FIRST RES · PARTY OF {b.firstResParty}</Text>
            </View>
          </View>
        </View>

        {/* ── Guests to know ── */}
        <Text style={styles.sectionLabel}>Guests to know · {TONIGHT_GUESTS.length}</Text>
        <View style={styles.guestsCard}>
          {TONIGHT_GUESTS.map((guest: TonightGuest, index: number) => (
            <Pressable
              key={guest.id}
              style={({ pressed }) => [
                styles.guestRow,
                index > 0 && styles.guestRowDivider,
                pressed && styles.guestRowPressed,
              ]}
              accessibilityRole="button"
            >
              <View style={[styles.guestAvatar, { backgroundColor: guest.avatarColor }]}>
                <Text style={styles.guestAvatarText}>{initials(guest.name)}</Text>
              </View>
              <View style={styles.guestMain}>
                <View style={styles.guestNameRow}>
                  <Text style={styles.guestName} numberOfLines={1}>{guest.name}</Text>
                  <GuestBadge badge={guest.badge} partySize={guest.partySize} />
                </View>
                <Text style={styles.guestSub} numberOfLines={1}>
                  {guest.time} · party of {guest.partySize}
                  {guest.note ? ` · ${guest.note}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* ── Walk-in capacity ── */}
        <Text style={styles.sectionLabel}>Walk-in capacity</Text>
        <View style={styles.walkCard}>
          <View style={styles.walkTopRow}>
            <View>
              <Text style={styles.walkSeatsNum}>{b.openSeats}<Text style={styles.walkSeatsSuffix}> seats open</Text></Text>
            </View>
            <Pressable style={styles.walkInBtn} accessibilityRole="button">
              <Text style={styles.walkInBtnText}>+ Walk-in</Text>
            </Pressable>
          </View>
          <Text style={styles.walkSub}>{b.bookedSeats} booked / {b.totalCapacity} total</Text>
          <View style={styles.walkTrack}>
            <View style={[styles.walkFill, { width: `${b.bookedPct}%` }]} />
          </View>
          <View style={styles.walkLegend}>
            <View style={styles.walkLegendItem}>
              <View style={[styles.walkLegendSwatch, { backgroundColor: c.gold }]} />
              <Text style={styles.walkLegendText}>Booked {b.bookedPct}%</Text>
            </View>
            <View style={styles.walkLegendItem}>
              <View style={[styles.walkLegendSwatch, { backgroundColor: c.bgElevated, borderWidth: 1, borderColor: c.border }]} />
              <Text style={styles.walkLegendText}>Open {100 - b.bookedPct}%</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
