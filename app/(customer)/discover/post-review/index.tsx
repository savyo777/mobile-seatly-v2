import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReviewRestaurantCard } from '@/components/discover/ReviewRestaurantCard';
import { ScreenWrapper } from '@/components/ui';
import { currentRestaurants, pastRestaurants } from '@/lib/mock/reviewSnap';
import { colors, spacing, typography } from '@/lib/theme';

export default function ReviewRestaurantSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const openCamera = (restaurantId: string) => {
    router.push(`/(customer)/discover/post-review/camera?restaurantId=${restaurantId}`);
  };

  return (
    <ScreenWrapper scrollable={false} padded={false}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing['3xl'] }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Post a Review</Text>
          <Text style={styles.subtitle}>Choose where to post your Seatly Snap.</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Restaurants</Text>
          <View style={styles.list}>
            {currentRestaurants.map((restaurant) => (
              <ReviewRestaurantCard key={restaurant.id} restaurant={restaurant} onPress={openCamera} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Past Restaurants</Text>
          <View style={styles.list}>
            {pastRestaurants.map((restaurant) => (
              <ReviewRestaurantCard key={restaurant.id} restaurant={restaurant} onPress={openCamera} />
            ))}
          </View>
        </View>
      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing['2xl'],
  },
  header: {
    gap: spacing.xs,
  },
  title: {
    ...typography.h2,
    color: colors.goldLight,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  section: {
    gap: spacing.md,
  },
  sectionTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '700',
  },
  list: {
    gap: spacing.md,
  },
});
