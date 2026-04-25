import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { EventCard } from '@/components/events/EventCard';
import { OWNER_PROMOTIONS, type OwnerPromotion } from '@/lib/mock/ownerApp';
import type { DiningEvent, EventType } from '@/lib/mock/events';

type Tab = 'active' | 'past';

const FALLBACK_IMAGE = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800';

function isActive(p: OwnerPromotion): boolean {
  return p.status === 'live' || p.status === 'scheduled' || p.status === 'paused' || p.status === 'draft';
}

function isPast(p: OwnerPromotion): boolean {
  return p.status === 'expired';
}

function toEventType(p: OwnerPromotion): EventType {
  if (p.type === 'happy_hour') return 'happy_hour';
  return 'promotion';
}

function toEvent(p: OwnerPromotion): DiningEvent {
  return {
    id: p.id,
    restaurantId: 'r1',
    title: p.name,
    description: p.description,
    coverImage: p.coverImage ?? FALLBACK_IMAGE,
    type: toEventType(p),
    date: `${p.startDate}T${p.startTime.includes('PM') && !p.startTime.startsWith('12') ? String(parseInt(p.startTime) + 12).padStart(2, '0') : p.startTime.padStart(2, '0')}:00:00`,
    endsAt: `${p.endDate}T20:00:00`,
    price: p.offerTag ? undefined : undefined,
    spotsLeft: p.spotsLeft,
    tags: [],
    savedBy: [],
  };
}

const useStyles = createStyles((c) => ({
  safe: { flex: 1, backgroundColor: c.bgBase },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 120 },

  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  kickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.gold },
  kicker: { fontSize: 11, fontWeight: '700', color: c.gold, letterSpacing: 1.2 },
  title: { fontSize: 34, fontWeight: '800', color: c.textPrimary, letterSpacing: -0.8, marginBottom: 4 },
  subtitle: { fontSize: 14, fontWeight: '500', color: c.textMuted },

  segmentWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    padding: 4,
    gap: 4,
  },
  segTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  segTabActive: { backgroundColor: 'rgba(212,175,55,0.18)' },
  segText: { fontSize: 14, fontWeight: '700', color: c.textMuted },
  segTextActive: { color: c.gold },

  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 15, color: c.textMuted, fontWeight: '500' },
}));

export default function PromosScreen() {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState<Tab>('active');

  const activeList = useMemo(() => OWNER_PROMOTIONS.filter(isActive), []);
  const pastList = useMemo(() => OWNER_PROMOTIONS.filter(isPast), []);
  const list = tab === 'active' ? activeList : pastList;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.kickerRow}>
            <View style={styles.kickerDot} />
            <Text style={styles.kicker}>PROMOTIONS</Text>
          </View>
          <Text style={styles.title}>Offers & promos</Text>
          <Text style={styles.subtitle}>{activeList.length} live · {pastList.length} past</Text>
        </View>

        <View style={styles.segmentWrap}>
          <Pressable
            style={[styles.segTab, tab === 'active' && styles.segTabActive]}
            onPress={() => setTab('active')}
          >
            <Text style={[styles.segText, tab === 'active' && styles.segTextActive]}>
              Active · {activeList.length}
            </Text>
          </Pressable>
          <Pressable
            style={[styles.segTab, tab === 'past' && styles.segTabActive]}
            onPress={() => setTab('past')}
          >
            <Text style={[styles.segText, tab === 'past' && styles.segTextActive]}>
              Past · {pastList.length}
            </Text>
          </Pressable>
        </View>

        {list.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No promotions here yet</Text>
          </View>
        ) : (
          list.map((p) => <EventCard key={p.id} event={toEvent(p)} isHero />)
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
