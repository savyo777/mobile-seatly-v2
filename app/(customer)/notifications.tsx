import React, { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Image,
} from 'react-native';
import { Href, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import {
  bucketNotifications,
  getNotificationActor,
  listNotifications,
  markAllRead,
  type SocialNotification,
  type NotificationBucket,
} from '@/lib/mock/notifications';
import { getSnapPostById, timeAgoLabel } from '@/lib/mock/snaps';
import { mockCustomer } from '@/lib/mock/users';
import { borderRadius, colors, spacing, typography } from '@/lib/theme';

const ME = mockCustomer.id;
const BUCKET_ORDER: NotificationBucket[] = ['today', 'thisWeek', 'earlier'];

const BUCKET_LABELS: Record<NotificationBucket, string> = {
  today: 'Today',
  thisWeek: 'This Week',
  earlier: 'Earlier',
};

type TypeConfig = {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  bg: string;
  color: string;
};

const TYPE_CONFIG: Record<SocialNotification['type'], TypeConfig> = {
  like: { icon: 'heart', bg: 'rgba(201,162,74,0.15)', color: colors.gold },
  comment: { icon: 'chatbubble', bg: 'rgba(99,179,237,0.12)', color: '#63B3ED' },
  follow: { icon: 'person-add', bg: 'rgba(255,255,255,0.06)', color: colors.textMuted },
};

function buildNotifText(
  n: SocialNotification,
  actorUsername: string,
  postRestaurant?: string,
): string {
  if (n.type === 'like') {
    return postRestaurant
      ? `${actorUsername} liked your snap at ${postRestaurant}`
      : `${actorUsername} liked your snap`;
  }
  if (n.type === 'comment') {
    const quote = n.commentText ? ` "${n.commentText}"` : '';
    return postRestaurant
      ? `${actorUsername} commented on your snap at ${postRestaurant}${quote}`
      : `${actorUsername} commented on your snap${quote}`;
  }
  return `${actorUsername} started following you`;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [items, setItems] = useState<SocialNotification[]>(() => listNotifications(ME));

  useEffect(() => {
    const timeout = setTimeout(() => {
      markAllRead(ME);
      setItems(listNotifications(ME));
    }, 600);
    return () => clearTimeout(timeout);
  }, []);

  const handlePress = useCallback(
    (n: SocialNotification) => {
      const post = n.postId ? getSnapPostById(n.postId) : undefined;
      if (n.type === 'follow') {
        router.push(`/(customer)/profile/${n.actorId}?from=notifications` as Href);
      } else if (post) {
        router.push(`/(customer)/discover/snaps/detail/${post.id}` as Href);
      }
    },
    [router],
  );

  const buckets = bucketNotifications(items);

  const renderItem = (n: SocialNotification) => {
    const actor = getNotificationActor(n.actorId);
    const post = n.postId ? getSnapPostById(n.postId) : undefined;
    const cfg = TYPE_CONFIG[n.type];
    const username = actor?.username ?? 'someone';
    const notifText = buildNotifText(n, username, post?.restaurantName);
    const isUnread = !n.read;

    return (
      <Pressable
        key={n.id}
        onPress={() => handlePress(n)}
        style={({ pressed }) => [styles.row, pressed && { opacity: 0.72 }]}
      >
        {/* Unread accent bar */}
        {isUnread && <View style={styles.unreadBar} />}

        {/* Type icon circle */}
        <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={18} color={cfg.color} />
        </View>

        {/* Text block */}
        <View style={styles.body}>
          <Text style={styles.notifText} numberOfLines={3}>
            <Text style={styles.boldName}>{username}</Text>
            <Text>{notifText.slice(username.length)}</Text>
          </Text>
          <Text style={styles.time}>{timeAgoLabel(n.timestamp)}</Text>
        </View>

        {/* Snap thumbnail (like / comment) */}
        {post?.image ? (
          <Image source={{ uri: post.image }} style={styles.thumb} />
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.6 }]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.topBarTitle}>Activity</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing['4xl'] }}
        showsVerticalScrollIndicator={false}
      >
        {items.length === 0 ? (
          <View style={styles.empty}>
            <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.06)', width: 56, height: 56 }]}>
              <Ionicons name="notifications-outline" size={26} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyBody}>When people like or comment on your snaps, you'll see it here.</Text>
          </View>
        ) : (
          BUCKET_ORDER.map((bucket) => {
            const list = buckets[bucket];
            if (!list.length) return null;
            return (
              <View key={bucket} style={styles.section}>
                {/* Bucket header */}
                <View style={styles.bucketRow}>
                  <View style={styles.goldDot} />
                  <Text style={styles.bucketHeader}>{BUCKET_LABELS[bucket]}</Text>
                </View>
                <View style={styles.card}>
                  {list.map((n, i) => (
                    <React.Fragment key={n.id}>
                      {i > 0 && <View style={styles.divider} />}
                      {renderItem(n)}
                    </React.Fragment>
                  ))}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bgBase,
  },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.textPrimary,
    letterSpacing: -0.2,
  },

  section: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },

  bucketRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  goldDot: {
    width: 5,
    height: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.gold,
  },
  bucketHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  card: {
    backgroundColor: colors.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.07)',
    overflow: 'hidden',
  },

  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginLeft: 60,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    position: 'relative',
  },

  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
  },

  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  body: {
    flex: 1,
    gap: 3,
  },
  notifText: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
  },
  boldName: {
    fontWeight: '700',
    color: colors.textPrimary,
  },
  time: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },

  thumb: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.bgElevated,
    flexShrink: 0,
  },

  empty: {
    alignItems: 'center',
    paddingTop: 80,
    paddingHorizontal: spacing['3xl'],
    gap: spacing.md,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.sm,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
  },
});
