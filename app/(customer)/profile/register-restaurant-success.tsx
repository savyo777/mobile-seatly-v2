import React, { useEffect } from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';
import { Ionicons } from '@expo/vector-icons';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';
import { ownerTrialLengthLabel } from '@/lib/owner/trialPolicy';
import { useOwnerRestaurantContext } from '@/lib/owner/OwnerRestaurantContext';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, justifyContent: 'center', gap: spacing.lg },
  iconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(201,168,76,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.30)',
    marginBottom: spacing.sm,
  },
  title: { ...typography.h1, color: c.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
  card: {
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.18)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: spacing.md,
    marginVertical: spacing.md,
    gap: 4,
  },
  cardLabel: {
    ...typography.label,
    color: c.textMuted,
    letterSpacing: 1,
  },
  cardValue: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
}));

export default function RegisterRestaurantSuccessScreen() {
  const router = useRouter();
  const styles = useStyles();
  const c = useColors();
  const params = useLocalSearchParams<{ trialEndsAt?: string }>();
  const trialEndsAt = typeof params.trialEndsAt === 'string' ? params.trialEndsAt : null;
  const trialLabel = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const { refresh: refreshOwnerRestaurants } = useOwnerRestaurantContext();

  // Persist the staff shell preference so the (staff) layout doesn't bounce
  // the user back to the customer side while their role catches up. Also
  // refresh the cached owner-restaurants list so the brand-new restaurant
  // appears in the switcher immediately without needing a sign-out.
  useEffect(() => {
    void setAppShellPreference('staff');
    void refreshOwnerRestaurants();
  }, [refreshOwnerRestaurants]);

  return (
    <ScreenWrapper padded>
      <View style={styles.inner}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark" size={36} color={c.gold} />
        </View>
        <Text style={styles.title}>You're all set</Text>
        <Text style={styles.body}>
          {`Your restaurant is registered and your ${ownerTrialLengthLabel()} free trial has started.`}
        </Text>

        {trialLabel ? (
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Free until</Text>
            <Text style={styles.cardValue}>{trialLabel}</Text>
          </View>
        ) : null}

        <Button
          title="Go to restaurant dashboard"
          onPress={() => {
            void (async () => {
              await setAppShellPreference('staff');
              router.replace('/(staff)');
            })();
          }}
        />
        <Button
          title="Back to diner app"
          variant="outlined"
          onPress={() => {
            void (async () => {
              await setAppShellPreference('customer');
              router.replace('/(customer)');
            })();
          }}
        />
      </View>
    </ScreenWrapper>
  );
}
