import React from 'react';
import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { getSavedRestaurants } from '@/lib/mock/profileScreens';
import { useColors, createStyles, spacing, typography } from '@/lib/theme';
import { SavedRestaurantCard } from '@/components/profile/SavedRestaurantCard';

type Props = {
  /** Shown below the stack header — not a duplicate page title */
  subtitle?: string;
};

const useStyles = createStyles((c) => ({
  screenSubtitle: {
    ...typography.body,
    color: c.textSecondary,
    marginBottom: spacing.lg,
  },
}));

export function SavedRestaurantsList({ subtitle }: Props) {
  const router = useRouter();
  const styles = useStyles();
  const list = getSavedRestaurants();

  return (
    <View>
      {subtitle ? <Text style={styles.screenSubtitle}>{subtitle}</Text> : null}
      {list.map((r) => (
        <SavedRestaurantCard
          key={r.id}
          restaurant={r}
          onPress={() => router.push(`/(customer)/discover/${r.id}` as const)}
        />
      ))}
    </View>
  );
}
