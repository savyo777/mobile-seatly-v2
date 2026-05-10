import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

type Entry = {
  channel: RealtimeChannel;
  callbacks: Set<() => void>;
};

const entries = new Map<string, Entry>();

/**
 * Subscribe to reservation changes for one restaurant. Multiple consumers
 * share a single realtime channel per restaurantId — when the last consumer
 * unsubscribes, the channel is removed.
 */
export function subscribeToAvailability(
  restaurantId: string,
  callback: () => void,
): () => void {
  if (!restaurantId) return () => undefined;
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  let entry = entries.get(restaurantId);
  if (!entry) {
    const channel = supabase
      .channel(`availability:${restaurantId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          const current = entries.get(restaurantId);
          current?.callbacks.forEach((cb) => {
            try {
              cb();
            } catch {
              // ignore consumer errors
            }
          });
        },
      )
      .subscribe();
    entry = { channel, callbacks: new Set([callback]) };
    entries.set(restaurantId, entry);
  } else {
    entry.callbacks.add(callback);
  }

  return () => {
    const current = entries.get(restaurantId);
    if (!current) return;
    current.callbacks.delete(callback);
    if (current.callbacks.size === 0) {
      void supabase.removeChannel(current.channel);
      entries.delete(restaurantId);
    }
  };
}
