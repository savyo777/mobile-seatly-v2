import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { OwnerHeader } from '@/components/owner/OwnerHeader';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  OWNER_GUESTS,
  isAtRisk,
  isNewGuest,
  isRegular,
  type OwnerGuest,
} from '@/lib/mock/guests';

type Filter = 'all' | 'vip' | 'risk' | 'new' | 'regular';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'vip', label: 'VIP' },
  { key: 'risk', label: 'At risk' },
  { key: 'new', label: 'New' },
  { key: 'regular', label: 'Regulars' },
];

function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function daysSince(iso: string): string {
  const d = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  if (d <= 0) return 'Today';
  if (d === 1) return 'Yesterday';
  if (d < 30) return `${d}d ago`;
  const m = Math.floor(d / 30);
  if (m < 12) return `${m}mo ago`;
  return `${Math.floor(m / 12)}y ago`;
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  searchWrap: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    height: 44,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: c.textPrimary,
    paddingVertical: 0,
  },

  chipScroll: {
    marginBottom: spacing.md,
  },
  chipRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  chipActive: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
  chipTextActive: {
    color: c.bgBase,
  },

  listCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 64,
  },
  rowPressed: {
    backgroundColor: c.bgElevated,
  },
  rowDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.textPrimary,
  },

  mid: { flex: 1, minWidth: 0, gap: 3 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    flexShrink: 1,
  },
  vipStar: { color: c.gold },
  meta: {
    fontSize: 12,
    color: c.textMuted,
    fontWeight: '500',
  },

  right: {
    alignItems: 'flex-end',
    gap: 4,
  },
  visits: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
  },
  visitsLabel: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  riskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: c.danger,
    marginLeft: 4,
  },

  empty: {
    padding: spacing['2xl'],
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
  },
}));

export default function OwnerGuestsScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return OWNER_GUESTS.filter((g) => {
      if (filter === 'vip' && !g.isVip) return false;
      if (filter === 'risk' && !isAtRisk(g)) return false;
      if (filter === 'new' && !isNewGuest(g)) return false;
      if (filter === 'regular' && !isRegular(g)) return false;
      if (!q) return true;
      return (
        g.fullName.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        g.phone.replace(/\s|[()-]/g, '').includes(q.replace(/\s|[()-]/g, ''))
      );
    }).sort((a, b) => b.lifetimeValueScore - a.lifetimeValueScore);
  }, [filter, query]);

  return (
    <View style={styles.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: insets.top + spacing.sm,
          paddingBottom: insets.bottom + 110,
        }}
      >
        <OwnerHeader title="Guests" subtitle={`${OWNER_GUESTS.length} total`} />

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email, or phone"
            placeholderTextColor={c.textMuted}
            style={styles.searchInput}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')} hitSlop={8}>
              <Ionicons name="close-circle" size={18} color={c.textMuted} />
            </Pressable>
          ) : null}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipScroll}
          contentContainerStyle={styles.chipRow}
        >
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, filter === f.key && styles.chipActive]}
            >
              <Text style={[styles.chipText, filter === f.key && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No guests match.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {filtered.map((g, i) => (
              <Pressable
                key={g.id}
                onPress={() => router.push(`/(staff)/guests/${g.id}` as never)}
                style={({ pressed }) => [
                  styles.row,
                  i > 0 && styles.rowDivider,
                  pressed && styles.rowPressed,
                ]}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(g.fullName)}</Text>
                </View>
                <View style={styles.mid}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>
                      {g.fullName}
                    </Text>
                    {g.isVip ? (
                      <Ionicons name="star" size={13} style={styles.vipStar} />
                    ) : null}
                    {isAtRisk(g) ? <View style={styles.riskDot} /> : null}
                  </View>
                  <Text style={styles.meta} numberOfLines={1}>
                    Last visit {daysSince(g.lastVisitAt)} · {g.loyaltyTier}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.visits}>{g.totalVisits}</Text>
                  <Text style={styles.visitsLabel}>Visits</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={c.textMuted} />
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
