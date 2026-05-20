import React, { useCallback, useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';
import { Button, Card } from '@/components/ui';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { friendlyError } from '@/lib/errors/friendlyError';
import { getCurrentOwnerRestaurantId } from '@/lib/services/ownerRestaurant';
import {
  createOnboardingLink,
  getConnectStatus,
  type RestaurantConnectStatus,
} from '@/lib/owner/connectOnboarding';

const useStyles = createStyles((c) => ({
  container: { flex: 1, backgroundColor: c.bgBase },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: c.textPrimary, paddingHorizontal: 20, marginTop: 4, marginBottom: 16 },
  card: { padding: 20, marginHorizontal: 20, marginBottom: 16, gap: 12, backgroundColor: c.bgSurface, borderColor: c.border, borderWidth: 1, borderRadius: borderRadius.lg },
  body: { fontSize: 14, lineHeight: 20, color: c.textSecondary },
  bullet: { fontSize: 14, lineHeight: 20, color: c.textSecondary, marginLeft: 8 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusLabel: { fontSize: 14, color: c.textPrimary, flex: 1 },
  statusBadge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999, fontSize: 12, fontWeight: '700' },
  badgeOn: { backgroundColor: 'rgba(60, 178, 110, 0.15)', color: c.success ?? '#3CB26E' },
  badgeOff: { backgroundColor: 'rgba(255, 255, 255, 0.06)', color: c.textMuted },
  footer: { paddingHorizontal: 20, paddingTop: 12 },
}));

export default function ConnectOnboardingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const styles = useStyles();
  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [status, setStatus] = useState<RestaurantConnectStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async (id: string | null) => {
    if (!id) return;
    try {
      const next = await getConnectStatus(id);
      setStatus(next);
    } catch (err) {
      Alert.alert('Stripe Connect', friendlyError(err, 'Could not load Stripe status.'));
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const id = await getCurrentOwnerRestaurantId();
      if (!active) return;
      setRestaurantId(id);
      await refresh(id);
      if (active) setLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [refresh]);

  const handleStart = useCallback(async () => {
    if (!restaurantId || busy) return;
    setBusy(true);
    try {
      const { url } = await createOnboardingLink(restaurantId);
      // Open Stripe's hosted onboarding in a Safari View Controller / Custom
      // Tab. Stripe redirects back via cenaiva:// when the owner finishes
      // (or hits Cancel). openAuthSessionAsync resolves with type='success'
      // when the deep-link return fires, or 'cancel'/'dismiss' otherwise.
      const result = await WebBrowser.openAuthSessionAsync(
        url,
        'cenaiva://stripe/connect/return',
        { showInRecents: false },
      );
      if (result.type === 'success' || result.type === 'cancel' || result.type === 'dismiss') {
        // Either path: refetch the restaurant row to see if account.updated
        // webhook flipped charges_enabled before the owner returned.
        await refresh(restaurantId);
      }
    } catch (err) {
      Alert.alert('Stripe Connect', friendlyError(err, 'Could not start Stripe onboarding.'));
    } finally {
      setBusy(false);
    }
  }, [restaurantId, busy, refresh]);

  const chargesEnabled = status?.chargesEnabled === true;
  const detailsSubmitted = status?.detailsSubmitted === true;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </TouchableOpacity>
      </View>
      <Text style={styles.title}>Connect to Stripe</Text>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
        <Card style={styles.card}>
          <Text style={styles.body}>
            Stripe handles payouts to your business bank account. You’ll complete a short Stripe form (business details, bank info, identity verification) — your account is needed before you can accept deposits or charge bills.
          </Text>
          <Text style={styles.bullet}>• Payouts arrive in your linked account every 2 business days</Text>
          <Text style={styles.bullet}>• Cenaiva’s 5.5% application fee is deducted from each charge</Text>
          <Text style={styles.bullet}>• Cancel anytime from the Stripe dashboard</Text>
        </Card>

        <Card style={styles.card}>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Account created</Text>
            <Text style={[styles.statusBadge, status?.stripeAccountId ? styles.badgeOn : styles.badgeOff]}>
              {status?.stripeAccountId ? 'Yes' : 'Not yet'}
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
        </Card>

        <View style={styles.footer}>
          <Button
            title={
              busy
                ? 'Opening Stripe…'
                : chargesEnabled
                  ? 'Update Stripe details'
                  : status?.stripeAccountId
                    ? 'Continue Stripe onboarding'
                    : 'Connect Stripe'
            }
            onPress={handleStart}
            disabled={!loaded || busy || !restaurantId}
          />
        </View>
      </ScrollView>
    </View>
  );
}
