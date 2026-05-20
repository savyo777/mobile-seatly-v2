import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { fetchCurrentOwnerRestaurant } from '@/lib/services/ownerRestaurant';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';
import { OWNER_TRIAL_MONTHS } from '@/lib/owner/trialPolicy';
import { ownerMonthlyPriceShort } from '@/lib/owner/ownerPricing';

const TRIAL_LABEL = OWNER_TRIAL_MONTHS === 1 ? '1 month free' : `${OWNER_TRIAL_MONTHS} months free`;

const useStyles = createStyles((c) => ({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },

  titleWrap: {
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  eyebrow: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  title: { ...typography.h2, color: c.textPrimary },
  subtitle: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },

  noteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
    flex: 1,
  },

  summaryCard: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  summaryLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  summaryValue: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  summaryText: {
    ...typography.bodySmall,
    color: c.textSecondary,
    lineHeight: 18,
  },

  list: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  listIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
  },
  listText: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
  },

  footer: { marginTop: spacing.sm },
  secureRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: { ...typography.bodySmall, color: c.textMuted },
}));

export default function RegisterRestaurantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const { user } = useAuthSession();
  const params = useLocalSearchParams<{ intent?: string }>();
  // When existing owners tap "Add restaurant" from staff Settings, they
  // arrive here with `?intent=add` so we know to skip the auto-redirect
  // guard that would otherwise bounce them back into the staff shell.
  const isAddingMore = params.intent === 'add';

  // Guard: if this user already owns a restaurant, send them straight to
  // the staff side instead of forcing a re-registration. This handles
  // direct navigation, deep links, or back-button cases where the
  // settings-row gate isn't in play. Skipped when intent=add so existing
  // owners can register a second/third location.
  const [redirecting, setRedirecting] = useState(false);
  useEffect(() => {
    let cancelled = false;
    if (!user?.id) return;
    if (isAddingMore) return;
    void (async () => {
      try {
        const existing = await fetchCurrentOwnerRestaurant();
        if (cancelled) return;
        if (existing?.id) {
          setRedirecting(true);
          await setAppShellPreference('staff');
          if (!cancelled) router.replace('/(staff)' as never);
        }
      } catch {
        // best-effort — fall through to the registration UI on error
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, router, isAddingMore]);

  if (redirecting) {
    return (
      <ScreenWrapper padded>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={c.gold} />
          <Text style={[typography.bodySmall, { color: c.textMuted, marginTop: spacing.md }]}>
            Switching to your restaurant…
          </Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.7 }]}
            hitSlop={12}
          >
            <Ionicons name="chevron-back" size={20} color={c.textSecondary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
          <Text style={{ color: c.gold, fontWeight: '700', letterSpacing: 4 }}>CENAIVA</Text>
          <View style={styles.topRight} />
        </View>

        <View style={styles.titleWrap}>
          <Text style={styles.eyebrow}>Restaurant onboarding</Text>
          <Text style={styles.title}>Register your restaurant</Text>
          <Text style={styles.subtitle}>
            Add your restaurant to Cenaiva and start taking bookings.
          </Text>
        </View>

        <View style={styles.noteRow}>
          <Ionicons name="sparkles-outline" size={14} color={c.gold} />
          <Text style={styles.noteText}>
            {`${TRIAL_LABEL}, then ${ownerMonthlyPriceShort()}/month. Cancel anytime.`}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>What's next</Text>
          <Text style={styles.summaryValue}>3 quick steps</Text>
          <Text style={styles.summaryText}>
            Add your restaurant details, set up Stripe payouts, then save a card for billing after the trial.
          </Text>
        </View>

        <View style={styles.list}>
          <View style={styles.listRow}>
            <View style={styles.listIcon}>
              <Ionicons name="checkmark" size={16} color={c.gold} />
            </View>
            <Text style={styles.listText}>{TRIAL_LABEL}</Text>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listIcon}>
              <Ionicons name="checkmark" size={16} color={c.gold} />
            </View>
            <Text style={styles.listText}>Cancel anytime</Text>
          </View>
          <View style={styles.listRow}>
            <View style={styles.listIcon}>
              <Ionicons name="checkmark" size={16} color={c.gold} />
            </View>
            <Text style={styles.listText}>Takes about 3 minutes</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Button
            title="Get started"
            onPress={() => router.push('/(customer)/profile/register-restaurant-form')}
            size="lg"
          />
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>Your information is encrypted and private.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
