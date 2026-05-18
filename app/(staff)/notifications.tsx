import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Pressable, ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { RestaurantPicker } from '@/components/owner/RestaurantPicker';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { useColors, createStyles, spacing, borderRadius, typography } from '@/lib/theme';
import { mockStaffNotifications as DEMO_STAFF_NOTIFICATIONS } from '@/lib/mock/notifications';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchCurrentUserProfile } from '@/lib/services/userProfile';
import { getSupabase } from '@/lib/supabase/client';
import { subscribeToNotifications } from '@/lib/realtime/notificationsRegistry';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  getStaffNotificationIconName,
  getStaffNotificationTimeLabel,
  normalizeStaffNotifications,
  type NormalizedStaffNotification,
} from '@/lib/notifications/staffNotifications';

type StaffNotificationItem = (typeof DEMO_STAFF_NOTIFICATIONS)[number] & {
  restaurantId?: string | null;
};

const initialStaffNotifications: StaffNotificationItem[] = isDemoModeEnabled()
  ? (DEMO_STAFF_NOTIFICATIONS as StaffNotificationItem[])
  : [];

type NotificationRow = {
  id: string;
  type: string | null;
  title: string | null;
  body: string | null;
  is_read: boolean | null;
  created_at: string | null;
  restaurant_id: string | null;
};

function mapNotificationRow(row: NotificationRow): StaffNotificationItem {
  return {
    id: row.id,
    type: (row.type ?? 'unknown') as StaffNotificationItem['type'],
    title: row.title ?? 'Notification',
    body: row.body ?? '',
    isRead: row.is_read === true,
    createdAt: row.created_at ?? '',
    restaurantId: row.restaurant_id ?? null,
  };
}

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

const useStyles = createStyles((c) => ({
  headerPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  list: {
    paddingBottom: spacing['4xl'],
  },
  item: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.md,
  },
  itemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: c.gold,
  },
  iconWrap: {
    marginRight: spacing.md,
    paddingTop: 2,
  },
  textCol: {
    flex: 1,
  },
  title: {
    ...typography.bodyLarge,
    fontWeight: '700',
    color: c.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: c.textSecondary,
  },
  time: {
    ...typography.bodySmall,
    color: c.textMuted,
    marginTop: spacing.sm,
  },
  restaurantPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginTop: spacing.sm,
  },
  restaurantPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: -0.1,
  },
}));

export default function StaffNotificationsScreen() {
  const { t, i18n } = useTranslation();
  const c = useColors();
  const styles = useStyles();
  const { restaurantIds, isAll, restaurants } = useOwnerScope();

  const restaurantNameById = useMemo(() => {
    const map = new Map<string, string>();
    restaurants.forEach((r) => map.set(r.id, r.name));
    return map;
  }, [restaurants]);

  const [rawNotifications, setRawNotifications] = useState<StaffNotificationItem[]>(
    initialStaffNotifications,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const notifications = useMemo(
    () => normalizeStaffNotifications(rawNotifications),
    [rawNotifications],
  );
  // Preserve restaurantId on each normalized row by joining back on id.
  const notificationsWithScope = useMemo(() => {
    const byId = new Map<string, StaffNotificationItem>();
    rawNotifications.forEach((n) => byId.set(n.id, n));
    return notifications.map((n) => ({
      ...n,
      restaurantId: byId.get(n.id)?.restaurantId ?? null,
    }));
  }, [notifications, rawNotifications]);

  const [readIds, setReadIds] = useState<Set<string>>(
    () => new Set(notifications.filter((n) => n.isRead).map((n) => n.id)),
  );

  // Serialize restaurantIds for stable effect-dep comparison.
  const restaurantIdsKey = useMemo(
    () => [...restaurantIds].sort().join(','),
    [restaurantIds],
  );

  useEffect(() => {
    if (isDemoModeEnabled()) {
      setRawNotifications(DEMO_STAFF_NOTIFICATIONS as StaffNotificationItem[]);
      return;
    }
    let active = true;
    let unsubscribe: (() => void) | null = null;

    const scopeIds = restaurantIdsKey ? restaurantIdsKey.split(',').filter(Boolean) : [];

    const reload = async (userProfileId: string) => {
      const supabase = getSupabase();
      if (!supabase) return;
      let query = supabase
        .from('notifications')
        .select('id,type,title,body,is_read,created_at,restaurant_id')
        .eq('user_id', userProfileId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (scopeIds.length > 0) {
        query = query.in('restaurant_id', scopeIds);
      }
      const { data, error } = await query;
      if (!active) return;
      if (error) {
        setLoadError(friendlyError(error, "Couldn't load notifications."));
        return;
      }
      setLoadError(null);
      const rows = ((data ?? []) as NotificationRow[]).map(mapNotificationRow);
      setRawNotifications(rows);
      setReadIds(new Set(rows.filter((n) => n.isRead).map((n) => n.id)));
    };

    void (async () => {
      const profile = await fetchCurrentUserProfile().catch(() => null);
      const userProfileId = profile?.id ?? null;
      if (!userProfileId || !active) return;
      await reload(userProfileId);
      unsubscribe = subscribeToNotifications(userProfileId, () => {
        void reload(userProfileId);
      });
    })();

    return () => {
      active = false;
      if (unsubscribe) unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, reloadKey]);

  const onPress = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  type RenderItem = NormalizedStaffNotification & { restaurantId: string | null };

  const renderItem: ListRenderItem<RenderItem> = ({ item }) => {
    const isUnread = !readIds.has(item.id);
    const iconName = getStaffNotificationIconName(item.type) as IoniconName;
    const restaurantName =
      isAll && item.restaurantId ? restaurantNameById.get(item.restaurantId) ?? null : null;
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(item.id)}>
        <View style={[styles.item, isUnread && styles.itemUnread]}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconName} size={22} color={isUnread ? c.gold : c.textMuted} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>
              {getStaffNotificationTimeLabel(item.createdAt, i18n.language)}
            </Text>
            {restaurantName ? (
              <View style={styles.restaurantPill}>
                <Ionicons name="storefront-outline" size={10} color={c.textMuted} />
                <Text style={styles.restaurantPillText} numberOfLines={1}>
                  {restaurantName}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padded>
      <SubpageHeader
        title={t('staff.notifications')}
        fallbackTab="more"
        rightAction={<RestaurantPicker allowAll={true} size="compact" />}
      />
      <FlatList
        data={notificationsWithScope}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          loadError ? (
            <View style={{ alignItems: 'center', paddingVertical: 48, gap: 12 }}>
              <Text style={{ fontSize: 14, color: c.textMuted, textAlign: 'center', paddingHorizontal: 24 }}>
                {loadError}
              </Text>
              <Pressable
                onPress={() => {
                  setLoadError(null);
                  setReloadKey((k) => k + 1);
                }}
                style={{ paddingHorizontal: 18, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: c.gold }}
                accessibilityRole="button"
                accessibilityLabel="Retry loading notifications"
              >
                <Text style={{ color: c.gold, fontSize: 14, fontWeight: '600' }}>Retry</Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </ScreenWrapper>
  );
}
