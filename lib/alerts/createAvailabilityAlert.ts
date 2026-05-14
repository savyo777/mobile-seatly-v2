import { getSupabase } from '@/lib/supabase/client';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

export type CreateAvailabilityAlertResult = {
  ok: boolean;
  error?: string;
  message?: string;
  suggested_next_date?: string | null;
  alert_id?: string;
};

type RestaurantInput = {
  variant: 'restaurant';
  restaurantId: string;
  date: string;            // YYYY-MM-DD
  partySize: number;
  preferredTime: string;   // 24h "HH:MM"
  windowMinutes?: number;  // default 120
};

type EventInput = {
  variant: 'event';
  eventId: string;
  partySize: number;
};

export type CreateAvailabilityAlertInput = RestaurantInput | EventInput;

export async function createAvailabilityAlert(
  input: CreateAvailabilityAlertInput,
): Promise<CreateAvailabilityAlertResult> {
  if (isDemoModeEnabled()) {
    return {
      ok: true,
      alert_id: `demo-${Math.random().toString(36).slice(2, 10)}`,
    };
  }

  const supabase = getSupabase();
  if (!supabase) return { ok: false, error: 'not_configured' };

  const args =
    input.variant === 'restaurant'
      ? {
          p_restaurant_id: input.restaurantId,
          p_event_id: null,
          p_date: input.date,
          p_party_size: input.partySize,
          p_preferred_time: input.preferredTime,
          p_window_minutes: input.windowMinutes ?? 120,
        }
      : {
          p_restaurant_id: null,
          p_event_id: input.eventId,
          p_date: null,
          p_party_size: input.partySize,
          p_preferred_time: null,
          p_window_minutes: 120,
        };

  const { data, error } = await supabase.rpc('create_availability_alert', args);
  if (error) return { ok: false, error: error.message };
  return (data ?? { ok: false, error: 'empty_response' }) as CreateAvailabilityAlertResult;
}
