import type { RealtimeChannel } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase/client';

type Entry = {
  channel: RealtimeChannel;
  callbacks: Set<() => void>;
};

const entries = new Map<string, Entry>();

/**
 * Subscribe to notifications inserts/updates for one user_profile. Multiple
 * consumers share a single channel per userProfileId.
 */
export function subscribeToNotifications(
  userProfileId: string,
  callback: () => void,
): () => void {
  if (!userProfileId) return () => undefined;
  const supabase = getSupabase();
  if (!supabase) return () => undefined;

  let entry = entries.get(userProfileId);
  if (!entry) {
    const channel = supabase
      .channel(`notifications:${userProfileId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userProfileId}`,
        },
        () => {
          const current = entries.get(userProfileId);
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
    entries.set(userProfileId, entry);
  } else {
    entry.callbacks.add(callback);
  }

  return () => {
    const current = entries.get(userProfileId);
    if (!current) return;
    current.callbacks.delete(callback);
    if (current.callbacks.size === 0) {
      void supabase.removeChannel(current.channel);
      entries.delete(userProfileId);
    }
  };
}
