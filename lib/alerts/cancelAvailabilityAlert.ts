import { getSupabase } from '@/lib/supabase/client';
import { isDemoModeEnabled } from '@/lib/config/demoMode';

export async function cancelAvailabilityAlert(alertId: string): Promise<boolean> {
  if (!alertId) return false;
  if (isDemoModeEnabled()) return true;
  const supabase = getSupabase();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc('cancel_availability_alert', { p_id: alertId });
  if (error) return false;
  return data === true;
}
