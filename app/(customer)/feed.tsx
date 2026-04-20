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
import { mockReservations, type Reservation } from '@/lib/mock/reservations';
import { colors, spacing, typography } from '@/lib/theme';

type FeedMode = 'local' | 'following' | 'explore';

const SCREEN_W = Dimensions.get('window').width;
const TORONTO_LAT = 43.6532;
const TORONTO_LNG = -79.3832;
const LOCAL_RADIUS_KM = 50;
const GUEST_ID = 'g1';
const ME = mockCustomer.id;

const ACTIVE_STATUSES: Reservation['status'][] = ['pending', 'confirmed', 'seated'];

function getNextReservation(): Reservation | null {
  const now = Date.now();
  return (
    mockReservations
      .filter((r) => r.guestId === GUEST_ID && ACTIVE_STATUSES.includes(r.status))
      .filter((r) => new Date(r.reservedAt).getTime() > now - 60 * 60 * 1000) // include "in progress" (1h ago)
      .sort((a, b) => new Date(a.reservedAt).getTime() - new Date(b.reservedAt).getTime())[0] ?? null
  );
}

function formatReservationTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isTomorrow = d.toDateString() === tomorrow.toDateString();
  const timeStr = d.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Tonight · ${timeStr}`;
  if (isTomorrow) return `Tomorrow · ${timeStr}`;
  return `${d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric' })} · ${timeStr}`;
}

function statusColor(status: Reservation['status']): string {
  if (status === 'confirmed') return colors.gold;
  if (status === 'seated') return colors.success;
  return colors.warning;
}

