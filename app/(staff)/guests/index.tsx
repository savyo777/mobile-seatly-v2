import React, { useEffect, useMemo, useState } from 'react';
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
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  OWNER_GUESTS as DEMO_OWNER_GUESTS,
  isAtRisk,
  isNewGuest,
  isRegular,
  type LoyaltyTier,
  type OwnerGuest,
} from '@/lib/mock/guests';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { isLoyaltyEnabled } from '@/lib/config/loyaltyFeature';
import { getSupabase } from '@/lib/supabase/client';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { fetchLoyaltyTransactionsForGuests } from '@/lib/loyalty/getLoyaltyTransactions';
import { sanitizeSearchInput } from '@/lib/validation/input';

function mapDbGuestRow(row: Record<string, unknown>): OwnerGuest {
  const tier = (typeof row.loyalty_tier === 'string'
    ? (row.loyalty_tier as string).toLowerCase()
    : 'bronze') as LoyaltyTier;
  const car = (row.car_details_json ?? null) as
    | { make?: string; model?: string; plate?: string }
    | null;
  return {
    id: String(row.id ?? ''),
    fullName: String(row.full_name ?? 'Guest'),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    preferredLanguage: (row.preferred_language === 'fr' ? 'fr' : 'en') as 'en' | 'fr',
    birthday: (row.birthday as string | undefined) || undefined,
    anniversary: (row.anniversary as string | undefined) || undefined,
    isVip: Boolean(row.is_vip),
    isBlocked: Boolean(row.is_blocked),
    totalVisits: Number(row.total_visits ?? 0) || 0,
    totalSpend: Number(row.total_spend ?? 0) || 0,
    averageSpendPerVisit: Number(row.average_spend_per_visit ?? 0) || 0,
    highestSingleBill: Number(row.highest_single_bill ?? 0) || 0,
    lastVisitAt: String(row.last_visit_at ?? row.created_at ?? new Date().toISOString()),
    firstVisitAt: String(row.first_visit_at ?? row.created_at ?? new Date().toISOString()),
    noShowCount: Number(row.no_show_count ?? 0) || 0,
    cancellationCount: Number(row.cancellation_count ?? 0) || 0,
    noShowRiskScore: Number(row.no_show_risk_score ?? 0) || 0,
    lifetimeValueScore: Number(row.lifetime_value_score ?? 0) || 0,
    acquisitionSource: String(row.acquisition_source ?? '—'),
    lastContactedAt: (row.last_contacted_at as string | undefined) || undefined,
    allergies: Array.isArray(row.allergies) ? (row.allergies as string[]) : [],
    dietaryRestrictions: Array.isArray(row.dietary_restrictions) ? (row.dietary_restrictions as string[]) : [],
    seatingPreference: (row.seating_preference as string | undefined) || undefined,
    noisePreference: (row.noise_preference as string | undefined) || undefined,
    favouriteDishes: Array.isArray(row.favourite_dishes) ? (row.favourite_dishes as string[]) : [],
    favouriteDrinks: Array.isArray(row.favourite_drinks) ? (row.favourite_drinks as string[]) : [],
    loyaltyTier: tier === 'silver' || tier === 'gold' || tier === 'platinum' ? tier : 'bronze',
    loyaltyPointsBalance: Number(row.loyalty_points_balance ?? 0) || 0,
    loyaltyPointsEarnedTotal: Number(row.loyalty_points_earned_total ?? 0) || 0,
    loyaltyPointsRedeemedTotal: Number(row.loyalty_points_redeemed_total ?? 0) || 0,
    foodSpendTotal: Number(row.food_spend_total ?? 0) || 0,
    drinksSpendTotal: Number(row.drinks_spend_total ?? 0) || 0,
    totalDepositsPaid: Number(row.total_deposits_paid ?? 0) || 0,
    totalDepositsForfeited: Number(row.total_deposits_forfeited ?? 0) || 0,
    smsOptIn: Boolean(row.sms_opt_in),
    emailOptIn: Boolean(row.email_opt_in),
    carDetails:
      car && (car.make || car.model || car.plate)
        ? { make: String(car.make ?? ''), model: String(car.model ?? ''), plate: String(car.plate ?? '') }
        : undefined,
    notes: [],
    surveys: [],
    incidents: [],
    comms: [],
    loyaltyTx: [],
  };
}

export async function fetchOwnerGuests(restaurantId: string): Promise<OwnerGuest[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('guests')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('lifetime_value_score', { ascending: false });
  if (error || !data) return [];
  return (data as Array<Record<string, unknown>>).map(mapDbGuestRow);
}

