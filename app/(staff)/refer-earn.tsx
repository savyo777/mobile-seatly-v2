import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { getSupabase } from '@/lib/supabase/client';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  OWNER_REFERRAL_BONUS_DAYS,
  buildOwnerReferralDeepLink,
} from '@/lib/owner/referralPolicy';

type GrantRow = {
  id: string;
  referred_restaurant_id: string;
  days_added: number;
  granted_at: string;
  // PostgREST returns the joined table as an array when the FK relationship
  // isn't declared one-to-one. Either shape is possible across supabase-js
  // versions; we normalize at the render site.
  restaurants?: { name: string | null } | Array<{ name: string | null }> | null;
};

function readRestaurantName(rel: GrantRow['restaurants']): string | null {
  if (!rel) return null;
  if (Array.isArray(rel)) return rel[0]?.name ?? null;
  return rel.name ?? null;
}

const useStyles = createStyles((c) => ({
  intro: {
    paddingHorizontal: 4,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  introTitle: { ...typography.h2, color: c.textPrimary },
  introText: { ...typography.body, color: c.textMuted, lineHeight: 22 },

  hero: {
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.35)',
    backgroundColor: c.bgSurface,
    gap: spacing.sm,
  },
  heroTitle: { ...typography.h3, color: c.textPrimary, fontWeight: '700' },
  heroBody: { ...typography.body, color: c.textSecondary, lineHeight: 22 },

  codeLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },
  codeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.4)',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  codeText: {
    fontSize: 20,
    fontWeight: '700',
    color: c.gold,
    letterSpacing: 2,
  },
  codePlaceholder: {
    ...typography.body,
    color: c.textMuted,
  },

  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    borderRadius: borderRadius.lg,
    backgroundColor: c.textPrimary,
    marginBottom: spacing.lg,
  },
  shareBtnText: {
    ...typography.body,
    color: c.bgBase,
    fontWeight: '700',
  },

  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  statTile: {
    flex: 1,
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.md,
    gap: 4,
  },
  statLabel: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  statValue: {
    ...typography.h2,
    color: c.gold,
    fontWeight: '800',
  },

  sectionTitle: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1.2,
    marginBottom: spacing.sm,
    paddingHorizontal: 4,
  },

  grantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.md,
    backgroundColor: c.bgSurface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  grantRowFirst: {
    borderTopWidth: 0,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  grantRowLast: {
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  grantIcon: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: c.bgElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grantName: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  grantMeta: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
  },
  grantBonus: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
  },

  emptyCard: {
    borderRadius: borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    backgroundColor: c.bgSurface,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySmall,
    color: c.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },

  loadingRow: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
}));

function formatBonusLabel(days: number): string {
  if (days % 30 === 0) {
    const months = days / 30;
    return `+${months} ${months === 1 ? 'month' : 'months'}`;
  }
  return `+${days} days`;
}

function formatGrantDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function ReferEarnScreen() {
  const c = useColors();
  const styles = useStyles();
  const { session } = useAuthSession();

  const [code, setCode] = useState<string | null>(null);
  const [loadingCode, setLoadingCode] = useState(true);
  const [grants, setGrants] = useState<GrantRow[]>([]);

  const loadCode = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoadingCode(false);
      return;
    }
    setLoadingCode(true);
    try {
      const { data, error } = await supabase.rpc('get_or_create_owner_referral_code');
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      const value = (row as { code?: string } | null)?.code ?? null;
      setCode(value);
    } catch (error) {
      Alert.alert('Could not load code', friendlyError(error, "We couldn't load your referral code. Please try again."));
    } finally {
      setLoadingCode(false);
    }
  }, []);

  const loadGrants = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !session?.user?.id) return;
    const { data, error } = await supabase
      .from('referral_credit_grants')
      .select('id, referred_restaurant_id, days_added, granted_at, restaurants:referred_restaurant_id(name)')
      .order('granted_at', { ascending: false })
      .limit(50);
    if (error) {
      // Silent — the screen still works without history.
      return;
    }
    setGrants((data ?? []) as unknown as GrantRow[]);
  }, [session?.user?.id]);

  useEffect(() => {
    void loadCode();
    void loadGrants();
  }, [loadCode, loadGrants]);

  const onShare = async () => {
    if (!code) return;
    const link = buildOwnerReferralDeepLink(code);
    const message =
      `Run a restaurant? Join me on Cenaiva and we both win: I get ${OWNER_REFERRAL_BONUS_DAYS} extra days on my subscription.\n\n` +
      `Sign up with my link: ${link}\n` +
      `Or use code: ${code}`;
    try {
      await Share.share({ message, title: 'Cenaiva owner referral' });
    } catch (error) {
      Alert.alert('Could not share', friendlyError(error, 'Please try again.'));
    }
  };

  const totalGrants = grants.length;
  const totalDays = grants.reduce((sum, g) => sum + (Number(g.days_added) || 0), 0);
  const totalMonths = Math.round((totalDays / 30) * 10) / 10;

  return (
    <OwnerScreen header={<SubpageHeader title="Refer & earn" accentBack />}>
      <View style={styles.intro}>
        <Text style={styles.introTitle}>Refer & earn</Text>
        <Text style={styles.introText}>
          Share your code with another restaurant. When they sign up with Cenaiva, your next charge
          slips by {OWNER_REFERRAL_BONUS_DAYS} days — that's two months on us.
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>How it works</Text>
        <Text style={styles.heroBody}>
          1. Send your code (or share link) to a restaurant owner.{'\n'}
          2. They sign up for Cenaiva and finish onboarding.{'\n'}
          3. We slide your next billing date forward by {OWNER_REFERRAL_BONUS_DAYS} days. Whether
          you're on the free trial or already paying, the result is the same.
        </Text>
      </View>

      <Text style={styles.codeLabel}>YOUR REFERRAL CODE</Text>
      <Pressable
        style={styles.codeBox}
        onPress={code ? onShare : loadCode}
        accessibilityRole="button"
        accessibilityLabel={code ? 'Share referral code' : 'Retry loading referral code'}
      >
        {loadingCode ? (
          <ActivityIndicator color={c.gold} />
        ) : code ? (
          <Text selectable style={styles.codeText}>{code}</Text>
        ) : (
          <Text style={styles.codePlaceholder}>Tap to retry</Text>
        )}
        <Ionicons name="share-outline" size={20} color={c.gold} />
      </Pressable>

      <Pressable
        onPress={onShare}
        disabled={!code}
        style={({ pressed }) => [
          styles.shareBtn,
          (!code || pressed) && { opacity: 0.85 },
        ]}
      >
        <Ionicons name="share-outline" size={18} color={c.bgBase} />
        <Text style={styles.shareBtnText}>Share invite</Text>
      </Pressable>

      <View style={styles.statsRow}>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Restaurants referred</Text>
          <Text style={styles.statValue}>{totalGrants}</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statLabel}>Months earned</Text>
          <Text style={styles.statValue}>{totalMonths}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>HISTORY</Text>
      {grants.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="gift-outline" size={22} color={c.textMuted} />
          <Text style={styles.emptyText}>
            No referrals yet. Share your code and the credits will show up here.
          </Text>
        </View>
      ) : (
        <View>
          {grants.map((g, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === grants.length - 1;
            return (
              <View
                key={g.id}
                style={[
                  styles.grantRow,
                  isFirst && styles.grantRowFirst,
                  isLast && styles.grantRowLast,
                ]}
              >
                <View style={styles.grantIcon}>
                  <Ionicons name="business-outline" size={16} color={c.gold} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.grantName}>{readRestaurantName(g.restaurants) ?? 'Restaurant'}</Text>
                  <Text style={styles.grantMeta}>Joined {formatGrantDate(g.granted_at)}</Text>
                </View>
                <Text style={styles.grantBonus}>{formatBonusLabel(g.days_added)}</Text>
              </View>
            );
          })}
        </View>
      )}
    </OwnerScreen>
  );
}
