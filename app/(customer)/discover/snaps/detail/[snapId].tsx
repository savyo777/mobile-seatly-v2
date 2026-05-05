import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  deleteSnapPost,
  getRestaurantForPost,
  getSnapPostById,
  getSnapUser,
  timeAgoLabel,
} from '@/lib/mock/snaps';
import {
  addComment,
  getCommentAuthor,
  listCommentsForPost,
  type Comment,
} from '@/lib/mock/comments';
import { isLiked, isSaved, toggleLike, toggleSave } from '@/lib/mock/social';
import { mockCustomer } from '@/lib/mock/users';
import { isPostInAnyCollection } from '@/lib/mock/collections';
import { SaveToCollectionSheet } from '@/components/snaps/SaveToCollectionSheet';
import { useColors, createStyles, borderRadius, spacing, typography } from '@/lib/theme';

const ME = mockCustomer.id;
const SCREEN_W = Dimensions.get('window').width;

const useStyles = createStyles((c) => ({
  root: {
    flex: 1,
    backgroundColor: c.bgBase,
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

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  topBarBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  topBarTitle: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },

  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: 1.5,
    borderColor: c.gold,
  },
  avatarFallback: {
    backgroundColor: c.bgElevated,
  },
  userMeta: { flex: 1, gap: 1 },
  username: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  restaurantName: {
    ...typography.bodySmall,
    color: c.textMuted,
  },

  postImage: {
    width: SCREEN_W,
    height: SCREEN_W,
    backgroundColor: c.bgElevated,
  },
  actionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },

  likeCount: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
    paddingHorizontal: spacing.md,
    marginTop: spacing.xs,
    marginBottom: 3,
  },
  captionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.md,
    marginBottom: 4,
  },
  captionUsername: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  captionText: {
    ...typography.body,
    color: c.textPrimary,
    flex: 1,
  },

  dishRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    marginBottom: 6,
  },
  dishText: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '600',
  },

  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  tagChip: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(201,168,76,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(201,168,76,0.25)',
  },
  tagChipText: {
    ...typography.bodySmall,
    color: '#DDD5C4',
    fontWeight: '600',
  },

  bookLink: {
    ...typography.bodySmall,
    color: c.gold,
    fontWeight: '700',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.xs,
  },
  timestamp: {
    fontSize: 10,
    fontWeight: '500',
    color: c.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    letterSpacing: 0.4,
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginBottom: spacing.md,
  },

  commentsHeader: {
    ...typography.label,
    color: c.textMuted,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },

  commentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  commentBody: { flex: 1, gap: 2 },
  commentText: {
    ...typography.body,
    color: c.textPrimary,
  },
  commentUsername: {
    fontWeight: '700',
  },
  commentTime: {
    ...typography.bodySmall,
    color: c.textMuted,
    fontSize: 11,
  },

  emptyCommentsBlock: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  emptyCommentsText: {
    ...typography.bodySmall,
    color: c.textMuted,
  },

  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
  },
  composerAvatar: {
    width: 32,
    height: 32,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
  },
  composerInput: {
    flex: 1,
    ...typography.body,
    color: c.textPrimary,
    minHeight: 36,
    maxHeight: 100,
    paddingVertical: 6,
  },
  composerBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  composerBtnText: {
    ...typography.body,
    color: c.gold,
    fontWeight: '700',
  },

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
  const { t } = useTranslation();
  const { snapId } = useLocalSearchParams<{ snapId: string }>();

  const post = snapId ? getSnapPostById(snapId) : undefined;
  const user = post ? getSnapUser(post.user_id) : undefined;
  const restaurant = post ? getRestaurantForPost(post.restaurant_id) : null;

  const [liked, setLiked] = useState(() => (post ? isLiked(ME, post.id) : false));
  const [saved, setSaved] = useState(() =>
    post ? isSaved(ME, post.id) || isPostInAnyCollection(ME, post.id) : false,
  );
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<Comment[]>(() =>
    post ? listCommentsForPost(post.id) : [],
  );
  const [showSaveSheet, setShowSaveSheet] = useState(false);
  const [showDeleteSheet, setShowDeleteSheet] = useState(false);
  const isOwnPost = post?.user_id === ME;

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
            router.back();
          },
        },
      ],
    );
  }, [post, router]);

  const displayLikeCount = useMemo(
    () => (post ? post.likes + (liked ? 1 : 0) : 0),
    [post, liked],
  );

  const handleLike = useCallback(() => {
    if (!post) return;
    const next = toggleLike(ME, post.id);
    setLiked(next);
  }, [post]);

  const handleSave = useCallback(() => {
    if (!post) return;
    setShowSaveSheet(true);
  }, [post]);

  const handleSubmitComment = useCallback(() => {
    if (!post || !commentText.trim()) return;
    const comment = addComment(post.id, ME, commentText.trim());
    setComments((prev) => [...prev, comment]);
    setCommentText('');
  }, [post, commentText]);

  if (!post) {
    return (
      <View style={[styles.root, styles.centered, { paddingTop: insets.top + spacing['3xl'] }]}>
        <Text style={styles.emptyTitle}>{t('snapDetail.notFound')}</Text>
        <Pressable onPress={() => router.back()} style={styles.backGhost}>
          <Text style={styles.backGhostText}>{t('snapDetail.goBack')}</Text>
        </Pressable>
      </View>
    );
  }

  const renderHeader = () => (
    <View>
      <View style={styles.postHeader}>
        <Pressable
          style={styles.userRow}
          onPress={() => router.push(`/(customer)/profile/${post.user_id}` as Href)}
        >
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarFallback]} />
          )}
          <View style={styles.userMeta}>
            <Text style={styles.username}>{user?.username ?? 'user'}</Text>
            <Pressable
              onPress={() => router.push(`/(customer)/discover/${post.restaurant_id}` as Href)}
            >
              <Text style={styles.restaurantName}>{restaurant?.name ?? 'Restaurant'}</Text>
            </Pressable>
          </View>
        </Pressable>
      </View>

      <Image source={{ uri: post.image }} style={styles.postImage} resizeMode="cover" />

      <View style={styles.actionBar}>
        <View style={styles.actionLeft}>
          <Pressable onPress={handleLike} hitSlop={8}>
            <Ionicons
              name={liked ? 'heart' : 'heart-outline'}
              size={28}
              color={liked ? c.danger : c.textPrimary}
            />
          </Pressable>
          <Pressable hitSlop={8}>
            <Ionicons name="chatbubble-outline" size={25} color={c.textPrimary} />
          </Pressable>
          <Pressable
            onPress={() =>
              router.push(`/booking/${post.restaurant_id}/step2-time` as Href)
            }
            hitSlop={8}
          >
            <Ionicons name="calendar-outline" size={25} color={c.textPrimary} />
          </Pressable>
        </View>
        <Pressable onPress={handleSave} hitSlop={8}>
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={saved ? c.gold : c.textPrimary}
          />
        </Pressable>
      </View>

      <Text style={styles.likeCount}>
        {displayLikeCount.toLocaleString()} {t('snapDetail.likes')}
      </Text>

      <View style={styles.captionRow}>
        <Text style={styles.captionUsername}>{user?.username ?? 'user'} </Text>
        <Text style={styles.captionText}>{post.caption}</Text>
      </View>

      {post.dish ? (
        <View style={styles.dishRow}>
          <Ionicons name="restaurant-outline" size={14} color={c.gold} />
          <Text style={styles.dishText}>{post.dish}</Text>
        </View>
      ) : null}

      {post.tags && post.tags.length > 0 ? (
        <View style={styles.tagRow}>
          {post.tags.map((tag) => (
            <Pressable
              key={tag}
              onPress={() =>
                router.push(
                  `/(customer)/discover/tag/${encodeURIComponent(tag.replace(/^#/, ''))}` as Href,
                )
              }
              style={({ pressed }) => [styles.tagChip, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.tagChipText}>{tag}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      <Pressable
        onPress={() => router.push(`/booking/${post.restaurant_id}/step2-time` as Href)}
      >
        <Text style={styles.bookLink}>
          {t('snapDetail.bookAt', { name: restaurant?.name ?? '' })}
        </Text>
      </Pressable>

      <Text style={styles.timestamp}>{timeAgoLabel(post.timestamp).toUpperCase()}</Text>

      <View style={styles.divider} />

      <Text style={styles.commentsHeader}>
        {t('snapDetail.commentsHeader', { count: comments.length })}
      </Text>
    </View>
  );

  const renderComment = ({ item }: { item: Comment }) => {
    const author = getCommentAuthor(item.user_id);
    return (
      <View style={styles.commentRow}>
        {author?.avatarUrl ? (
          <Image source={{ uri: author.avatarUrl }} style={styles.commentAvatar} />
        ) : (
          <View style={[styles.commentAvatar, styles.avatarFallback]} />
        )}
        <View style={styles.commentBody}>
          <Text style={styles.commentText}>
            <Text style={styles.commentUsername}>{author?.username ?? 'user'} </Text>
            {item.text}
          </Text>
          <Text style={styles.commentTime}>{timeAgoLabel(item.timestamp)}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.topBar}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.topBarBtn}>
          <Ionicons name="chevron-back" size={24} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>{t('snapDetail.title')}</Text>
        {isOwnPost ? (
          <Pressable
            onPress={() => setShowDeleteSheet(true)}
            hitSlop={10}
            style={({ pressed }) => [styles.topBarBtn, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={c.textPrimary} />
          </Pressable>
        ) : (
          <View style={styles.topBarBtn} />
        )}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 44}
      >
        <FlatList
          data={comments}
          keyExtractor={(item) => item.id}
          renderItem={renderComment}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: spacing.xl }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyCommentsBlock}>
              <Text style={styles.emptyCommentsText}>{t('snapDetail.noComments')}</Text>
            </View>
          }
        />

        <View style={[styles.composer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
          {mockCustomer.avatarUrl ? (
            <Image source={{ uri: mockCustomer.avatarUrl }} style={styles.composerAvatar} />
          ) : (
            <View style={[styles.composerAvatar, styles.avatarFallback]} />
          )}
          <TextInput
            value={commentText}
            onChangeText={setCommentText}
            placeholder={t('snapDetail.addCommentPlaceholder')}
            placeholderTextColor={c.textMuted}
            style={styles.composerInput}
            multiline
          />
          <Pressable
            onPress={handleSubmitComment}
            disabled={!commentText.trim()}
            style={({ pressed }) => [
              styles.composerBtn,
              (!commentText.trim() || pressed) && { opacity: 0.5 },
            ]}
          >
            <Text style={styles.composerBtnText}>{t('snapDetail.post')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

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

      <SaveToCollectionSheet
        visible={showSaveSheet}
        postId={post.id}
        onClose={() => setShowSaveSheet(false)}
        onSaved={() => {
          toggleSave(ME, post.id);
          setSaved(true);
        }}
      />
    </View>
  );
}