export async function hydrateGuestRelations(guest: OwnerGuest): Promise<OwnerGuest> {
  const supabase = getSupabase();
  if (!supabase || !guest.id) return guest;
  try {
    const [notesRes, incidentsRes, commsRes, loyaltyRows] = await Promise.all([
      supabase
        .from('guest_notes')
        .select('id,note,category,is_pinned,created_at,staff_id')
        .eq('guest_id', guest.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('allergy_incidents')
        .select('id,allergen,severity,action_taken,dish_id,created_at')
        .eq('guest_id', guest.id)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('communication_log')
        .select('id,channel,type,subject,status,sent_at,opened_at,replied_at')
        .eq('guest_id', guest.id)
        .order('sent_at', { ascending: false })
        .limit(50),
      // Skip the loyalty transactions query while the feature is hidden —
      // saves a round-trip; the UI doesn't render the data anyway. See
      // lib/config/loyaltyFeature.ts.
      isLoyaltyEnabled()
        ? fetchLoyaltyTransactionsForGuests([guest.id], { limit: 50 })
        : Promise.resolve([] as Awaited<ReturnType<typeof fetchLoyaltyTransactionsForGuests>>),
    ]);
    const notes = ((notesRes.data ?? []) as Array<Record<string, unknown>>).map((n) => ({
      id: String(n.id ?? ''),
      note: String(n.note ?? ''),
      category: String(n.category ?? 'General'),
      staffName: '',
      createdAt: String(n.created_at ?? ''),
      isPinned: Boolean(n.is_pinned),
    }));
    const incidents = ((incidentsRes.data ?? []) as Array<Record<string, unknown>>).map((i) => ({
      id: String(i.id ?? ''),
      allergen: String(i.allergen ?? ''),
      severity: (String(i.severity ?? 'mild') as 'mild' | 'moderate' | 'severe'),
      actionTaken: String(i.action_taken ?? ''),
      dishName: undefined,
      createdAt: String(i.created_at ?? ''),
    }));
    const comms = ((commsRes.data ?? []) as Array<Record<string, unknown>>).map((c) => ({
      id: String(c.id ?? ''),
      channel: (String(c.channel ?? 'email') as 'sms' | 'email' | 'push'),
      type: String(c.type ?? ''),
      subject: String(c.subject ?? ''),
      status: (String(c.status ?? 'sent') as 'sent' | 'delivered' | 'opened' | 'replied' | 'failed'),
      sentAt: String(c.sent_at ?? ''),
      openedAt: (c.opened_at as string | undefined) || undefined,
      repliedAt: (c.replied_at as string | undefined) || undefined,
    }));
    const tx = loyaltyRows.map((row) => ({
      id: String(row.id ?? ''),
      type: (String(row.type ?? 'earn') as 'earn' | 'redeem' | 'adjust'),
      points: Number(row.points ?? 0) || 0,
      description: String(row.description ?? ''),
      createdAt: String(row.created_at ?? ''),
    }));
    return { ...guest, notes, incidents, comms, loyaltyTx: tx };
  } catch {
    return guest;
  }
}

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

  stickyHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xs,
    backgroundColor: c.bgBase,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },

  searchWrap: {
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
  const [guests, setGuests] = useState<OwnerGuest[]>(
    isDemoModeEnabled() ? DEMO_OWNER_GUESTS : [],
  );

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    let active = true;
    void (async () => {
      try {
        const profile = await fetchCurrentUserProfile();
        const restaurantId = profile?.restaurantId;
        if (!restaurantId) return;
        const rows = await fetchOwnerGuests(restaurantId);
        if (!active) return;
        setGuests(rows);
      } catch {
        // swallow; UI shows empty state.
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guests.filter((g) => {
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
  }, [filter, query, guests]);

  return (
    <View style={styles.root}>
      <View style={[styles.stickyHeader, { paddingTop: insets.top + spacing.sm }]}>
        <SubpageHeader
          title="Guests"
          subtitle={`${guests.length} total`}
          fallbackTab="home"
          accentBack
        />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: spacing.sm,
          paddingBottom: spacing.lg,
          paddingHorizontal: spacing.lg,
        }}
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={c.textMuted} />
          <TextInput
            value={query}
            onChangeText={(value) => setQuery(sanitizeSearchInput(value))}
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
                    {isLoyaltyEnabled()
                      ? `Last visit ${daysSince(g.lastVisitAt)} · ${g.loyaltyTier}`
                      : `Last visit ${daysSince(g.lastVisitAt)}`}
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
