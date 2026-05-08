import React, { useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Button, ScreenWrapper } from '@/components/ui';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { getSnapRestaurantName } from '@/lib/mock/snaps';
import { submitPostTurnReview } from '@/lib/postVisit/postTurn';
import { borderRadius, createStyles, spacing, typography, useColors } from '@/lib/theme';

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    ...typography.h3,
    color: c.textPrimary,
    textAlign: 'center',
  },
  spacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  icon: {
    width: 56,
    height: 56,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.14)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...typography.h2,
    color: c.textPrimary,
  },
  body: {
    ...typography.body,
    color: c.textSecondary,
    lineHeight: 22,
  },
  stars: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  starButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 140,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    color: c.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.78,
  },
}));

export default function BookingReviewScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();
  const { restaurantId, bookingId, restaurantName } = useLocalSearchParams<{
    restaurantId: string;
    bookingId?: string;
    restaurantName?: string;
  }>();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const name = useMemo(() => {
    if (restaurantName) return decodeURIComponent(String(restaurantName));
    return restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant';
  }, [restaurantId, restaurantName]);

  const submit = async () => {
    if (!isAuthenticated || !user?.id) {
      Alert.alert('Sign in required', 'Please sign in to leave a review.');
      return;
    }
    if (!bookingId || !restaurantId) {
      Alert.alert('Missing booking', 'This review needs to be linked to a completed booking.');
      return;
    }
    setBusy(true);
    try {
      await submitPostTurnReview({
        userId: user.id,
        bookingId,
        restaurantId,
        rating,
        body,
      });
      router.replace('/(customer)/notifications');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenWrapper scrollable={false}>
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backBtn, pressed && styles.pressed]}
            hitSlop={10}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Review visit</Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          <View style={styles.icon}>
            <Ionicons name="star-outline" size={28} color={c.gold} />
          </View>
          <View>
            <Text style={styles.title}>How was {name}?</Text>
            <Text style={styles.body}>Your review stays tied to this specific booking.</Text>
          </View>

          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => {
              const starValue = value as 1 | 2 | 3 | 4 | 5;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRating(starValue)}
                  style={({ pressed }) => [styles.starButton, pressed && styles.pressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Rate ${value} out of 5`}
                >
                  <Ionicons
                    name={value <= rating ? 'star' : 'star-outline'}
                    size={32}
                    color={c.gold}
                  />
                </Pressable>
              );
            })}
          </View>

          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Optional written review"
            placeholderTextColor={c.textMuted}
            multiline
            style={styles.input}
            returnKeyType="done"
            blurOnSubmit
          />

          <Button title={busy ? 'Submitting...' : 'Submit review'} onPress={submit} disabled={busy} />
        </View>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}
