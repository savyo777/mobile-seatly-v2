import type { AssistantResponseType } from '@cenaiva/assistant';
import { assistantReducer, initialState } from '@/lib/cenaiva/state/assistantStore';

function response(patch: Partial<AssistantResponseType>): AssistantResponseType {
  return {
    conversation_id: 'conv-1',
    spoken_text: 'ok',
    intent: 'general_question' as AssistantResponseType['intent'],
    step: 'greeting' as AssistantResponseType['step'],
    next_expected_input: 'none' as AssistantResponseType['next_expected_input'],
    ui_actions: [],
    booking: null,
    map: null,
    filters: null,
    ...patch,
  };
}

describe('assistantReducer', () => {
  it('opens assistant with the map visible', () => {
    const next = assistantReducer(initialState, { type: 'OPEN' });
    expect(next.isOpen).toBe(true);
    expect(next.map.visible).toBe(true);
  });

  it('preselects a restaurant, highlights it, and opens the map', () => {
    const next = assistantReducer(initialState, {
      type: 'PRESELECT_RESTAURANT',
      restaurant_id: 'r1',
      restaurant_name: 'La Piazza',
    });

    expect(next.isOpen).toBe(true);
    expect(next.map.visible).toBe(true);
    expect(next.map.highlighted_restaurant_id).toBe('r1');
    expect(next.booking.restaurant_id).toBe('r1');
    expect(next.booking.restaurant_name).toBe('La Piazza');
  });

  it('ignores null booking fields when applying a response', () => {
    const state = {
      ...initialState,
      booking: {
        ...initialState.booking,
        party_size: 4,
        date: '2026-05-02',
        time: '19:00',
      },
    };

    const next = assistantReducer(
      state,
      {
        type: 'APPLY_RESPONSE',
        response: response({
          booking: { party_size: null, date: null, time: null },
        }),
      },
    );

    expect(next.booking.party_size).toBe(4);
    expect(next.booking.date).toBe('2026-05-02');
    expect(next.booking.time).toBe('19:00');
  });

  it('moves show_confirmation to offering_preorder', () => {
    const next = assistantReducer(initialState, {
      type: 'APPLY_RESPONSE',
      response: response({
        ui_actions: [{ type: 'show_confirmation', confirmation_code: 'ABC123' }],
      }),
    });

    expect(next.booking.status).toBe('offering_preorder');
    expect(next.booking.confirmation_code).toBe('ABC123');
    expect(next.customerAccepted).toBe(true);
  });

  it('forces offering_preorder when a reservation id appears', () => {
    const next = assistantReducer(initialState, {
      type: 'APPLY_RESPONSE',
      response: response({
        booking: { reservation_id: 'res-1', status: 'confirmed' },
      }),
    });

    expect(next.booking.status).toBe('offering_preorder');
    expect(next.booking.reservation_id).toBe('res-1');
  });

  it('confirm_booking moves status to confirming', () => {
    const next = assistantReducer(initialState, { type: 'confirm_booking' });
    expect(next.booking.status).toBe('confirming');
  });

  it('select_time_slot preserves restaurant/date/party', () => {
    const state = {
      ...initialState,
      booking: {
        ...initialState.booking,
        restaurant_id: 'r1',
        date: '2026-05-02',
        party_size: 2,
      },
    };

    const next = assistantReducer(state, {
      type: 'select_time_slot',
      slot_iso: '2026-05-02T23:00:00.000Z',
      shift_id: 'shift-1',
    });

    expect(next.booking.restaurant_id).toBe('r1');
    expect(next.booking.date).toBe('2026-05-02');
    expect(next.booking.party_size).toBe(2);
    expect(next.booking.slot_iso).toBe('2026-05-02T23:00:00.000Z');
    expect(next.booking.shift_id).toBe('shift-1');
  });

  it('start_booking keeps existing fields when no restaurant was selected yet', () => {
    const state = {
      ...initialState,
      booking: {
        ...initialState.booking,
        party_size: 2,
        date: '2026-05-02',
        time: '19:00',
      },
    };

    const next = assistantReducer(state, { type: 'start_booking', restaurant_id: 'r1' });

    expect(next.booking.restaurant_id).toBe('r1');
    expect(next.booking.party_size).toBe(2);
    expect(next.booking.date).toBe('2026-05-02');
    expect(next.booking.time).toBe('19:00');
  });

  it('add_menu_item and remove_menu_item update quantity and subtotal', () => {
    const added = assistantReducer(initialState, {
      type: 'add_menu_item',
      menu_item_id: 'm1',
      name: 'Pasta',
      unit_price: 12.5,
    });
    const addedAgain = assistantReducer(added, {
      type: 'add_menu_item',
      menu_item_id: 'm1',
      name: 'Pasta',
      unit_price: 12.5,
    });
    const removed = assistantReducer(addedAgain, { type: 'remove_menu_item', menu_item_id: 'm1' });

    expect(addedAgain.booking.cart).toEqual([
      { menu_item_id: 'm1', name: 'Pasta', qty: 2, unit_price: 12.5, note: null },
    ]);
    expect(addedAgain.booking.cart_subtotal).toBe(25);
    expect(removed.booking.cart[0].qty).toBe(1);
    expect(removed.booking.cart_subtotal).toBe(12.5);
  });

  it('updates map markers and highlighted restaurant', () => {
    const withMarkers = assistantReducer(initialState, {
      type: 'update_map_markers',
      restaurant_ids: ['r1', 'r2'],
    });
    const highlighted = assistantReducer(withMarkers, {
      type: 'highlight_restaurant',
      restaurant_id: 'r2',
    });

    expect(highlighted.map.marker_restaurant_ids).toEqual(['r1', 'r2']);
    expect(highlighted.map.highlighted_restaurant_id).toBe('r2');
  });

  it('stores assistant discovery memory and derives booking-process memory', () => {
    const next = assistantReducer(initialState, {
      type: 'APPLY_RESPONSE',
      response: response({
        spoken_text: 'Pai is the closest strong match.',
        assistant_memory: {
          discovery: {
            transcript: "what's the closest restaurant to me",
            recommendation_mode: 'single',
            cuisine: null,
            cuisine_group: null,
            city: null,
            query: null,
            sort_by: 'distance',
            full_restaurant_ids: ['r1', 'r2', 'r3'],
            displayed_restaurant_ids: ['r1'],
            exhausted_restaurant_ids: ['r1'],
          },
          booking_process: null,
        },
        booking: {
          restaurant_id: 'r1',
          restaurant_name: 'Pai',
          party_size: 2,
          status: 'collecting_minimum_fields',
        },
      }),
    });

    expect(next.memory.discovery?.full_restaurant_ids).toEqual(['r1', 'r2', 'r3']);
    expect(next.memory.discovery?.displayed_restaurant_ids).toEqual(['r1']);
    expect(next.memory.booking_process).toMatchObject({
      phase: 'collecting_minimum_fields',
      restaurant_id: 'r1',
      restaurant_name: 'Pai',
      party_size: 2,
      last_prompt: 'Pai is the closest strong match.',
    });
  });
});
