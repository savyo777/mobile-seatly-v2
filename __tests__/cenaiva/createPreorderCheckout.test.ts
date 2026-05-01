import {
  assertCanCreatePreorderCheckout,
  buildPreorderOrderItemPayloads,
  buildPreorderOrderPayload,
  calculatePreorderTotals,
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
