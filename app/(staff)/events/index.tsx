import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { OwnerScreen } from '@/components/owner/OwnerScreen';
import { GlassCard } from '@/components/owner/GlassCard';
import { SubpageHeader } from '@/components/owner/SubpageHeader';
import { OWNER_EVENTS as DEMO_OWNER_EVENTS } from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { fetchUpcomingEvents, type EventRow } from '@/lib/events/getEvents';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { createStyles } from '@/lib/theme';
import { ownerColorsFromPalette, ownerRadii } from '@/lib/theme/ownerTheme';
import { friendlyError } from '@/lib/errors/friendlyError';

const INITIAL_OWNER_EVENTS: typeof DEMO_OWNER_EVENTS = isDemoModeEnabled() ? DEMO_OWNER_EVENTS : [];

function formatEventDateLabel(row: EventRow): string {
  if (!row.date) return '';
  const d = new Date(row.date + (row.start_time ? `T${row.start_time}` : 'T00:00:00'));
  if (Number.isNaN(d.getTime())) return row.date;
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function mapEventRowToOwnerEvent(row: EventRow): (typeof DEMO_OWNER_EVENTS)[number] {
  const sold = row.tickets_sold ?? 0;
  const capacity = row.capacity ?? 0;
  const status: (typeof DEMO_OWNER_EVENTS)[number]['status'] =
    !row.is_active ? 'draft' : capacity > 0 && sold >= capacity ? 'sold_out' : 'live';
  return {
    id: row.id,
    title: row.name,
    dateLabel: formatEventDateLabel(row),
    rsvp: sold,
    status,
  };
}

function statusKey(s: (typeof DEMO_OWNER_EVENTS)[0]['status']) {
  if (s === 'live') return 'owner.eventStatusLive';
  if (s === 'sold_out') return 'owner.eventStatusSoldOut';
  return 'owner.eventStatusDraft';
}

export default function OwnerEventsScreen() {
  const { t } = useTranslation();
  const styles = useStyles();
  const [events, setEvents] = useState<typeof DEMO_OWNER_EVENTS>(INITIAL_OWNER_EVENTS);
  const { restaurantIds } = useOwnerScope();
  const restaurantIdsKey = restaurantIds.join('|');

  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (isDemoModeEnabled()) return;
    if (restaurantIds.length === 0) {
      setEvents([]);
      setLoadError(null);
      return;
    }
    let active = true;
    setLoadError(null);
    void (async () => {
      try {
        const rows = await fetchUpcomingEvents({ restaurantIds, includePrivate: true });
        if (!active) return;
        setEvents(rows.map(mapEventRowToOwnerEvent));
      } catch (err) {
        if (!active) return;
        setLoadError(friendlyError(err, "Couldn't load events."));
      }
    })();
    return () => {
      active = false;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantIdsKey, reloadKey]);

  return (
    <OwnerScreen
      header={
        <SubpageHeader
          title={t('owner.eventsTitle')}
          subtitle={t('owner.eventsSubtitle')}
          fallbackTab="more"
        />
      }
    >
      {loadError && events.length === 0 ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>{loadError}</Text>
          <Pressable
            onPress={() => {
              setLoadError(null);
              setReloadKey((k) => k + 1);
            }}
            style={styles.retryBtn}
            accessibilityRole="button"
            accessibilityLabel="Retry loading events"
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : null}
      {events.map((ev, i) => (
        <Animated.View key={ev.id} entering={FadeInDown.delay(i * 40)}>
          <GlassCard style={styles.card}>
            <View style={styles.top}>
              <Text style={styles.eventTitle}>{ev.title}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{t(statusKey(ev.status))}</Text>
              </View>
            </View>
            <Text style={styles.date}>{ev.dateLabel}</Text>
            <Text style={styles.rsvp}>{t('owner.eventRsvp', { count: ev.rsvp })}</Text>
          </GlassCard>
        </Animated.View>
      ))}
      <View style={{ height: 24 }} />
    </OwnerScreen>
  );
}

const useStyles = createStyles((c) => {
  const ownerColors = ownerColorsFromPalette(c);
  return {
  card: {
    padding: 16,
    marginBottom: 10,
  },
  errorBlock: {
    alignItems: 'center',
    paddingVertical: 32,
    gap: 12,
  },
  errorText: {
    fontSize: 14,
    color: ownerColors.textMuted,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryBtn: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: ownerRadii.xl,
    borderWidth: 1,
    borderColor: ownerColors.gold,
  },
  retryText: {
    color: ownerColors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 8,
  },
  eventTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: ownerColors.text,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ownerRadii.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: ownerColors.border,
    backgroundColor: ownerColors.bgGlass,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: ownerColors.textSecondary,
    letterSpacing: 0.4,
  },
  date: {
    fontSize: 14,
    fontWeight: '600',
    color: ownerColors.gold,
  },
  rsvp: {
    fontSize: 14,
    color: ownerColors.textMuted,
    marginTop: 6,
  },
  };
});
