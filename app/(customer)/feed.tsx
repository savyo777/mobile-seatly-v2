import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Href } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  listFeedPosts,
  getRestaurantForPost,
  getSnapUser,
  timeAgoLabel,
  type SnapPost,
} from '@/lib/mock/snaps';
import {
  isLiked,
  isSaved,
  toggleLike,
  toggleSave,
  listFollowingPosts,
  listTrendingPosts,
} from '@/lib/mock/social';
import { getCommentCountForPost } from '@/lib/mock/comments';
import { isPostInAnyCollection } from '@/lib/mock/collections';
import { getUnreadCount } from '@/lib/mock/notifications';
import { SnapGrid } from '@/components/snaps/SnapGrid';
import { SaveToCollectionSheet } from '@/components/snaps/SaveToCollectionSheet';
import { mockCustomer } from '@/lib/mock/users';
import { colors, spacing, typography, borderRadius } from '@/lib/theme';

type FeedMode = 'local' | 'following' | 'explore';

const SCREEN_W = Dimensions.get('window').width;
const TORONTO_LAT = 43.6532;
const TORONTO_LNG = -79.3832;
const LOCAL_RADIUS_KM = 50;
const ME = mockCustomer.id;
const IMAGE_HEIGHT = SCREEN_W * 1.25;




