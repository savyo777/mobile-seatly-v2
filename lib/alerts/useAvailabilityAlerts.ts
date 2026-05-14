import { useCallback, useEffect, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { cancelAvailabilityAlert } from './cancelAvailabilityAlert';

export type AvailabilityAlert = {
  id: string;
  restaurantId: string | null;
  restaurantName: string | null;
  restaurantSlug: string | null;
  eventId: string | null;
  eventName: string | null;
  eventDate: string | null;
  date: string | null;
  partySize: number;
  preferredTime: string | null;
  windowMinutes: number;
  status: string;
  createdAt: string;
};

type RawRow = {
  id: string;
  restaurant_id: string | null;
  event_id: string | null;
  date: string | null;
  party_size: number | null;
  preferred_time: string | null;
  window_minutes: number | null;
  status: string | null;
  created_at: string;
  restaurants: { id?: string; name?: string; slug?: string } | null;
  events: { id?: string; name?: string; date?: string } | null;
};

function mapRow(row: RawRow): AvailabilityAlert {
  return {
    id: row.id,
    restaurantId: row.restaurant_id,
    restaurantName: row.restaurants?.name ?? null,
    restaurantSlug: row.restaurants?.slug ?? null,
    eventId: row.event_id,
    eventName: row.events?.name ?? null,
    eventDate: row.events?.date ?? null,
    date: row.date,
    partySize: typeof row.party_size === 'number' ? row.party_size : 0,
    preferredTime: row.preferred_time,
    windowMinutes: typeof row.window_minutes === 'number' ? row.window_minutes : 120,
    status: row.status ?? 'active',
    createdAt: row.created_at,
  };
}

export function useAvailabilityAlerts(userProfileId: string | null | undefined): {
  alerts: AvailabilityAlert[];
  loading: boolean;
  refresh: () => void;
  cancel: (id: string) => Promise<void>;
} {
  const [alerts, setAlerts] = useState<AvailabilityAlert[]>([]);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((n) => n + 1), []);

  useEffect(() => {
    if (!userProfileId) {
      setAlerts([]);
      return;
    }
    if (isDemoModeEnabled()) {
      // Demo mode: no real rows, but render empty quietly.
      setAlerts([]);
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;

    let cancelled = false;
    setLoading(true);
    void supabase
      .from('availability_alerts')
      .select(
        'id, restaurant_id, event_id, date, party_size, preferred_time, window_minutes, status, created_at, restaurants(id,name,slug), events(id,name,date)',
      )
      .eq('user_id', userProfileId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (cancelled) return;
        const rows = (data as unknown as RawRow[] | null) ?? [];
        setAlerts(rows.map(mapRow));
        setLoading(false);
      });

    let channel: RealtimeChannel | null = null;
    channel = supabase
      .channel(`availability_alerts:${userProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'availability_alerts',
          filter: `user_id=eq.${userProfileId}`,
        },
        () => refresh(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userProfileId, tick, refresh]);

  const cancel = useCallback(
    async (id: string) => {
      setAlerts((prev) => prev.filter((a) => a.id !== id));
      const ok = await cancelAvailabilityAlert(id);
      if (!ok) refresh();
    },
    [refresh],
  );

  return { alerts, loading, refresh, cancel };
}
