import {
  assertCanCreatePreorderCheckout,
  buildPreorderOrderItemPayloads,
  buildPreorderOrderPayload,
  calculatePreorderTotals,
  createPreorderCheckoutFromBooking,
} from '@/lib/cenaiva/api/createPreorderCheckout';
import type { BookingState } from '@cenaiva/assistant';

function booking(patch: Partial<BookingState> = {}): BookingState {
  return {
    restaurant_id: 'r1',
    restaurant_name: 'La Piazza',
    party_size: 2,
    date: '2026-05-02',
    time: '19:00',
    shift_id: null,
    slot_iso: null,
    special_request: null,
    occasion: null,
    status: 'browsing_menu',
    confirmation_code: 'ABC123',
    reservation_id: 'res1',
    want_preorder: true,
    cart: [
      { menu_item_id: 'm1', name: 'Pasta', qty: 2, unit_price: 12.5, note: null },
      { menu_item_id: 'm2', name: 'Salad', qty: 1, unit_price: 9, note: null },
    ],
    cart_subtotal: 34,
    tip_choice: null,
    tip_amount: null,
    tip_percent: null,
    payment_split: null,
    pending_action: null,
    order_id: null,
    payment_status: 'idle',
    has_saved_card: false,
    ...patch,
  };
}

describe('createPreorderCheckout helpers', () => {
  it('requires restaurant, reservation, cart, and positive subtotal before checkout', () => {
    expect(() => assertCanCreatePreorderCheckout(booking())).not.toThrow();
    expect(() => assertCanCreatePreorderCheckout(booking({ restaurant_id: null }))).toThrow(/restaurant/i);
    expect(() => assertCanCreatePreorderCheckout(booking({ reservation_id: null }))).toThrow(/reservation/i);
    expect(() => assertCanCreatePreorderCheckout(booking({ cart: [] }))).toThrow(/menu item/i);
    expect(() => assertCanCreatePreorderCheckout(booking({ cart_subtotal: 0 }))).toThrow(/subtotal/i);
  });

  it('calculates tax and totals using the restaurant tax rate', () => {
    expect(calculatePreorderTotals(34, 0.13)).toEqual({
      subtotal: 34,
      taxAmount: 4.42,
      totalAmount: 38.42,
    });
  });

  it('builds the pending Cenaiva preorder order payload', () => {
    const payload = buildPreorderOrderPayload({
      booking: booking(),
      guestId: 'guest1',
      taxRate: 0.13,
      confirmationCode: 'CEN-1234',
    });

    expect(payload).toMatchObject({
      restaurant_id: 'r1',
      guest_id: 'guest1',
      reservation_id: 'res1',
      is_preorder: true,
      order_type: 'dine_in',
      status: 'pending',
      subtotal: 34,
      tax_amount: 4.42,
      total_amount: 38.42,
      confirmation_code: 'CEN-1234',
      source: 'cenaiva',
    });
  });

  it('builds order item rows from the assistant cart', () => {
    expect(buildPreorderOrderItemPayloads('order1', booking().cart)).toEqual([
      {
        order_id: 'order1',
        menu_item_id: 'm1',
        name: 'Pasta',
        quantity: 2,
        unit_price: 12.5,
        line_total: 25,
        status: 'pending',
      },
      {
        order_id: 'order1',
        menu_item_id: 'm2',
        name: 'Salad',
        quantity: 1,
        unit_price: 9,
        line_total: 9,
        status: 'pending',
      },
    ]);
  });
});

function createSupabaseMock(options: { itemInsertError?: string } = {}) {
  const inserted: Record<string, unknown[]> = {
    orders: [],
    order_items: [],
  };
  const deleted: Record<string, string[]> = {
    orders: [],
  };

  const makeBuilder = (table: string) => {
    const builder: Record<string, unknown> = { error: null };
    builder.select = jest.fn(() => builder);
    builder.eq = jest.fn((column: string, value: string) => {
      if (table === 'orders' && column === 'id') deleted.orders.push(value);
      return builder;
    });
    builder.order = jest.fn(() => builder);
    builder.delete = jest.fn(() => builder);
    builder.insert = jest.fn((payload: unknown) => {
      if (table === 'orders') inserted.orders.push(payload);
      if (table === 'order_items') {
        inserted.order_items.push(payload);
        if (options.itemInsertError) {
          builder.error = { message: options.itemInsertError };
        }
      }
      return builder;
    });
    builder.maybeSingle = jest.fn(async () => {
      if (table === 'user_profiles') return { data: { id: 'profile1' }, error: null };
      if (table === 'guests') return { data: { id: 'guest1' }, error: null };
      return { data: null, error: null };
    });
    builder.single = jest.fn(async () => {
      if (table === 'restaurants') {
        return { data: { slug: 'la-piazza', tax_rate: 0.13, currency: 'CAD' }, error: null };
      }
      if (table === 'orders') return { data: { id: 'order1' }, error: null };
      return { data: null, error: null };
    });
    return builder;
  };

  return {
    inserted,
    deleted,
    supabase: {
      auth: {
        getUser: jest.fn(async () => ({ data: { user: { id: 'auth1' } }, error: null })),
      },
      from: jest.fn((table: string) => makeBuilder(table)),
    },
  };
}

describe('createPreorderCheckoutFromBooking', () => {
  it('creates a pending preorder order and checkout result without charging the user', async () => {
    const { supabase, inserted } = createSupabaseMock();

    const result = await createPreorderCheckoutFromBooking(booking(), supabase as never);

    expect(result).toEqual({
      orderId: 'order1',
      restaurantSlug: 'la-piazza',
      subtotal: 34,
      taxAmount: 4.42,
      totalAmount: 38.42,
    });
    expect(inserted.orders[0]).toMatchObject({
      restaurant_id: 'r1',
      guest_id: 'guest1',
      reservation_id: 'res1',
      is_preorder: true,
      status: 'pending',
      subtotal: 34,
      tax_amount: 4.42,
      total_amount: 38.42,
      source: 'cenaiva',
    });
    expect(inserted.orders[0]).not.toMatchObject({ status: 'paid' });
    expect(inserted.order_items[0]).toEqual([
      expect.objectContaining({ order_id: 'order1', menu_item_id: 'm1', quantity: 2 }),
      expect.objectContaining({ order_id: 'order1', menu_item_id: 'm2', quantity: 1 }),
    ]);
  });

  it('rolls back the pending preorder order when item insertion fails', async () => {
    const { supabase, deleted } = createSupabaseMock({ itemInsertError: 'item insert failed' });

    await expect(createPreorderCheckoutFromBooking(booking(), supabase as never)).rejects.toThrow('item insert failed');
    expect(deleted.orders).toContain('order1');
  });
});