export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<FeedMode>('local');
  const [likeState, setLikeState] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<Record<string, boolean>>({});
  const [saveSheetPostId, setSaveSheetPostId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount(ME));

  const posts: SnapPost[] =
    mode === 'following'
      ? listFollowingPosts(ME)
      : mode === 'local'
      ? listFeedPosts(TORONTO_LAT, TORONTO_LNG, LOCAL_RADIUS_KM)
      : listTrendingPosts(7);

  const handleLike = useCallback((postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLikeState((prev) => ({ ...prev, [postId]: toggleLike(ME, postId) }));
  }, []);

  const handleOpenSaveSheet = useCallback((postId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaveSheetPostId(postId);
  }, []);

  const handleSavedToCollection = useCallback(() => {
    if (!saveSheetPostId) return;
    if (!isSaved(ME, saveSheetPostId)) toggleSave(ME, saveSheetPostId);
    setSaveState((prev) => ({ ...prev, [saveSheetPostId]: true }));
  }, [saveSheetPostId]);

  const renderPost = useCallback(
    ({ item }: { item: SnapPost }) => {
      const restaurant = getRestaurantForPost(item.restaurant_id);
      const user = getSnapUser(item.user_id);
      const liked = likeState[item.id] ?? isLiked(ME, item.id);
      const saved = saveState[item.id] ?? (isSaved(ME, item.id) || isPostInAnyCollection(ME, item.id));
      const likeCount = item.likes + (liked ? 1 : 0);
      const commentCount = getCommentCountForPost(item.id);

      return (
        <View style={styles.post}>
          {/* Image + overlays */}
          <View style={styles.postImageWrap}>
            <Pressable onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}>
              <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
            </Pressable>

            {/* Bottom gradient: user + restaurant info */}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.75)']}
              style={styles.imageGradient}
              pointerEvents="box-none"
            >
              <View style={styles.overlayRow}>
                <Pressable
                  onPress={() => router.push(`/(customer)/profile/${item.user_id}` as Href)}
                  style={styles.overlayAvatarWrap}
                >
                  {user?.avatarUrl ? (
                    <Image source={{ uri: user.avatarUrl }} style={styles.overlayAvatar} />
                  ) : (
                    <View style={[styles.overlayAvatar, styles.avatarFallback]} />
                  )}
                </Pressable>
                <View style={styles.overlayInfo}>
                  <Text style={styles.overlayUsername}>@{user?.username ?? 'user'}</Text>
                  <Pressable onPress={() => router.push(`/(customer)/discover/${item.restaurant_id}` as Href)}>
                    <Text style={styles.overlayRestaurant} numberOfLines={1}>
                      <Ionicons name="location-sharp" size={11} color={colors.gold} /> {restaurant?.name ?? 'Restaurant'}
                    </Text>
                  </Pressable>
                </View>
                <Ionicons name="ellipsis-horizontal" size={20} color="rgba(255,255,255,0.7)" />
              </View>
            </LinearGradient>

            {/* Right-side action stack */}
            <View style={styles.rightActions}>
              {/* Avatar above actions */}
              <Pressable
                onPress={() => router.push(`/(customer)/profile/${item.user_id}` as Href)}
                style={({ pressed }) => [styles.rightAction, pressed && { opacity: 0.7 }]}
                hitSlop={8}
              >
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.rightAvatar} />
                ) : (
                  <View style={[styles.rightAvatar, styles.avatarFallback]} />
                )}
              </Pressable>

              <Pressable
                onPress={() => handleLike(item.id)}
                style={({ pressed }) => [styles.rightAction, pressed && { opacity: 0.6 }]}
                hitSlop={8}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={32}
                  color={liked ? colors.gold : '#fff'}
                />
                <Text style={styles.rightActionCount}>{likeCount.toLocaleString()}</Text>
              </Pressable>

              <Pressable
                onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
                style={({ pressed }) => [styles.rightAction, pressed && { opacity: 0.6 }]}
                hitSlop={8}
              >
                <Ionicons name="chatbubble-outline" size={30} color="#fff" />
                {commentCount > 0 && (
                  <Text style={styles.rightActionCount}>{commentCount}</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => handleOpenSaveSheet(item.id)}
                style={({ pressed }) => [styles.rightAction, pressed && { opacity: 0.6 }]}
                hitSlop={8}
              >
                <Ionicons
                  name={saved ? 'bookmark' : 'bookmark-outline'}
                  size={30}
                  color={saved ? colors.gold : '#fff'}
                />
              </Pressable>
            </View>
          </View>

          {/* Below image: caption + book */}
          <View style={styles.postFooter}>
            <View style={styles.captionRow}>
              <Text style={styles.captionUsername}>@{user?.username ?? 'user'} </Text>
              <Text style={styles.captionText}>{item.caption}</Text>
            </View>

            <View style={styles.footerRow}>
              <Pressable
                onPress={() => router.push(`/booking/${item.restaurant_id}/step2-time` as Href)}
                style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.75 }]}
              >
                <Ionicons name="calendar-outline" size={15} color={colors.bgBase} />
                <Text style={styles.bookBtnText}>Book a table</Text>
              </Pressable>
              <Text style={styles.timestamp}>{timeAgoLabel(item.timestamp).toUpperCase()}</Text>
            </View>
          </View>
        </View>
      );
    },
    [likeState, saveState, router, handleLike, handleOpenSaveSheet],
  );


  const modeLabels: Record<FeedMode, string> = {
    local: 'Local',
    following: 'Following',
    explore: 'Explore',
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.locationPill}>
          <Ionicons name="location-sharp" size={12} color={colors.gold} />
          <Text style={styles.locationText}>Toronto</Text>
          <Ionicons name="chevron-down" size={11} color={colors.textMuted} />
        </Pressable>

        {/* Segmented pill selector */}
        <View style={styles.modePill}>
          {(['local', 'following', 'explore'] as FeedMode[]).map((m) => (
            <Pressable
              key={m}
              onPress={() => setMode(m)}
              style={[styles.modePillBtn, mode === m && styles.modePillBtnActive]}
            >
              <Text style={[styles.modePillText, mode === m && styles.modePillTextActive]}>
                {modeLabels[m]}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={() => {
            router.push('/(customer)/notifications' as Href);
            setUnreadCount(0);
          }}
          hitSlop={10}
        >
          <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>

      {/* Context label */}
      <Text style={styles.contextLabel}>
        {mode === 'local' && 'Showing posts near Toronto'}
        {mode === 'following' && 'From people you follow'}
        {mode === 'explore' && 'Trending this week'}
      </Text>

      {mode === 'explore' ? (
        <SnapGrid
          posts={posts}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          emptyLabel="No posts yet."
        />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id}
          renderItem={renderPost}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          ListEmptyComponent={
            mode === 'following' ? (
              <View style={styles.empty}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
                <Text style={styles.emptyTitle}>No posts yet</Text>
                <Text style={styles.emptyText}>Follow food lovers to see their posts here.</Text>
                <Pressable
                  onPress={() => router.push('/(customer)/discover' as Href)}
                  style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.emptyCtaText}>Find people →</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.empty}>
                <Ionicons name="images-outline" size={48} color={colors.textMuted} style={{ marginBottom: spacing.md }} />
                <Text style={styles.emptyTitle}>Nothing nearby yet</Text>
                <Text style={styles.emptyText}>Be the first to post a meal in your area.</Text>
                <Pressable
                  onPress={() => router.push('/(customer)/discover/post-review/camera' as Href)}
                  style={({ pressed }) => [styles.emptyCta, pressed && { opacity: 0.75 }]}
                >
                  <Text style={styles.emptyCtaText}>Share a meal →</Text>
                </Pressable>
              </View>
            )
          }
        />
      )}

      <SaveToCollectionSheet
        visible={!!saveSheetPostId}
        postId={saveSheetPostId}
        onClose={() => setSaveSheetPostId(null)}
        onSaved={handleSavedToCollection}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgBase },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.bgSurface,
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  bellDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },

  // Segmented mode selector
  modePill: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 3,
    marginHorizontal: spacing.xs,
  },
  modePillBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    alignItems: 'center',
  },
  modePillBtnActive: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  modePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modePillTextActive: {
    color: colors.textPrimary,
    fontWeight: '700',
  },

  // Context label
  contextLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textMuted,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
    letterSpacing: 0.2,
  },

  // Reservation banner
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
    backgroundColor: 'rgba(201,168,76,0.07)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.2)',
    overflow: 'hidden',
  },
  bannerAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.gold,
  },
  bannerContent: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    gap: 3,
  },
  bannerUrgency: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.2,
  },
  bannerTime: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  bannerRestaurant: {
    ...typography.bodySmall,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  bannerChips: {
    flexDirection: 'row',
    gap: spacing.xs,
    marginTop: 4,
  },
  bannerChip: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  bannerChipText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  bannerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.md,
  },
  bannerActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold,
  },

  // Post
  post: { marginBottom: spacing['2xl'] },

  postImageWrap: {
    width: SCREEN_W,
    height: IMAGE_HEIGHT,
    position: 'relative',
  },
  postImage: {
    width: SCREEN_W,
    height: IMAGE_HEIGHT,
    backgroundColor: colors.bgElevated,
  },

  // Bottom gradient overlay
  imageGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  overlayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  overlayAvatarWrap: {},
  overlayAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: { backgroundColor: colors.bgElevated },
  overlayInfo: { flex: 1 },
  overlayUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  overlayRestaurant: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },

  // Right-side action stack
  rightActions: {
    position: 'absolute',
    right: spacing.md,
    bottom: 80,
    alignItems: 'center',
    gap: spacing.lg,
  },
  rightAction: {
    alignItems: 'center',
    gap: 4,
  },
  rightAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.gold,
    backgroundColor: colors.bgElevated,
  },
  rightActionCount: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },

  // Post footer
  postFooter: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  captionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  captionUsername: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },
  captionText: { fontSize: 14, color: colors.textSecondary, flex: 1 },

  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.gold,
    borderRadius: 20,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
  },
  bookBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.bgBase,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    letterSpacing: 0.4,
  },

  // Empty states
  empty: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
    gap: spacing.sm,
  },
  emptyTitle: { ...typography.body, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
  emptyCta: {
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.gold,
    borderRadius: 24,
  },
  emptyCtaText: { ...typography.body, fontWeight: '700', color: colors.bgBase },
});
