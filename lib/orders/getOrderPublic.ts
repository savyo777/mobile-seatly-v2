import { getSupabase } from '@/lib/supabase/client';

export type PublicOrderItem = {
  id: string;
  name: string | null;
  quantity: number;
  unit_price: number | null;
  total_price: number | null;
  notes: string | null;
};

export type PublicOrder = {
  id: string;
  restaurant_id: string;
  status: string | null;
  subtotal: number | null;
  tax_amount: number | null;
  tip_amount: number | null;
  total_amount: number | null;
  paid_at: string | null;
  created_at: string | null;
  items: PublicOrderItem[];
};

export type PublicOrderResponse = {
  order: PublicOrder | null;
  error?: string;
};

export async function fetchOrderPublic(code: string): Promise<PublicOrderResponse> {
  const supabase = getSupabase();
  const trimmed = code?.trim();
  if (!supabase || !trimmed) return { order: null };

  const { data, error } = await supabase.functions.invoke('get-order-public', {
    body: { code: trimmed },
  });
  if (error) return { order: null, error: error.message };
  return (data ?? { order: null }) as PublicOrderResponse;
}
