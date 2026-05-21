/**
 * Friendly 404 handler — replaces expo-router's default "Unmatched Route"
 * dead-end with an auto-redirect to a sensible home.
 *
 * Deep-link URLs sometimes arrive mangled (Android `am start` double-
 * encodes parens, malformed share-links from old marketing, etc.).
 * Letting users land on a stark "Page could not be found" page is bad
 * UX. We show a brief "Taking you home…" message + redirect after a
 * short delay so the user always ends up somewhere usable.
 *
 * Routes by role:
 *   - Authenticated diner → /(customer)/discover
 *   - Authenticated staff/owner → /(staff)
 *   - Unauthenticated → /(auth) welcome
 */

import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { useColors, createStyles, spacing } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  container: {
    flex: 1,
    backgroundColor: c.bgBase,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.lg,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: c.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
}));

export default function NotFoundScreen() {
  const router = useRouter();
  const styles = useStyles();
  const c = useColors();
  const { loading, isAuthenticated, isStaffLike } = useAuthSession();

  useEffect(() => {
    if (loading) return;
    // Brief delay so the user sees the message instead of a jarring jump.
    const timer = setTimeout(() => {
      if (!isAuthenticated) {
        router.replace('/(auth)' as never);
      } else if (isStaffLike) {
        router.replace('/(staff)' as never);
      } else {
        router.replace('/(customer)/discover' as never);
      }
    }, 1200);
    return () => clearTimeout(timer);
  }, [loading, isAuthenticated, isStaffLike, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator color={c.gold} />
      <Text style={styles.title}>Taking you home…</Text>
      <Text style={styles.subtitle}>
        That link didn&apos;t lead anywhere. You&apos;re being redirected to the app.
      </Text>
    </View>
  );
}
