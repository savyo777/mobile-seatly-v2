import {
  buildLocalAvailabilityResponse,
  parseLocalDate,
  parseLocalPartySize,
  parseLocalTime,
  planLocalBookingTurn,
  type CenaivaAvailabilityResponse,
} from '@/lib/cenaiva/localBookingCollector';
import type { BookingState } from '@cenaiva/assistant';

function booking(patch: Partial<BookingState> = {}): BookingState {
  return {
    restaurant_id: null,
    restaurant_name: null,
    party_size: null,
    date: null,
    time: null,
    shift_id: null,
    slot_iso: null,
    special_request: null,
    occasion: null,
    status: 'idle',
    confirmation_code: null,
    reservation_id: null,
    want_preorder: null,
    order_id: null,
    payment_status: 'idle',
    tip_choice: null,
    tip_amount: null,
    tip_percent: null,
    payment_split: null,
    pending_action: null,
    cart_subtotal: 0,
    cart: [],
    has_saved_card: false,
    ...patch,
  };
}

describe('local Hey Cenaiva booking collector', () => {
  it('parses party, date, and time without turning party size into a time', () => {
    expect(parseLocalPartySize('two people')).toBe(2);
    expect(parseLocalTime('two people', { allowBareTime: true })).toBeNull();
    expect(parseLocalTime('two', { allowBareTime: false })).toBeNull();
    expect(parseLocalTime('around 7')).toBe('19:00');
    expect(parseLocalDate('May 10', 'America/Toronto')).toMatch(/^\d{4}-05-10$/);
  });

  it('keeps off-topic prompts out of local booking collection', () => {
    const decision = planLocalBookingTurn({
      transcript: 'Am I gay?',
      booking: booking(),
      conversationId: null,
      timezone: 'America/Toronto',
    });

    expect(decision.kind).toBe('pass');
  });

  it('collects party size locally after a restaurant is selected', () => {
    const decision = planLocalBookingTurn({
      transcript: 'two',
      booking: booking({
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        status: 'collecting_minimum_fields',
      }),
      conversationId: null,
      timezone: 'America/Toronto',
    });

    expect(decision.kind).toBe('local_response');
    if (decision.kind !== 'local_response') return;
    expect(decision.response.booking?.party_size).toBe(2);
    expect(decision.response.booking?.time).toBeUndefined();
    expect(decision.response.spoken_text).toBe('What date and time should I book?');
  });

  it('checks availability only after restaurant, party size, date, and time are known', () => {
    const decision = planLocalBookingTurn({
      transcript: 'tomorrow at 7 pm',
      booking: booking({
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        party_size: 2,
        status: 'collecting_minimum_fields',
      }),
      conversationId: null,
      timezone: 'America/Toronto',
    });

    expect(decision.kind).toBe('check_availability');
    if (decision.kind !== 'check_availability') return;
    expect(decision.request.mode).toBe('exact');
    expect(decision.request.time).toBe('19:00');
    expect(decision.filler).toBe('One moment please.');
  });

  it('supports flexible availability wording', () => {
    const anyDay = planLocalBookingTurn({
      transcript: 'any day at 2 pm',
      booking: booking({
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        party_size: 2,
      }),
      conversationId: null,
      timezone: 'America/Toronto',
    });
    expect(anyDay.kind).toBe('check_availability');
    if (anyDay.kind === 'check_availability') {
      expect(anyDay.request.mode).toBe('any_day_at_time');
      expect(anyDay.request.time).toBe('14:00');
    }

    const friday = planLocalBookingTurn({
      transcript: 'any time Friday',
      booking: booking({
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        party_size: 2,
      }),
      conversationId: null,
      timezone: 'America/Toronto',
    });
    expect(friday.kind).toBe('check_availability');
    if (friday.kind === 'check_availability') {
      expect(friday.request.mode).toBe('weekday_any_time');
      expect(friday.request.split_at).toBe('14:30');
    }
  });

  it('turns available slots into mandatory confirmation, not a completed booking', () => {
    const result: CenaivaAvailabilityResponse = {
      status: 'available',
      selected_slot: {
        shift_id: 'shift-1',
        shift_name: 'Dinner',
        date: '2026-01-26',
        date_time: '2026-01-26T19:00:00.000Z',
        display_time: '2:00 PM',
      },
      alternatives: [],
    };

    const { response, pendingOptions } = buildLocalAvailabilityResponse({
      conversationId: null,
      request: {
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        party_size: 2,
        mode: 'exact',
        date: '2026-01-26',
        time: '14:00',
      },
      result,
    });

    expect(pendingOptions).toEqual([]);
    expect(response.booking?.status).toBe('confirming');
    expect(response.ui_actions.map((action) => action.type)).toEqual([
      'set_booking_field',
      'set_booking_field',
      'select_time_slot',
      'confirm_booking',
    ]);
    expect(response.spoken_text).toMatch(/Should I book it\?$/);
  });

  it('keeps unavailable alternatives pending for first or second selection', () => {
    const result: CenaivaAvailabilityResponse = {
      status: 'unavailable',
      alternatives: [
        {
          shift_id: 'shift-1',
          date: '2026-01-26',
          date_time: '2026-01-26T18:30:00.000Z',
          display_time: '1:30 PM',
        },
        {
          shift_id: 'shift-1',
          date: '2026-01-27',
          date_time: '2026-01-27T19:00:00.000Z',
          display_time: '2:00 PM',
        },
      ],
    };

    const { response, pendingOptions } = buildLocalAvailabilityResponse({
      conversationId: null,
      request: {
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        party_size: 2,
        mode: 'exact',
        date: '2026-01-26',
        time: '14:00',
      },
      result,
    });

    expect(response.spoken_text).toContain('not available');
    expect(pendingOptions).toHaveLength(2);

    const selection = planLocalBookingTurn({
      transcript: 'second one',
      booking: booking({
        restaurant_id: 'rest-1',
        restaurant_name: 'Echoria',
        party_size: 2,
      }),
      conversationId: null,
      pendingOptions,
    });
    expect(selection.kind).toBe('local_response');
    if (selection.kind === 'local_response') {
      expect(selection.response.booking?.slot_iso).toBe('2026-01-27T19:00:00.000Z');
      expect(selection.response.booking?.status).toBe('confirming');
    }
  });
});
