import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AppState,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Href, usePathname, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { roleIncludes } from '@/lib/auth/roles';
import {
  dismissAllPostTurnRequests,
  submitPostTurnReview,
  syncPostTurnRequests,
  type PostTurnRequest,
} from '@/lib/postVisit/postTurn';
import { borderRadius, createStyles, shadows, spacing, typography, useColors } from '@/lib/theme';
import { normalizeTextInput, sanitizeTextInput } from '@/lib/validation/input';

const SYNC_INTERVAL_MS = 60_000;

const useStyles = createStyles((c) => ({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.58)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  handle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    marginBottom: spacing.xs,
  },
  icon: {
    width: 48,
    height: 48,
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
    paddingVertical: spacing.xs,
  },
  starButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    minHeight: 94,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgBase,
    color: c.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    textAlignVertical: 'top',
  },
  primary: {
    height: 50,
    borderRadius: borderRadius.lg,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  primaryText: {
    ...typography.body,
    fontWeight: '800',
    color: c.bgBase,
  },
  secondary: {
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryText: {
    ...typography.body,
    fontWeight: '700',
    color: c.textSecondary,
  },
  pressed: {
    opacity: 0.78,
  },
}));

export function PostTurnPromptHost() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { user, isAuthenticated, loading, role } = useAuthSession();
  const [requests, setRequests] = useState<PostTurnRequest[]>([]);
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const canShowForUser =
    !loading &&
    isAuthenticated &&
    Boolean(user?.id) &&
    (role == null || roleIncludes(role, 'customer'));
  const routeSuppressesPrompt = pathname.includes('post-review') || pathname.includes('/review');
  const active = useMemo(
    () => requests.find((request) => request.status === 'pending' && !request.dismissedAt) ?? null,
    [requests],
  );
  const visible = Boolean(canShowForUser && active && !routeSuppressesPrompt);

  const refresh = useCallback(async () => {
    if (!user?.id || !canShowForUser) {
      setRequests([]);
      return;
    }
    const next = await syncPostTurnRequests(user);
    setRequests(next);
  }, [canShowForUser, user]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 700);
    return () => {
      clearTimeout(timer);
    };
  }, [refresh]);

  useEffect(() => {
    if (!canShowForUser) return undefined;
    const timer = setInterval(() => {
      void refresh();
    }, SYNC_INTERVAL_MS);
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refresh();
    });
    return () => {
      clearInterval(timer);
      appStateSub.remove();
    };
  }, [canShowForUser, refresh]);

  useEffect(() => {
    if (active?.type === 'review') {
      setRating(5);
      setBody('');
    }
  }, [active?.id, active?.type]);

  // "Not now" + swipe-down both close the entire prompt queue, not just
  // advance to the next prompt — otherwise the user perceives the dialog
  // as never closing because Cenaiva queues a separate review + photo
  // prompt per recent booking. dismissAll marks every pending request
  // dismissed in one write; the next sync (60s / on foreground) only
  // re-pulls things that became newly actionable on the server.
  const handleNotNow = useCallback(async () => {
    if (!user?.id) return;
    await dismissAllPostTurnRequests(user.id);
    await refresh();
  }, [user?.id, refresh]);

  const handleSubmitReview = async () => {
    if (!active || !user?.id || active.type !== 'review') return;
    setBusy(true);
    try {
      const cleanedBody = normalizeTextInput(body, { maxLength: 1000, multiline: true });
      await submitPostTurnReview({
        userId: user.id,
        bookingId: active.bookingId,
        restaurantId: active.restaurantId,
        rating,
        body: cleanedBody,
      });
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  const handleUploadPhoto = async () => {
    if (!active) return;
    router.push({
      pathname: '/(customer)/discover/post-review/camera',
      params: {
        restaurantId: active.restaurantId,
        bookingId: active.bookingId,
      },
    } as Href);
  };

  // Swipe-down dismiss gesture. Drag the sheet downward; release past the
  // threshold (or with enough velocity) fires handleNotNow which closes the
  // whole queue. Anything below threshold snaps back.
  const translateY = useSharedValue(0);
  const SWIPE_DISMISS_THRESHOLD = 120;

  const resetSheet = useCallback(() => {
    translateY.value = withTiming(0, { duration: 180 });
  }, [translateY]);

  const dismissFromGesture = useCallback(() => {
    translateY.value = 0;
    void handleNotNow();
  }, [translateY, handleNotNow]);

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(10)
        .onUpdate((event) => {
          if (event.translationY > 0) {
            translateY.value = event.translationY;
          }
        })
        .onEnd((event) => {
          const shouldDismiss =
            event.translationY > SWIPE_DISMISS_THRESHOLD || event.velocityY > 700;
          if (shouldDismiss) {
            runOnJS(dismissFromGesture)();
          } else {
            runOnJS(resetSheet)();
          }
        }),
    [translateY, resetSheet, dismissFromGesture],
  );

  const sheetAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!active) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleNotNow}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={styles.backdrop}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={handleNotNow}
            accessibilityLabel="Dismiss prompt"
          />
          <GestureDetector gesture={panGesture}>
            <Animated.View
              style={[
                styles.sheet,
                { paddingBottom: Math.max(insets.bottom, spacing.lg) },
                sheetAnimatedStyle,
              ]}
            >
              <View style={styles.handle} />
          <View style={styles.icon}>
            <Ionicons
              name={active.type === 'review' ? 'star-outline' : 'camera-outline'}
              size={24}
              color={c.gold}
            />
          </View>

          {active.type === 'review' ? (
            <>
              <Text style={styles.title}>How was {active.restaurantName}?</Text>
              <Text style={styles.body}>Rate your visit and leave a short note if you want.</Text>
              <View style={styles.stars} accessibilityRole="adjustable">
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
                        size={30}
                        color={c.gold}
                      />
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                value={body}
                onChangeText={(value) => setBody(sanitizeTextInput(value, { maxLength: 1000, multiline: true }))}
                placeholder="Optional review"
                placeholderTextColor={c.textMuted}
                multiline
                maxLength={1000}
                style={styles.input}
                returnKeyType="done"
                blurOnSubmit
              />
              <Pressable
                onPress={handleSubmitReview}
                disabled={busy}
                style={({ pressed }) => [styles.primary, (pressed || busy) && styles.pressed]}
                accessibilityRole="button"
              >
                <Ionicons name="checkmark-circle-outline" size={18} color={c.bgBase} />
                <Text style={styles.primaryText}>Submit review</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.title}>Share photos from {active.restaurantName}</Text>
              <Text style={styles.body}>
                Add photos from this visit so other diners can see what the experience is like.
              </Text>
              <Pressable
                onPress={handleUploadPhoto}
                style={({ pressed }) => [styles.primary, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Ionicons name="camera-outline" size={18} color={c.bgBase} />
                <Text style={styles.primaryText}>Upload photos</Text>
              </Pressable>
            </>
          )}

              <Pressable
                onPress={handleNotNow}
                style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}
                accessibilityRole="button"
              >
                <Text style={styles.secondaryText}>Not now</Text>
              </Pressable>
            </Animated.View>
          </GestureDetector>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}
