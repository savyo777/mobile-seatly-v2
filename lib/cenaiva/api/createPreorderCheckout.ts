import type { BookingState, CartItem } from '@cenaiva/assistant';
import { getSupabase } from '@/lib/supabase/client';

type SupabaseLike = NonNullable<ReturnType<typeof getSupabase>>;

export type PreorderCheckoutResult = {
  orderId: string;
  restaurantSlug: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
};

export type PreorderOrderPayload = {
  restaurant_id: string;
  guest_id: string;
  reservation_id: string;
  is_preorder: true;
  order_type: 'dine_in';
  status: 'pending';
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  confirmation_code: string;
  source: 'cenaiva';
};

export type PreorderOrderItemPayload = {
  order_id: string;
  menu_item_id: string;
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  status: 'pending';
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculatePreorderTotals(subtotal: number, taxRate: number | string | null | undefined) {
  const parsedTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
  const effectiveTaxRate = Number.isFinite(parsedTaxRate) ? Number(parsedTaxRate) : 0.13;
  const taxAmount = roundMoney(subtotal * effectiveTaxRate);
  return {
    subtotal: roundMoney(subtotal),
    taxAmount,
    totalAmount: roundMoney(subtotal + taxAmount),
  };
}

export function assertCanCreatePreorderCheckout(
  booking: Pick<BookingState, 'restaurant_id' | 'reservation_id' | 'cart' | 'cart_subtotal'>,
) {
  if (!booking.restaurant_id) throw new Error('Missing restaurant for preorder checkout.');
  if (!booking.reservation_id) throw new Error('Missing reservation for preorder checkout.');
  if (!booking.cart.length) throw new Error('Add at least one menu item before checkout.');
  if (booking.cart_subtotal <= 0) throw new Error('Preorder subtotal must be greater than zero.');
}

export function buildPreorderOrderPayload(input: {
  booking: Pick<BookingState, 'restaurant_id' | 'reservation_id' | 'cart_subtotal'>;
  guestId: string;
  taxRate: number | string | null | undefined;
  confirmationCode: string;
}): PreorderOrderPayload {
  if (!input.booking.restaurant_id || !input.booking.reservation_id) {
    throw new Error('Missing booking identifiers.');
  }
  const totals = calculatePreorderTotals(input.booking.cart_subtotal, input.taxRate);
  return {
    restaurant_id: input.booking.restaurant_id,
    guest_id: input.guestId,
    reservation_id: input.booking.reservation_id,
    is_preorder: true,
    order_type: 'dine_in',
    status: 'pending',
    subtotal: totals.subtotal,
    tax_amount: totals.taxAmount,
    total_amount: totals.totalAmount,
    confirmation_code: input.confirmationCode,
    source: 'cenaiva',
  };
}

export function buildPreorderOrderItemPayloads(orderId: string, cart: CartItem[]): PreorderOrderItemPayload[] {
  return cart.map((item) => ({
    order_id: orderId,
    menu_item_id: item.menu_item_id,
    name: item.name,
    quantity: item.qty,
    unit_price: item.unit_price,
    line_total: roundMoney(item.unit_price * item.qty),
    status: 'pending',
  }));
}

function createConfirmationCode() {
  return `CEN-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export async function createPreorderCheckoutFromBooking(
  booking: BookingState,
  supabase: SupabaseLike | null = getSupabase(),
): Promise<PreorderCheckoutResult> {
  assertCanCreatePreorderCheckout(booking);
  if (!supabase) throw new Error('Supabase is not configured.');

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authUserId = userData.user?.id;
  if (userError || !authUserId) throw new Error(userError?.message ?? 'Please sign in to continue.');

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();
  if (profileError || !profile?.id) {
    throw new Error(profileError?.message ?? 'Missing customer profile.');
  }

  const { data: rest, error: restError } = await supabase
    .from('restaurants')
    .select('slug,tax_rate,currency')
    .eq('id', booking.restaurant_id)
    .single();
  if (restError || !rest?.slug) {
    throw new Error(restError?.message ?? 'Missing restaurant checkout details.');
  }

  const { data: guest, error: guestError } = await supabase
    .from('guests')
    .select('id')
    .eq('user_profile_id', profile.id)
    .eq('restaurant_id', booking.restaurant_id)
    .maybeSingle();
  if (guestError || !guest?.id) {
    throw new Error(guestError?.message ?? 'Guest record missing for this reservation.');
  }

  const orderPayload = buildPreorderOrderPayload({
    booking,
    guestId: guest.id,
    taxRate: rest.tax_rate,
    confirmationCode: createConfirmationCode(),
  });
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert(orderPayload)
    .select('id')
    .single();
  if (orderError || !order?.id) {
    throw new Error(orderError?.message ?? 'Could not create preorder checkout.');
  }

  const itemRows = buildPreorderOrderItemPayloads(order.id, booking.cart);
  const { error: itemError } = await supabase.from('order_items').insert(itemRows);
  if (itemError) {
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error(itemError.message);
  }

  const totals = calculatePreorderTotals(booking.cart_subtotal, rest.tax_rate);
  return {
    orderId: order.id,
    restaurantSlug: rest.slug,
    ...totals,
  };
}
