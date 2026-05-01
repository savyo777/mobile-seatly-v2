import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Button, ScreenWrapper } from '@/components/ui';
import { createStyles, spacing, typography } from '@/lib/theme';
import { setAppShellPreference } from '@/lib/navigation/appShellPreference';

const useStyles = createStyles((c) => ({
  inner: { flex: 1, justifyContent: 'center', gap: spacing.md },
  title: { ...typography.h1, color: c.textPrimary, textAlign: 'center' },
  body: { ...typography.body, color: c.textMuted, textAlign: 'center', lineHeight: 22 },
}));

export default function RegisterRestaurantSuccessScreen() {
  const router = useRouter();
  const styles = useStyles();
  const params = useLocalSearchParams<{ trialEndsAt?: string }>();
  const trialEndsAt = typeof params.trialEndsAt === 'string' ? params.trialEndsAt : null;
  const trialLabel = trialEndsAt
    ? new Date(trialEndsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <ScreenWrapper padded>
      <View style={styles.inner}>
        <Text style={styles.title}>Restaurant registration complete</Text>
        <Text style={styles.body}>
          Your restaurant is registered and your 3-month free trial has started.
          {trialLabel ? ` Billing begins on ${trialLabel} unless you cancel.` : ''}
        </Text>
        <Button
          title="Go to Restaurant Dashboard"
          onPress={() => {
            void (async () => {
              await setAppShellPreference('staff');
              router.replace('/(staff)');
            })();
          }}
        />
        <Button
          title="Back to Diner App"
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
