import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  createOnboardingLink,
  getConnectStatus,
  type RestaurantConnectStatus,
} from '@/lib/owner/connectOnboarding';

// On Safari "success" return (owner submitted the form), poll for up
// to 15 × 2s = 30s waiting for `account.updated` webhook to flip
// stripe_charges_enabled. Mirrors Web Step 8's wait pattern.
const POLL_ATTEMPTS_FULL = 15;
const POLL_INTERVAL_MS = 2000;
// On Safari "cancel"/"dismiss" (owner closed without finishing), do
// ONE quick status check then stop. Holding the polling spinner for
// 30s after a deliberate close is confusing — the owner just gets
// stuck staring at a loading button. The single refresh covers the
// edge case where Stripe still managed to push an account.updated
// just before the close.
const POLL_ATTEMPTS_CANCEL = 1;

const useStyles = createStyles((c) => ({
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacing['3xl'] },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  backText: { ...typography.body, color: c.textSecondary },
  topRight: { width: 60 },

  titleWrap: { marginBottom: spacing.lg, gap: spacing.sm },
  eyebrow: {
    ...typography.label,
    color: c.gold,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  title: { ...typography.h2, color: c.textPrimary },
  subtitle: { ...typography.body, color: c.textSecondary, lineHeight: 22 },

  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bulletDot: { ...typography.body, color: c.gold, lineHeight: 22 },
  bulletText: { flex: 1, ...typography.bodySmall, color: c.textSecondary, lineHeight: 19 },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  statusLabel: { flex: 1, ...typography.body, color: c.textPrimary },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
    fontSize: 12,
    fontWeight: '700',
  },
  badgeOn: { backgroundColor: 'rgba(60, 178, 110, 0.18)', color: c.success ?? '#3CB26E' },
  badgeOff: { backgroundColor: 'rgba(255,255,255,0.06)', color: c.textMuted },

  pollingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  pollingText: { flex: 1, ...typography.bodySmall, color: c.textSecondary },

  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(60, 178, 110, 0.4)',
    backgroundColor: 'rgba(60, 178, 110, 0.10)',
  },
  verifiedText: { flex: 1, ...typography.bodySmall, color: c.textPrimary, fontWeight: '600' },

  footer: { marginTop: spacing.sm, gap: spacing.sm },
  secureRow: {
    marginTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secureText: { ...typography.bodySmall, color: c.textMuted },
}));

