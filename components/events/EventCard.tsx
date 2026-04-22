import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, Href } from 'expo-router';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  type DiningEvent,
  type EventType,
  getRestaurantForEvent,
  isEventSaved,
  toggleSaveEvent,
} from '@/lib/mock/events';
import { mockCustomer } from '@/lib/mock/users';

const ME = mockCustomer.id;

const TYPE_LABEL: Record<EventType, string> = {
  event: 'Event',
  promotion: 'Promotion',
  happy_hour: 'Happy Hour',
  tasting_menu: 'Tasting Menu',
};

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

const useStyles = createStyles((c) => ({
  card: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  cardHero: {
    borderColor: 'rgba(201,162,74,0.25)',
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  photo: {
    width: '100%',
    backgroundColor: c.bgElevated,
  },
  topRow: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: 'rgba(10,10,10,0.55)',
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  urgentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  urgentText: {
    fontSize: 10,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: 0.3,
  },
  saveBtn: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: 6,
  },
  restaurantName: {
    fontSize: 11,
    fontWeight: '700',
    color: c.goldLight,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  metaPriceText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '500',
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    shadowColor: c.gold,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  bookBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.bgBase,
  },
}));

type Props = {
  event: DiningEvent;
  isHero?: boolean;
};

export function EventCard({ event, isHero = false }: Props) {
  const router = useRouter();
  const c = useColors();
  const styles = useStyles();
  const restaurant = getRestaurantForEvent(event.restaurantId);
  const [saved, setSaved] = useState(() => isEventSaved(ME, event.id));

  const TYPE_COLOR: Record<EventType, string> = {
    event: c.gold,
    promotion: '#63B3ED',
    happy_hour: '#F6AD55',
    tasting_menu: c.gold,
  };

  const typeColor = TYPE_COLOR[event.type];
  const cardHeight = isHero ? 320 : 220;

  const handleSave = useCallback(() => {
    toggleSaveEvent(ME, event.id);
    setSaved((s) => !s);
  }, [event.id]);

  const handleBook = useCallback(() => {
    router.push(`/(customer)/discover/${event.restaurantId}` as Href);
  }, [event.restaurantId, router]);

  const isUrgent = event.spotsLeft !== undefined && event.spotsLeft <= 6;

  return (
    <Pressable
      onPress={handleBook}
      style={({ pressed }) => [styles.card, isHero && styles.cardHero, pressed && { opacity: 0.95 }]}
      accessibilityRole="button"
      accessibilityLabel={`${event.title} at ${restaurant?.name}`}
    >
      <Image source={{ uri: event.coverImage }} style={[styles.photo, { height: cardHeight }]} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.88)']}
        style={[StyleSheet.absoluteFill, { borderRadius: borderRadius.xl }]}
      />

      <View style={styles.topRow}>
        <View style={[styles.typeBadge, { borderColor: typeColor + '55' }]}>
          <Text style={[styles.typeBadgeText, { color: typeColor }]}>
            {TYPE_LABEL[event.type].toUpperCase()}
          </Text>
        </View>

        {isUrgent && (
          <View style={styles.urgentBadge}>
            <Ionicons name="flame" size={11} color={c.bgBase} />
            <Text style={styles.urgentText}>{event.spotsLeft} spots left</Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={handleSave}
        hitSlop={10}
        style={({ pressed }) => [styles.saveBtn, pressed && { opacity: 0.7 }]}
        accessibilityLabel={saved ? 'Unsave event' : 'Save event'}
      >
        <Ionicons
          name={saved ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={saved ? c.gold : '#fff'}
        />
      </Pressable>

      <View style={styles.bottom}>
        {restaurant && (
          <Text style={styles.restaurantName} numberOfLines={1}>{restaurant.name}</Text>
        )}
        <Text style={styles.eventTitle} numberOfLines={2}>{event.title}</Text>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="calendar-outline" size={12} color={c.goldLight} />
            <Text style={styles.metaText}>{formatEventDate(event.date)}</Text>
          </View>
          {event.price !== undefined && (
            <View style={styles.metaItem}>
              <Ionicons name="ticket-outline" size={12} color={c.textMuted} />
              <Text style={styles.metaPriceText}>${event.price} / person</Text>
            </View>
          )}
        </View>

        <Pressable
          onPress={handleBook}
          style={({ pressed }) => [styles.bookBtn, pressed && { opacity: 0.8 }]}
        >
          <Ionicons name="calendar" size={14} color={c.bgBase} />
          <Text style={styles.bookBtnText}>Reserve a spot</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
