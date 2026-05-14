import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';
import { ProfileStackScreen } from '@/components/profile/ProfileStackScreen';
import {
  useColors,
  createStyles,
  borderRadius,
  spacing,
  typography,
} from '@/lib/theme';
import { useAuthSession } from '@/lib/auth/AuthContext';
import { listMyReviews, type MyReviewRow } from '@/lib/reviews/listMyReviews';
import { deleteMyReview } from '@/lib/reviews/deleteMyReview';

const useStyles = createStyles((c) => ({
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing['2xl'],
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  thumb: {
    width: 78,
    height: 78,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgSurface,
  },
  thumbFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
  },
  rowHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  rowHeadText: {
    flex: 1,
    minWidth: 0,
  },
  restaurantName: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
  },
  dateLine: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: 2,
    fontSize: 12,
  },
  stars: {
    flexDirection: 'row',
    gap: 2,
    marginTop: spacing.xs,
  },
  body: {
    ...typography.bodySmall,
    color: c.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  trashHit: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  loadingWrap: {
    paddingVertical: spacing['2xl'],
    alignItems: 'center',
  },
  empty: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'] + spacing.md,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    ...typography.h3,
    color: c.textPrimary,
    fontWeight: '700',
  },
  emptyBody: {
    ...typography.bodySmall,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  // Action sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: c.bgElevated,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: c.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    ...typography.body,
    fontWeight: '700',
    color: c.textPrimary,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  sheetSubtitle: {
    ...typography.bodySmall,
    color: c.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  sheetAction: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  sheetActionDanger: {
    ...typography.body,
    color: '#e35b5b',
    fontWeight: '700',
  },
  sheetActionCancel: {
    ...typography.body,
    color: c.textPrimary,
    fontWeight: '600',
  },
  sheetDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
  },
}));

function formatReviewDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function MyReviewsScreen() {
  const styles = useStyles();
  const c = useColors();
  const router = useRouter();
  const { user, isAuthenticated } = useAuthSession();

  const [rows, setRows] = useState<MyReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingDelete, setPendingDelete] = useState<MyReviewRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId || !isAuthenticated) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await listMyReviews(userId);
      setRows(data);
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [userId, isAuthenticated]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || !userId) return;
    setDeleting(true);
    try {
      await deleteMyReview({
        userId,
        reviewId: pendingDelete.id,
        visitPhotoId: pendingDelete.visitPhotoId,
        visitPhotoUrl: pendingDelete.visitPhotoUrl,
      });
      setRows((prev) => prev.filter((r) => r.id !== pendingDelete.id));
      setPendingDelete(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not delete your review.';
      Alert.alert('Delete failed', msg);
    } finally {
      setDeleting(false);
    }
  }, [pendingDelete, userId]);

  const onRowPress = useCallback(
    (row: MyReviewRow) => {
      router.push(`/(customer)/discover/${row.restaurantId}` as Href);
    },
    [router],
  );

  const renderItem = useCallback(
    ({ item }: { item: MyReviewRow }) => {
      const thumbnailUri = item.visitPhotoUrl ?? item.restaurantCoverUrl;
      const hasThumb = !!thumbnailUri;
      return (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.92 }]}
          onPress={() => onRowPress(item)}
        >
          {hasThumb ? (
            <Image
              source={{ uri: thumbnailUri }}
              style={styles.thumb}
              contentFit="cover"
            />
          ) : (
            <View style={[styles.thumb, styles.thumbFallback]}>
              <Ionicons name="image-outline" size={24} color={c.textMuted} />
            </View>
          )}
          <View style={styles.rowBody}>
            <View style={styles.rowHead}>
              <View style={styles.rowHeadText}>
                <Text style={styles.restaurantName} numberOfLines={1}>
                  {item.restaurantName ?? 'Restaurant'}
                </Text>
                {item.createdAt && (
                  <Text style={styles.dateLine}>{formatReviewDate(item.createdAt)}</Text>
                )}
                <View style={styles.stars}>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Ionicons
                      key={value}
                      name={value <= item.rating ? 'star' : 'star-outline'}
                      size={14}
                      color={c.gold}
                    />
                  ))}
                </View>
              </View>
              <Pressable
                onPress={() => setPendingDelete(item)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Delete review"
                style={({ pressed }) => [styles.trashHit, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="trash-outline" size={20} color={c.textSecondary} />
              </Pressable>
            </View>
            {item.body ? (
              <Text style={styles.body} numberOfLines={3}>
                {item.body}
              </Text>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [c.gold, c.textMuted, c.textSecondary, onRowPress, styles],
  );

  const emptyComponent = useMemo(
    () => (
      <View style={styles.empty}>
        <View style={styles.emptyIcon}>
          <Ionicons name="chatbubbles-outline" size={28} color={c.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No reviews yet</Text>
        <Text style={styles.emptyBody}>
          Share your visits — your ratings and captions will appear here.
        </Text>
      </View>
    ),
    [c.textMuted, styles],
  );

  return (
    <ProfileStackScreen title="My Reviews">
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={c.gold} />
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={emptyComponent}
        />
      )}

      <Modal
        visible={!!pendingDelete}
        transparent
        animationType="slide"
        onRequestClose={() => (deleting ? undefined : setPendingDelete(null))}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => (deleting ? undefined : setPendingDelete(null))}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Delete this review?</Text>
            <Text style={styles.sheetSubtitle}>
              Your rating and caption will be removed from the restaurant page. This can&apos;t
              be undone.
            </Text>
            <Pressable
              onPress={() => void confirmDelete()}
              disabled={deleting}
              style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.7 }]}
            >
              {deleting ? (
                <ActivityIndicator color="#e35b5b" />
              ) : (
                <Text style={styles.sheetActionDanger}>Delete review</Text>
              )}
            </Pressable>
            <View style={styles.sheetDivider} />
            <Pressable
              onPress={() => setPendingDelete(null)}
              disabled={deleting}
              style={({ pressed }) => [styles.sheetAction, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.sheetActionCancel}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ProfileStackScreen>
  );
}
