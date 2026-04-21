import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import {
  getRestaurantForPost,
  getSnapUser,
  timeAgoLabel,
  type SnapPost,
} from '@/lib/mock/snaps';
import { getCommentCountForPost } from '@/lib/mock/comments';
import { useTranslation } from 'react-i18next';
import { HeartBurst } from './HeartBurst';
import { colors, spacing, borderRadius } from '@/lib/theme';

interface Props {
  item: SnapPost;
  index: number;
  mode: 'local' | 'following' | 'explore';
  liked: boolean;
  saved: boolean;
  onLike: () => void;
  onSave: () => void;
}

const SCREEN_W = Dimensions.get('window').width;
const IMAGE_H = SCREEN_W * 1.15;
const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$'];

export function FeedPostCard({ item, index, mode, liked, saved, onLike, onSave }: Props) {
  const router = useRouter();
  const { t } = useTranslation();
  const restaurant = getRestaurantForPost(item.restaurant_id);
  const user = getSnapUser(item.user_id);
  const commentCount = getCommentCountForPost(item.id);
  const likeCount = item.likes + (liked ? 1 : 0);

  const [heartBurst, setHeartBurst] = useState(false);
  const heartScale = useRef(new Animated.Value(1)).current;
  const bookmarkScale = useRef(new Animated.Value(1)).current;

  // Card entrance animation
  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(entranceY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  // Double-tap detection
  const lastTapRef = useRef(0);
  const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleImagePress = useCallback(() => {
    const now = Date.now();
    if (now - lastTapRef.current < 300 && tapTimeoutRef.current) {
      clearTimeout(tapTimeoutRef.current);
      tapTimeoutRef.current = null;
      // Double tap → like
      if (!liked) {
        onLike();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
      setHeartBurst(true);
    } else {
      lastTapRef.current = now;
      tapTimeoutRef.current = setTimeout(() => {
        tapTimeoutRef.current = null;
        router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href);
      }, 260);
    }
  }, [liked, onLike, item.id, router]);

  const handleLike = useCallback(() => {
    onLike();
    Animated.sequence([
      Animated.spring(heartScale, { toValue: 1.35, tension: 120, friction: 6, useNativeDriver: true }),
      Animated.spring(heartScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [onLike, heartScale]);

  const handleSave = useCallback(() => {
    onSave();
    Animated.sequence([
      Animated.spring(bookmarkScale, { toValue: 1.35, tension: 120, friction: 6, useNativeDriver: true }),
      Animated.spring(bookmarkScale, { toValue: 1, tension: 80, friction: 8, useNativeDriver: true }),
    ]).start();
  }, [onSave, bookmarkScale]);

  const handleReserveTable = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/booking/${item.restaurant_id}/step2-time` as Href);
  }, [item.restaurant_id, router]);

  const isTrending = mode === 'explore' || item.likes > 500;
  const hasAvailabilityStripe =
    restaurant?.availability === 'Top Rated' || restaurant?.availability === 'Available Tonight';

  return (
    <Animated.View style={[styles.card, { opacity: entranceOpacity, transform: [{ translateY: entranceY }] }]}>
      {/* ── Image zone ── */}
      <View style={styles.imageWrap}>
        <Pressable onPress={handleImagePress} style={styles.imagePressable}>
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        </Pressable>

        {/* Heart burst overlay */}
        <HeartBurst visible={heartBurst} onComplete={() => setHeartBurst(false)} />

        {/* Dish badge — top left */}
        {item.dish ? (
          <View style={styles.dishBadge}>
            <Ionicons name="restaurant" size={10} color={colors.gold} />
            <Text style={styles.dishBadgeText} numberOfLines={1}>{item.dish}</Text>
          </View>
        ) : null}

        {/* Trending badge — top right */}
        {isTrending ? (
          <View style={styles.trendingBadge}>
            <Ionicons name="flame" size={10} color={colors.bgBase} />
            <Text style={styles.trendingBadgeText}>
              {mode === 'explore' ? `#${index + 1}` : 'HOT'}
            </Text>
          </View>
        ) : null}

        {/* Bottom gradient + identity */}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
          pointerEvents="box-none"
        >
          <View style={styles.identityRow}>
            <Pressable
              onPress={() => router.push(`/(customer)/profile/${item.user_id}` as Href)}
              style={styles.avatarWrap}
            >
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]} />
              )}
            </Pressable>
            <View style={styles.identityInfo}>
              <Text style={styles.identityUsername}>@{user?.username ?? 'user'}</Text>
              <Text style={styles.identityTime}>{timeAgoLabel(item.timestamp)}</Text>
            </View>
          </View>
        </LinearGradient>

      </View>

      {/* ── Info card ── */}
      <View style={styles.infoCard}>
        {/* Availability stripe */}
        {hasAvailabilityStripe ? (
          <LinearGradient
            colors={[colors.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.availStripe}
          />
        ) : null}

        {/* ── Horizontal action row ── */}
        <View style={styles.actionBar}>
          <Pressable onPress={handleLike} style={styles.actionItem} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: heartScale }] }}>
              <Ionicons
                name={liked ? 'heart' : 'heart-outline'}
                size={22}
                color={liked ? colors.gold : colors.textSecondary}
              />
            </Animated.View>
            <Text style={[styles.actionLabel, liked && styles.actionLabelActive]}>
              {likeCount.toLocaleString()}
            </Text>
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable
            onPress={() => router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href)}
            style={styles.actionItem}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.actionLabel}>{commentCount > 0 ? commentCount : 'Comment'}</Text>
          </Pressable>

          <View style={styles.actionDivider} />

          <Pressable onPress={handleSave} style={styles.actionItem} hitSlop={8}>
            <Animated.View style={{ transform: [{ scale: bookmarkScale }] }}>
              <Ionicons
                name={saved ? 'bookmark' : 'bookmark-outline'}
                size={20}
                color={saved ? colors.gold : colors.textSecondary}
              />
            </Animated.View>
            <Text style={[styles.actionLabel, saved && styles.actionLabelActive]}>
              {saved ? 'Saved' : 'Save'}
            </Text>
          </Pressable>
        </View>

        <View style={styles.infoInner}>
          {/* Restaurant name + Reserve pill — same row */}
          <View style={styles.nameReserveRow}>
            <Pressable
              style={styles.namePress}
              onPress={() => router.push(`/(customer)/discover/${item.restaurant_id}` as Href)}
            >
              <Text style={styles.restaurantName} numberOfLines={1}>
                {restaurant?.name ?? 'Restaurant'}
              </Text>
            </Pressable>

            <View style={styles.reserveFrame}>
              <Pressable
                onPress={handleReserveTable}
                accessibilityRole="button"
                accessibilityLabel={`Reserve a table at ${restaurant?.name ?? ''}`}
                style={({ pressed }) => [styles.reservePressable, pressed && styles.reservePressablePressed]}
              >
                <View style={styles.reserveRow}>
                  <Text style={styles.reserveLabel}>Book</Text>
                </View>
              </Pressable>
            </View>
          </View>

          {/* Meta row */}
          <View style={styles.metaRow}>
            <Ionicons name="star" size={11} color={colors.gold} />
            <Text style={styles.metaGold}>{restaurant?.avgRating.toFixed(1)}</Text>
            <Text style={styles.metaMuted}>· {restaurant?.totalReviews} reviews</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaMuted}>{PRICE_LABELS[restaurant?.priceRange ?? 2]}</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaMuted}>{restaurant?.distanceKm.toFixed(1)} km</Text>
          </View>

          {/* Caption */}
          <Text style={styles.caption} numberOfLines={2}>
            <Text style={styles.captionUser}>@{user?.username ?? 'user'} </Text>
            {item.caption}
          </Text>

          {/* Tags */}
          {item.tags && item.tags.length > 0 ? (
            <View style={styles.tagsRow}>
              {item.tags.slice(0, 3).map((tag) => (
                <View key={tag} style={styles.tagChip}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {},

  // Image
  imageWrap: {
    width: SCREEN_W,
    height: IMAGE_H,
    position: 'relative',
  },
  imagePressable: {
    width: SCREEN_W,
    height: IMAGE_H,
  },
  image: {
    width: SCREEN_W,
    height: IMAGE_H,
    backgroundColor: colors.bgElevated,
  },

  // Dish badge
  dishBadge: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,0,0,0.58)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.38)',
    maxWidth: SCREEN_W * 0.55,
  },
  dishBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.gold,
  },

  // Trending badge
  trendingBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.gold,
    borderRadius: borderRadius.full,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  trendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.bgBase,
    letterSpacing: 0.5,
  },

  // Bottom gradient + identity
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 80,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarWrap: {},
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.bgElevated,
  },
  avatarFallback: { backgroundColor: colors.bgElevated },
  identityInfo: { flex: 1 },
  identityUsername: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  identityTime: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.5)',
    marginTop: 1,
  },

  // Horizontal action bar
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  actionItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 2,
  },
  actionDivider: {
    width: StyleSheet.hairlineWidth,
    height: 18,
    backgroundColor: colors.border,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  actionLabelActive: {
    color: colors.gold,
  },

  // Info card
  infoCard: {
    backgroundColor: colors.bgBase,
    overflow: 'hidden',
  },
  availStripe: {
    height: 2,
  },
  infoInner: {
    paddingHorizontal: spacing.md,
    paddingTop: 8,
    paddingBottom: 10,
  },

  nameReserveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 2,
  },
  namePress: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.1,
    lineHeight: 20,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 1,
    flexWrap: 'nowrap',
  },
  metaGold: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.gold,
  },
  metaMuted: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.15)',
  },

  caption: {
    fontSize: 13,
    color: colors.textPrimary,
    lineHeight: 18,
    marginTop: 5,
  },
  captionUser: {
    fontWeight: '700',
    color: colors.textPrimary,
  },

  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,162,74,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(201,162,74,0.18)',
  },
  tagText: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(201,162,74,0.8)',
  },

  reserveFrame: {
    alignSelf: 'center',
    borderRadius: borderRadius.full,
    overflow: 'hidden',
    backgroundColor: colors.gold,
    shadowColor: colors.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  reservePressable: {
    borderRadius: borderRadius.full,
    overflow: 'hidden',
  },
  reservePressablePressed: {
    opacity: 0.82,
    transform: [{ scale: 0.96 }],
  },
  reserveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
    paddingHorizontal: 13,
    gap: 5,
  },
  reserveMedallion: {},
  reserveLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.bgBase,
    letterSpacing: 0.1,
  },
  reserveChevronCap: {},

});
