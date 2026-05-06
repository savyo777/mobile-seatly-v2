/**
 * Snap detail viewer — intentionally minimal.
 *
 * When a customer taps another diner's photo from the restaurant snap
 * gallery, they land here. We show the photo and the caption and almost
 * nothing else — no story-style overlays, no likes/comments composer,
 * no big modal sheets. Just what was posted.
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  deleteSnapPost,
  getRestaurantForPost,
  getSnapPostById,
  getSnapUser,
  timeAgoLabel,
} from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';
import { safeRouterBack } from '@/lib/navigation/transitions';

const ME = mockCustomer.id;

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: borderRadius.full,
  },
  topTitle: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  scrollContent: {
    paddingBottom: spacing['2xl'],
  },
  photo: {
    width: '100%',
    backgroundColor: c.bgElevated,
  },
  meta: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    gap: spacing.sm,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  username: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '700',
  },
  posted: {
    ...typography.bodySmall,
    color: c.textMuted,
  },
  caption: {
    ...typography.bodyLarge,
    color: c.textPrimary,
    lineHeight: 24,
  },
  restaurantLink: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  restaurantText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: c.textSecondary,
  },
  backGhost: {
    borderWidth: 1,
    borderColor: c.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
  },
  backGhostText: {
    ...typography.bodySmall,
    color: c.textPrimary,
  },

  /* Tiny owner-only delete sheet */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingBottom: 36,
    paddingTop: spacing.sm,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  sheetActionDanger: {
    fontSize: 16,
    fontWeight: '600',
    color: c.danger,
  },
  sheetActionCancel: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginHorizontal: spacing.lg,
  },
}));

export default function SnapDetailScreen() {
  const c = useColors();
  const styles = useStyles();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: windowW } = useWindowDimensions();
  const { snapId, restaurantId } = useLocalSearchParams<{ snapId: string; restaurantId?: string }>();

  const post = snapId ? getSnapPostById(snapId) : undefined;
  const user = post ? getSnapUser(post.user_id) : undefined;
  const restaurant = post ? getRestaurantForPost(post.restaurant_id) : null;
  const isOwnPost = post?.user_id === ME;
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);

  const snapListFallback = useMemo<Href>(() => {
    const fallbackRestaurantId = restaurantId ?? post?.restaurant_id;
    return fallbackRestaurantId
      ? (`/(customer)/discover/snaps/${fallbackRestaurantId}` as Href)
      : '/(customer)/discover';
  }, [post?.restaurant_id, restaurantId]);

  const goBack = useCallback(() => {
    safeRouterBack(router, snapListFallback);
  }, [router, snapListFallback]);

  const handleDeleteConfirm = useCallback(() => {
    if (!post) return;
    setShowDeleteSheet(false);
    Alert.alert(
      'Delete snap?',
      "This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSnapPost(post.id, ME);
            goBack();
          },
        },
      ],
    );
  }, [goBack, post]);

  if (!post) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + spacing['3xl'] }]}>
        <Text style={styles.emptyTitle}>Snap not found</Text>
        <Pressable onPress={goBack} style={styles.backGhost}>
          <Text style={styles.backGhostText}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  // Square-ish photo that fits screen width (matches what users captured).
  const photoH = Math.round(windowW * 1.25); // a touch portrait, like a phone shot

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={goBack} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle} numberOfLines={1}>
          {user?.username ? `@${user.username}` : 'Snap'}
        </Text>
        {isOwnPost ? (
          <Pressable
            onPress={() => setShowDeleteSheet(true)}
            hitSlop={10}
            style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={c.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.iconBtn} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: post.image }}
          style={[styles.photo, { height: photoH }]}
          resizeMode="cover"
        />

        <View style={styles.meta}>
          <View style={styles.identityRow}>
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatar} />
            )}
            <View style={styles.identityText}>
              <Text style={styles.username}>@{user?.username ?? 'guest'}</Text>
              <Text style={styles.posted}>{timeAgoLabel(post.timestamp)}</Text>
            </View>
          </View>

          {post.caption ? <Text style={styles.caption}>{post.caption}</Text> : null}

          {restaurant ? (
            <Pressable
              onPress={() => router.push(`/(customer)/discover/${post.restaurant_id}` as Href)}
              style={styles.restaurantLink}
            >
              <Ionicons name="location-outline" size={14} color={c.gold} />
              <Text style={styles.restaurantText}>{restaurant.name}</Text>
            </Pressable>
          ) : null}
        </View>
      </ScrollView>

      <Modal
        visible={showDeleteSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDeleteSheet(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowDeleteSheet(false)}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Pressable
              style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.7 }]}
              onPress={handleDeleteConfirm}
            >
              <Ionicons name="trash-outline" size={20} color={c.danger} />
              <Text style={styles.sheetActionDanger}>Delete snap</Text>
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable
              style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.7 }]}
              onPress={() => setShowDeleteSheet(false)}
            >
              <Text style={styles.sheetActionCancel}>Cancel</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
