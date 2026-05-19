import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { useColors } from '@/lib/theme';
import {
  OWNER_REFERRAL_PENDING_STORAGE_KEY,
  OWNER_REFERRAL_QUERY_PARAM,
  isValidOwnerReferralCode,
} from '@/lib/owner/referralPolicy';

// Deep-link landing route for cenaiva://owner-signup?ref=CNV-OWNER-XXXXXX.
// The global Linking handler in app/_layout.tsx already persists the code
// into AsyncStorage; this screen exists so Expo Router can resolve the URL
// (otherwise the deep link falls into the +not-found "Unmatched Route"
// screen). We re-persist defensively in case the route is reached via a
// path other than the global Linking event, then bounce the user into the
// owner-signup flow. The pending code is consumed at the actual restaurant
// registration step in (customer)/profile/register-restaurant-card-entry.
export default function OwnerSignupDeepLinkScreen() {
  const c = useColors();
  const { session, loading } = useAuthSession();
  const params = useLocalSearchParams();

  useEffect(() => {
    const raw = params[OWNER_REFERRAL_QUERY_PARAM];
    const candidate = Array.isArray(raw) ? raw[0] : raw;
    if (!candidate) return;
    const normalized = String(candidate).trim().toUpperCase();
    if (!isValidOwnerReferralCode(normalized)) return;
    void AsyncStorage.setItem(
      OWNER_REFERRAL_PENDING_STORAGE_KEY,
      JSON.stringify({ code: normalized, capturedAt: new Date().toISOString() }),
    );
  }, [params]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: c.bgBase }}>
        <ActivityIndicator color={c.gold} />
      </View>
    );
  }

  if (session?.user?.id) {
    return <Redirect href="/(customer)/profile/register-restaurant-card-entry" />;
  }
  return <Redirect href="/(auth)/owner-register" />;
}