function ReservationBanner({ res, onPress }: { res: Reservation; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.bannerIcon}>
        <Ionicons name="restaurant-outline" size={22} color={colors.gold} />
      </View>
      <View style={styles.bannerBody}>
        <Text style={styles.bannerRestaurant} numberOfLines={1}>{res.restaurantName}</Text>
        <Text style={styles.bannerMeta}>{formatReservationTime(res.reservedAt)} · {res.partySize} guests</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

export default function FeedScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<FeedMode>('local');
  const [likeState, setLikeState] = useState<Record<string, boolean>>({});
  const [saveState, setSaveState] = useState<Record<string, boolean>>({});
  const [saveSheetPostId, setSaveSheetPostId] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount(ME));

  const nextReservation = getNextReservation();

  const posts: SnapPost[] =
    mode === 'following'
      ? listFollowingPosts(ME)
      : mode === 'local'
      ? listFeedPosts(TORONTO_LAT, TORONTO_LNG, LOCAL_RADIUS_KM)
      : listTrendingPosts(7);

  const handleLike = useCallback((postId: string) => {
    setLikeState((prev) => ({ ...prev, [postId]: toggleLike(ME, postId) }));
  }, []);

  const handleOpenSaveSheet = useCallback((postId: string) => {
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
      const saved =
        saveState[item.id] ?? (isSaved(ME, item.id) || isPostInAnyCollection(ME, item.id));
      const likeCount = item.likes + (liked ? 1 : 0);
      const commentCount = getCommentCountForPost(item.id);

      return (
        <View style={styles.post}>
          {/* Post header */}
          <Pressable
            style={styles.postHeader}
            onPress={() => router.push(`/(customer)/profile/${item.user_id}` as Href)}
          >
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} style={styles.postAvatar} />
            ) : (
              <View style={[styles.postAvatar, styles.avatarFallback]} />
            )}
            <View style={styles.postMeta}>
              <Text style={styles.postUsername}>{user?.username ?? 'user'}</Text>
              <Pressable onPress={() => router.push(`/(customer)/discover/${item.restaurant_id}` as Href)}>
                <Text style={styles.postLocation}>{restaurant?.name ?? 'Restaurant'}</Text>
              </Pressable>
            </View>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>

          {/* Photo */}
          <Pressable
            onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
          >
            <Image source={{ uri: item.image }} style={styles.postImage} resizeMode="cover" />
          </Pressable>

          {/* Action bar */}
          <View style={styles.actionBar}>
            <View style={styles.actionLeft}>
              <Pressable
                onPress={() => handleLike(item.id)}
                style={({ pressed }) => [styles.actionIcon, pressed && { opacity: 0.6 }]}
                hitSlop={8}
              >
                <Ionicons
                  name={liked ? 'heart' : 'heart-outline'}
                  size={26}
                  color={liked ? '#EF4444' : colors.textPrimary}
                />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
                style={({ pressed }) => [styles.actionIcon, pressed && { opacity: 0.6 }]}
                hitSlop={8}
              >
                <Ionicons name="chatbubble-outline" size={23} color={colors.textPrimary} />
              </Pressable>
              <Pressable
                onPress={() => router.push(`/booking/${item.restaurant_id}/step1-date` as Href)}
                style={({ pressed }) => [styles.actionIcon, pressed && { opacity: 0.6 }]}
                hitSlop={8}
              >
                <Ionicons name="calendar-outline" size={24} color={colors.textPrimary} />
              </Pressable>
            </View>
            <Pressable
              onPress={() => handleOpenSaveSheet(item.id)}
              style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
              hitSlop={8}
            >
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={24}
                color={saved ? colors.gold : colors.textPrimary}
              />
            </Pressable>
          </View>

          <Text style={styles.likeCount}>{likeCount.toLocaleString()} likes</Text>
          <View style={styles.captionRow}>
            <Text style={styles.captionUsername}>{user?.username ?? 'user'} </Text>
            <Text style={styles.captionText}>{item.caption}</Text>
          </View>
          {commentCount > 0 ? (
            <Pressable
              onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
            >
              <Text style={styles.viewComments}>View all {commentCount} comments</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={() => router.push(`/booking/${item.restaurant_id}/step1-date` as Href)}>
            <Text style={styles.bookLink}>Book a table at {restaurant?.name ?? 'this restaurant'} →</Text>
          </Pressable>
          <Text style={styles.timestamp}>{timeAgoLabel(item.timestamp).toUpperCase()}</Text>
          <View style={styles.separator} />
        </View>
      );
    },
    [likeState, saveState, router, handleLike, handleOpenSaveSheet],
  );

  const ListHeader = useCallback(
    () =>
      nextReservation ? (
        <ReservationBanner
          res={nextReservation}
          onPress={() => router.push('/(customer)/activity' as Href)}
        />
      ) : null,
    [nextReservation, router],
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
        <Text style={styles.logo}>Seatly</Text>
        <Pressable
          onPress={() => {
            router.push('/(customer)/notifications' as Href);
            setUnreadCount(0);
          }}
          hitSlop={10}
          style={styles.bellBtn}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
          {unreadCount > 0 ? <View style={styles.bellDot} /> : null}
        </Pressable>
      </View>

      {/* Mode tabs */}
      <View style={styles.modeTabs}>
        {(['local', 'following', 'explore'] as FeedMode[]).map((m) => (
          <Pressable key={m} onPress={() => setMode(m)} style={styles.modeTab}>
            <Text style={[styles.modeTabText, mode === m && styles.modeTabTextActive]}>
              {modeLabels[m]}
            </Text>
            {mode === m && <View style={styles.modeTabUnderline} />}
          </Pressable>
        ))}
      </View>

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
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 90 }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {mode === 'following'
                  ? 'Follow people to see their food posts here.'
                  : 'No posts yet.'}
              </Text>
            </View>
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

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  logo: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.gold,
    fontStyle: 'italic',
    letterSpacing: -0.5,
  },
  bellBtn: {
    padding: 4,
  },
  bellDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },

  modeTabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modeTab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modeTabText: { ...typography.body, fontWeight: '600', color: colors.textMuted },
  modeTabTextActive: { color: colors.textPrimary, fontWeight: '700' },
  modeTabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '15%',
    right: '15%',
    height: 1.5,
    backgroundColor: colors.textPrimary,
    borderRadius: 1,
  },

  // Reservation banner — Uber style
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgSurface,
    borderRadius: 14,
    gap: spacing.md,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(201,168,76,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerBody: {
    flex: 1,
    gap: 3,
  },
  bannerRestaurant: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  bannerMeta: {
    ...typography.bodySmall,
    color: colors.textMuted,
  },

  // Post
  post: { marginBottom: spacing.xs },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  postAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.bgElevated,
    borderWidth: 1.5,
    borderColor: colors.gold,
  },
  avatarFallback: { backgroundColor: colors.bgElevated },
  postMeta: { flex: 1, gap: 1 },
  postUsername: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  postLocation: { ...typography.bodySmall, color: colors.textMuted },
  postImage: {
    width: SCREEN_W,
    height: SCREEN_W,
    backgroundColor: colors.bgElevated,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actionIcon: {},
  likeCount: {
    ...typography.body,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: 3,
  },
  captionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  captionUsername: { ...typography.body, fontWeight: '700', color: colors.textPrimary },
  captionText: { ...typography.body, color: colors.textPrimary, flex: 1 },
  viewComments: {
    ...typography.bodySmall,
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  bookLink: {
    ...typography.bodySmall,
    color: colors.gold,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginTop: spacing.xs,
  },

  empty: {
    paddingTop: spacing['4xl'],
    alignItems: 'center',
    paddingHorizontal: spacing['3xl'],
  },
  emptyText: { ...typography.body, color: colors.textMuted, textAlign: 'center' },
});