export default function RegisterRestaurantConnectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const params = useLocalSearchParams<{
    businessName?: string;
    address?: string;
    ownerPhone?: string;
    restaurantId?: string;
    trialEndsAt?: string;
  }>();

  const restaurantId = typeof params.restaurantId === 'string' ? params.restaurantId.trim() : '';

  const [status, setStatus] = useState<RestaurantConnectStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [polling, setPolling] = useState(false);
  const [loaded, setLoaded] = useState(false);
  // Guard against the auto-advance firing more than once if the user
  // double-taps or the effect re-runs while we're already navigating.
  const advancedRef = useRef(false);

  const chargesEnabled = status?.chargesEnabled === true;
  const detailsSubmitted = status?.detailsSubmitted === true;
  const hasAccount = !!status?.stripeAccountId;

  // Defensive: if we somehow landed here without a restaurantId (e.g. via
  // a deep link bypassing the form step), bounce back to the form.
  useEffect(() => {
    if (!restaurantId) {
      router.replace('/(customer)/profile/register-restaurant-form');
    }
  }, [restaurantId, router]);

  const refresh = useCallback(async () => {
    if (!restaurantId) return null;
    try {
      const next = await getConnectStatus(restaurantId);
      setStatus(next);
      return next;
    } catch (err) {
      Alert.alert('Stripe Connect', friendlyError(err, 'Could not load Stripe status.'));
      return null;
    }
  }, [restaurantId]);

  // Initial status read on mount + on re-focus (back-nav from card-entry
  // shouldn't render stale flags).
  useEffect(() => {
    let active = true;
    void (async () => {
      await refresh();
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  // Poll for up to `attempts × POLL_INTERVAL_MS` after the owner returns
  // from Stripe, waiting for the `account.updated` webhook to flip
  // stripe_charges_enabled. Stops as soon as chargesEnabled flips true.
  // Callers pass POLL_ATTEMPTS_FULL on a real submit ("success") and
  // POLL_ATTEMPTS_CANCEL when the owner explicitly closed the sheet.
  const pollUntilVerified = useCallback(
    async (attempts: number) => {
      setPolling(true);
      try {
        for (let attempt = 0; attempt < attempts; attempt += 1) {
          const next = await refresh();
          if (next?.chargesEnabled === true) return true;
          // Skip the trailing sleep on the last attempt — saves up to
          // POLL_INTERVAL_MS of dead spinner time.
          if (attempt < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
          }
        }
        return false;
      } finally {
        setPolling(false);
      }
    },
    [refresh],
  );

  const handleStart = useCallback(async () => {
    if (!restaurantId || busy) return;
    setBusy(true);
    try {
      const { url } = await createOnboardingLink(restaurantId);
      // Safari View Controller on iOS / Chrome Custom Tab on Android.
      // Stripe redirects back via cenaiva://stripe/connect/return when the
      // owner finishes or cancels — both paths re-poll the DB.
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        'cenaiva://stripe/connect/return',
        { showInRecents: false },
      );
      // 'success' = Stripe redirected back via the cenaiva:// deep link
      // (the owner finished or refreshed mid-flow). 'cancel'/'dismiss' =
      // owner closed the sheet without finishing. We only sit on the
      // full 30s polling window for the success path; for a deliberate
      // close we do one quick refresh and unblock the UI so the owner
      // can tap the CTA again to resume.
      if (result.type === 'success') {
        await pollUntilVerified(POLL_ATTEMPTS_FULL);
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        await pollUntilVerified(POLL_ATTEMPTS_CANCEL);
      }
    } catch (err) {
      Alert.alert('Stripe Connect', friendlyError(err, 'Could not start Stripe onboarding.'));
    } finally {
      setBusy(false);
    }
  }, [restaurantId, busy, pollUntilVerified]);

  const advanceToCardEntry = useCallback(() => {
    if (advancedRef.current) return;
    advancedRef.current = true;
    router.push({
      pathname: '/(customer)/profile/register-restaurant-card-entry',
      params: {
        businessName: typeof params.businessName === 'string' ? params.businessName : '',
        address: typeof params.address === 'string' ? params.address : '',
        ownerPhone: typeof params.ownerPhone === 'string' ? params.ownerPhone : '',
        restaurantId,
        trialEndsAt: typeof params.trialEndsAt === 'string' ? params.trialEndsAt : '',
      },
    });
  }, [router, params.businessName, params.address, params.ownerPhone, params.trialEndsAt, restaurantId]);

  // Auto-advance ~1s after we detect verification, giving the user a
  // moment to see the green banner before the screen swaps.
  useEffect(() => {
    if (!chargesEnabled || advancedRef.current) return;
    const timer = setTimeout(advanceToCardEntry, 1000);
    return () => clearTimeout(timer);
  }, [chargesEnabled, advanceToCardEntry]);

  const ctaTitle = useMemo(() => {
    if (busy) return 'Opening Stripe…';
    if (polling) return 'Verifying with Stripe…';
    if (chargesEnabled) return 'Continue to billing';
    if (hasAccount) return 'Continue Stripe setup';
    return 'Set up payouts with Stripe';
  }, [busy, polling, chargesEnabled, hasAccount]);

  const ctaOnPress = chargesEnabled ? advanceToCardEntry : handleStart;
  const ctaDisabled = !loaded || busy || polling || !restaurantId;

  return (
    <ScreenWrapper padded>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, spacing.lg) },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
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
          <Text style={styles.eyebrow}>Step 2 of 3 · Payouts</Text>
          <Text style={styles.title}>Set up Stripe payouts</Text>
          <Text style={styles.subtitle}>
            Stripe handles payouts to your business bank account. You&apos;ll complete a short
            form (business details, SIN / tax info, banking, identity verification) so you can
            start accepting deposits and charging diner bills.
          </Text>
        </View>

        <View style={styles.card}>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Payouts arrive in your linked Canadian bank account every 2 business days.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Cenaiva&apos;s 5.5% application fee is deducted from each diner charge.</Text>
          </View>
          <View style={styles.bulletRow}>
            <Text style={styles.bulletDot}>•</Text>
            <Text style={styles.bulletText}>Manage or disconnect your account anytime from the Stripe dashboard.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Account created</Text>
            <Text style={[styles.statusBadge, hasAccount ? styles.badgeOn : styles.badgeOff]}>
              {hasAccount ? 'Yes' : 'Not yet'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Details submitted</Text>
            <Text style={[styles.statusBadge, detailsSubmitted ? styles.badgeOn : styles.badgeOff]}>
              {detailsSubmitted ? 'Yes' : 'Pending'}
            </Text>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Charges enabled</Text>
            <Text style={[styles.statusBadge, chargesEnabled ? styles.badgeOn : styles.badgeOff]}>
              {chargesEnabled ? 'Active' : 'Not yet'}
            </Text>
          </View>
        </View>

        {polling ? (
          <View style={styles.pollingRow}>
            <ActivityIndicator color={c.gold} />
            <Text style={styles.pollingText}>
              Waiting for Stripe to finish verifying your business…
            </Text>
          </View>
        ) : null}

        {chargesEnabled ? (
          <View style={styles.verifiedRow}>
            <Ionicons name="checkmark-circle" size={20} color={c.success ?? '#3CB26E'} />
            <Text style={styles.verifiedText}>
              Verified — you&apos;re ready to accept payments.
            </Text>
          </View>
        ) : null}

        <View style={styles.footer}>
          <Button
            title={ctaTitle}
            onPress={ctaOnPress}
            size="lg"
            loading={busy || polling}
            disabled={ctaDisabled}
          />
        </View>

        <View style={styles.secureRow}>
          <Ionicons name="shield-checkmark-outline" size={12} color={c.textMuted} />
          <Text style={styles.secureText}>Hosted by Stripe. Cenaiva never sees your SIN or bank info.</Text>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}
