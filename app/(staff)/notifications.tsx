import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ListRenderItem } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ScreenWrapper } from '@/components/ui';
import { colors, spacing, borderRadius, typography } from '@/lib/theme';
import { mockStaffNotifications, type AppNotification } from '@/lib/mock/notifications';

function iconForType(type: AppNotification['type']): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case 'no_show_flag':
      return 'alert-circle';
    case 'booking_confirmed':
    case 'booking_reminder_24h':
    case 'booking_reminder_2h':
    case 'booking_cancelled':
    case 'waitlist_ready':
      return 'calendar';
    case 'payment_received':
      return 'cash';
    case 'shift_reminder':
      return 'time';
    case 'loyalty_milestone':
      return 'star';
    default:
      return 'notifications';
  }
}

function timeAgo(iso: string, locale: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const sec = Math.max(0, Math.floor((now - then) / 1000));
  const rtf = new Intl.RelativeTimeFormat(locale === 'fr' ? 'fr' : 'en', { numeric: 'auto' });
  if (sec < 60) return rtf.format(-sec, 'second');
  const min = Math.floor(sec / 60);
  if (min < 60) return rtf.format(-min, 'minute');
  const hr = Math.floor(min / 60);
  if (hr < 24) return rtf.format(-hr, 'hour');
  const day = Math.floor(hr / 24);
  return rtf.format(-day, 'day');
}

export default function StaffNotificationsScreen() {
  const { t, i18n } = useTranslation();
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set(mockStaffNotifications.filter((n) => n.isRead).map((n) => n.id)));

  const onPress = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const renderItem: ListRenderItem<AppNotification> = ({ item }) => {
    const isUnread = !readIds.has(item.id);
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => onPress(item.id)}>
        <View style={[styles.item, isUnread && styles.itemUnread]}>
          <View style={styles.iconWrap}>
            <Ionicons name={iconForType(item.type)} size={22} color={isUnread ? colors.gold : colors.textMuted} />
          </View>
          <View style={styles.textCol}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
            <Text style={styles.time}>{timeAgo(item.createdAt, i18n.language)}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenWrapper scrollable={false} padded>
      <Text style={styles.screenTitle}>{t('staff.notifications')}</Text>
      <FlatList
        data={mockStaffNotifications}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screenTitle: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  list: {
    paddingBottom: spacing['4xl'],
  },
  item: {
    flexDirection: 'row',
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.bgSurface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  itemUnread: {
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
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
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
  time: {
    ...typography.bodySmall,
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
});
