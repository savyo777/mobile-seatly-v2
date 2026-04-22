import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getRestaurantForPost, getSnapUser, timeAgoLabel, type SnapPost } from '@/lib/mock/snaps';
import { isLiked, isSaved, toggleLike, toggleSave } from '@/lib/mock/social';
import { mockCustomer } from '@/lib/mock/users';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

const ME = mockCustomer.id;

interface Props {
  item: SnapPost;
}

const SCREEN_W = Dimensions.get('window').width;
const IMAGE_H = SCREEN_W * 1.15;
const PRICE_LABELS = ['', '$', '$$', '$$$', '$$$$'];

const useStyles = createStyles((c) => ({
  card: {},
  photoModalRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  photoModalClose: {
    position: 'absolute',
    right: spacing.md,
    zIndex: 2,
    padding: spacing.sm,
  },
  photoModalImageWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    backgroundColor: c.bgElevated,
  },
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
    borderColor: c.gold,
    backgroundColor: c.bgElevated,
  },
  avatarFallback: { backgroundColor: c.bgElevated },
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
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
    backgroundColor: c.bgBase,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  likeCount: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
    marginLeft: -8,
    minWidth: 20,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  bookBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: 0.2,
  },
  infoCard: {
    backgroundColor: c.bgBase,
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
  restaurantName: {
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.1,
    lineHeight: 20,
    marginBottom: 2,
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
    color: c.gold,
  },
  metaMuted: {
    fontSize: 11,
    color: c.textMuted,
    fontWeight: '400',
  },
  metaDot: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.15)',
  },
  caption: {
    fontSize: 13,
    color: c.textPrimary,
    lineHeight: 18,
    marginTop: 5,
  },
  captionUser: {
    fontWeight: '700',
    color: c.textPrimary,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    alignItems: 'center',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
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
}));

export function FeedPostCard({ item }: Props) {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width: winW, height: winH } = useWindowDimensions();
  const router = useRouter();
  const restaurant = getRestaurantForPost(item.restaurant_id);
  const user = getSnapUser(item.user_id);

  const [photoOpen, setPhotoOpen] = useState(false);
  const [liked, setLiked] = useState(() => isLiked(ME, item.id));
  const [saved, setSaved] = useState(() => isSaved(ME, item.id));
  const likeCount = useMemo(() => item.likes + (liked ? 1 : 0), [item.likes, liked]);

  const handleLike = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setLiked(toggleLike(ME, item.id));
  }, [item.id]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSaved(toggleSave(ME, item.id));
  }, [item.id]);

  const handleComment = useCallback(() => {
    router.push(`/(customer)/discover/snaps/detail/${item.id}` as Href);
  }, [item.id, router]);

  const handleBook = useCallback(() => {
    router.push(`/booking/${item.restaurant_id}/step2-time` as Href);
  }, [item.restaurant_id, router]);

  const entranceOpacity = useRef(new Animated.Value(0)).current;
  const entranceY = useRef(new Animated.Value(10)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(entranceOpacity, { toValue: 1, duration: 320, useNativeDriver: true }),
      Animated.timing(entranceY, { toValue: 0, duration: 320, useNativeDriver: true }),
    ]).start();
  }, []);

  const openPhoto = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPhotoOpen(true);
  }, []);

  const closePhoto = useCallback(() => {
    setPhotoOpen(false);
  }, []);

  const hasAvailabilityStripe =
    restaurant?.availability === 'Top Rated' || restaurant?.availability === 'Available Tonight';

  const modalImageHeight = Math.max(240, winH - insets.top - insets.bottom - 56);

  return (
    <Animated.View style={[styles.card, { opacity: entranceOpacity, transform: [{ translateY: entranceY }] }]}>
      <Modal
        visible={photoOpen}
        animationType="fade"
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={closePhoto}
      >
        <View style={[styles.photoModalRoot, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Pressable
            onPress={closePhoto}
            style={[styles.photoModalClose, { top: insets.top + 8 }]}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Close photo"
          >
            <Ionicons name="close" size={28} color="#fff" />
          </Pressable>
          <Pressable style={styles.photoModalImageWrap} onPress={closePhoto}>
            <Image
              source={{ uri: item.image }}
              style={{ width: winW, height: modalImageHeight }}
              resizeMode="contain"
            />
          </Pressable>
        </View>
      </Modal>

      <View style={styles.imageWrap}>
        <Pressable onPress={openPhoto} style={styles.imagePressable}>
          <Image source={{ uri: item.image }} style={styles.image} resizeMode="cover" />
        </Pressable>

        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.gradient}
          pointerEvents="none"
        >
          <View style={styles.identityRow}>
            <View style={styles.avatarWrap}>
              {user?.avatarUrl ? (
                <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]} />
              )}
            </View>
            <View style={styles.identityInfo}>
              <Text style={styles.identityUsername}>@{user?.username ?? 'user'}</Text>
              <Text style={styles.identityTime}>{timeAgoLabel(item.timestamp)}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          <Pressable onPress={handleLike} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={27}
              color={liked ? '#EF4444' : c.textPrimary}
            />
          </Pressable>
          <Text style={styles.likeCount}>{likeCount > 0 ? likeCount.toLocaleString() : ''}</Text>
          <Pressable onPress={handleComment} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.7 }}>
            <Ionicons name="chatbubble-outline" size={25} color={c.textPrimary} />
          </Pressable>
          <Pressable
            onPress={handleBook}
            style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.75 }]}
          >
            <Ionicons name="calendar-outline" size={13} color={c.bgBase} />
            <Text style={styles.bookBtnText}>Book here</Text>
          </Pressable>
        </View>
        <Pressable onPress={handleSave} hitSlop={8} style={({ pressed }) => pressed && { opacity: 0.7 }}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? c.gold : c.textPrimary}
          />
        </Pressable>
      </View>

      <View style={styles.infoCard}>
        {hasAvailabilityStripe ? (
          <LinearGradient
            colors={[c.gold, 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.availStripe}
          />
        ) : null}

        <View style={styles.infoInner}>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {restaurant?.name ?? 'Restaurant'}
          </Text>

          <View style={styles.metaRow}>
            <Ionicons name="star" size={11} color={c.gold} />
            <Text style={styles.metaGold}>{restaurant?.avgRating.toFixed(1)}</Text>
            <Text style={styles.metaMuted}>· {restaurant?.totalReviews} reviews</Text>
            <Text style={styles.metaDot}>·</Text>
            <Text style={styles.metaMuted}>{restaurant?.distanceKm.toFixed(1)} km</Text>
          </View>

          <Text style={styles.caption} numberOfLines={2}>
            <Text style={styles.captionUser}>@{user?.username ?? 'user'} </Text>
            {item.caption}
          </Text>

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
