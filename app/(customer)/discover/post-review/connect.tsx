import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Button } from '@/components/ui';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';
import { createSnapPost, getSnapRestaurantName } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';

const { width: SCREEN_W } = Dimensions.get('window');
const IMAGE_H = Math.min(SCREEN_W * 0.52, 320);
const H_PAD = 18;

export default function SnapCaptionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { photoUri, restaurantId } = useLocalSearchParams<{ photoUri: string; restaurantId?: string }>();
  const [caption, setCaption] = useState('');
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5>(5);

  const decodedUri = photoUri
    ? (() => {
        try {
          return decodeURIComponent(photoUri);
        } catch {
          return photoUri;
        }
      })()
    : '';
  const restaurantName = restaurantId ? getSnapRestaurantName(restaurantId) : 'Restaurant';

  const postSnap = () => {
    if (!restaurantId || !decodedUri || !caption.trim()) return;
    createSnapPost({
      user_id: mockCustomer.id,
      restaurant_id: restaurantId,
      image: decodedUri,
      caption: caption.trim(),
      rating,
    });
    router.replace(
      `/(customer)/discover/post-review/reward?points=25&restaurantName=${encodeURIComponent(
        restaurantName,
      )}&restaurantId=${restaurantId}`,
    );
  };

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <LinearGradient colors={['#0A0A0A', '#050505', '#0A0A0A']} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Header — flat, no box */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle} numberOfLines={1}>
            Add Caption
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Image — full width, top-aligned, social-style */}
          {decodedUri ? (
            <View style={styles.imageBlock}>
              <Image source={{ uri: decodedUri }} style={styles.previewImage} resizeMode="cover" />
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)']}
                style={styles.imageBottomFade}
                pointerEvents="none"
              />
            </View>
          ) : (
            <View style={[styles.previewImage, styles.imagePlaceholder]} />
          )}

          {/* User + rating — inline, no card */}
          <View style={styles.metaSection}>
            <View style={styles.identityRow}>
              {mockCustomer.avatarUrl ? (
                <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={styles.avatar} />
              )}
              <View style={styles.identityText}>
                <Text style={styles.username}>@alexj</Text>
                <Text style={styles.restaurantLine}>Posting to {restaurantName}</Text>
              </View>
            </View>
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Rate this visit</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((value) => {
                  const active = value <= rating;
                  return (
                    <Pressable key={value} onPress={() => setRating(value as 1 | 2 | 3 | 4 | 5)} hitSlop={8}>
                      <Ionicons
                        name={active ? 'star' : 'star-outline'}
                        size={22}
                        color={active ? colors.gold : colors.textMuted}
                      />
                    </Pressable>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Caption — embedded field, no outer card */}
          <View style={styles.inputSection}>
            <TextInput
              value={caption}
              onChangeText={setCaption}
              placeholder="How was it?"
              placeholderTextColor={colors.textMuted}
              multiline
              style={styles.input}
              maxLength={220}
            />
            <Text style={styles.counter}>{caption.length}/220</Text>
          </View>
        </ScrollView>

        {/* Post CTA — sticky near bottom */}
        <View
          style={[
            styles.footer,
            {
              paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xs,
              paddingHorizontal: H_PAD,
            },
          ]}
        >
          <Button
            title="Post"
            onPress={postSnap}
            disabled={!caption.trim() || !restaurantId || !decodedUri}
            size="lg"
          />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.75,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerRight: {
    width: 40,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  imageBlock: {
    width: SCREEN_W,
    alignSelf: 'center',
    overflow: 'hidden',
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
  },
  previewImage: {
    width: SCREEN_W,
    height: IMAGE_H,
    backgroundColor: colors.bgElevated,
  },
  imageBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 88,
  },
  imagePlaceholder: {
    alignSelf: 'center',
  },
  metaSection: {
    paddingHorizontal: H_PAD,
    paddingTop: spacing.lg,
    gap: spacing.md,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    backgroundColor: colors.bgElevated,
  },
  identityText: {
    flex: 1,
  },
  username: {
    ...typography.body,
    color: colors.goldLight,
    fontWeight: '700',
  },
  restaurantLine: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    marginTop: 2,
  },
  ratingRow: {
    gap: spacing.xs,
  },
  ratingLabel: {
    ...typography.bodySmall,
    color: colors.textMuted,
    fontWeight: '600',
  },
  starsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  inputSection: {
    marginHorizontal: H_PAD,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
  },
  input: {
    minHeight: 120,
    ...typography.bodyLarge,
    color: colors.textPrimary,
    textAlignVertical: 'top',
    padding: 0,
  },
  counter: {
    ...typography.bodySmall,
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.sm,
  },
  footer: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
    backgroundColor: colors.bgBase,
    paddingTop: spacing.md,
  },
});
