import React, {
  createContext,
  useContext,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type {
  AssistantResponseType,
  AssistantMemory,
  BookingState,
  CartItem,
  FiltersDelta,
  MapState,
  UIActionType,
  VoiceStatus,
} from '@cenaiva/assistant';

export interface AssistantState {
  isOpen: boolean;
  voiceStatus: VoiceStatus;
  lastSpokenText: string;
  conversationId: string | null;
  booking: BookingState;
  map: MapState;
  filters: FiltersDelta;
  memory: AssistantMemory;
  availabilityOpen: boolean;
  showExitX: boolean;
  customerAccepted: boolean;
}

const initialBooking: BookingState = {
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
};

const initialMap: MapState = {
  visible: false,
  center: null,
  zoom: 13,
  marker_restaurant_ids: [],
  highlighted_restaurant_id: null,
};

const initialMemory: AssistantMemory = {
  discovery: null,
  booking_process: null,
};

export const initialState: AssistantState = {
  isOpen: false,
  voiceStatus: 'idle',
  lastSpokenText: '',
  conversationId: null,
  booking: initialBooking,
  map: initialMap,
  filters: {},
  memory: initialMemory,
  availabilityOpen: false,
  showExitX: false,
  customerAccepted: false,
};

type LocalAction =
  | { type: 'OPEN' }
  | { type: 'CLOSE' }
  | { type: 'SET_VOICE_STATUS'; status: VoiceStatus }
  | { type: 'SET_LAST_SPOKEN_TEXT'; text: string }
  | { type: 'SET_CONVERSATION_ID'; id: string }
  | { type: 'APPLY_RESPONSE'; response: AssistantResponseType }
  | { type: 'RESET_BOOKING' }
  | { type: 'SET_AVAILABILITY_OPEN'; open: boolean }
  | { type: 'SET_HAS_SAVED_CARD'; value: boolean }
  | { type: 'SET_BOOKING_STATUS'; status: BookingState['status'] }
  | { type: 'RESET_ASSISTANT_CONTEXT' }
  | { type: 'PRESELECT_RESTAURANT'; restaurant_id: string; restaurant_name: string };

export type AssistantAction = UIActionType | LocalAction;

function computeCartSubtotal(cart: CartItem[]): number {
  return Math.round(cart.reduce((sum, item) => sum + item.unit_price * item.qty, 0) * 100) / 100;
}

function beginBookingForRestaurant(
  booking: BookingState,
  restaurantId: string,
  restaurantName?: string,
): BookingState {
  const sameRestaurant = booking.restaurant_id === restaurantId;
  const preserveCollectedFields = sameRestaurant || booking.restaurant_id == null;

  if (preserveCollectedFields) {
    return {
      ...booking,
      restaurant_id: restaurantId,
      ...(restaurantName != null ? { restaurant_name: restaurantName } : {}),
      status: 'collecting_minimum_fields',
    };
  }

  return {
    ...initialBooking,
    has_saved_card: booking.has_saved_card,
    restaurant_id: restaurantId,
    ...(restaurantName != null ? { restaurant_name: restaurantName } : {}),
    status: 'collecting_minimum_fields',
  };
}

function mergeAssistantMemory(
  current: AssistantMemory,
  incoming: AssistantResponseType['assistant_memory'],
): AssistantMemory {
  if (!incoming) return current;
  return {
    discovery: incoming.discovery ?? current.discovery,
    booking_process: incoming.booking_process ?? current.booking_process,
  };
}

function bookingProcessMemoryFromState(
  booking: BookingState,
  lastPrompt: string | null,
): NonNullable<AssistantMemory['booking_process']> {
  return {
    phase: booking.status,
    restaurant_id: booking.restaurant_id,
    restaurant_name: booking.restaurant_name,
    party_size: booking.party_size,
    date: booking.date,
    time: booking.time,
    shift_id: booking.shift_id,
    slot_iso: booking.slot_iso,
    reservation_id: booking.reservation_id,
    confirmation_code: booking.confirmation_code,
    last_prompt: lastPrompt,
  };
}

function applyUIAction(state: AssistantState, action: UIActionType): AssistantState {
  switch (action.type) {
    case 'open_assistant':
      return { ...state, isOpen: true, map: { ...state.map, visible: true } };

    case 'close_assistant':
      return { ...state, isOpen: false, voiceStatus: 'idle' };

    case 'show_map':
      return { ...state, map: { ...state.map, visible: true } };

    case 'update_map_center':
      return {
        ...state,
        map: {
          ...state.map,
          visible: true,
          center: { lat: action.lat, lng: action.lng },
          zoom: action.zoom ?? state.map.zoom,
        },
      };

    case 'update_map_markers':
      return {
        ...state,
        map: {
          ...state.map,
          marker_restaurant_ids: Array.isArray(action.restaurant_ids)
            ? action.restaurant_ids
            : state.map.marker_restaurant_ids,
          visible: true,
        },
      };

    case 'highlight_restaurant':
      return {
        ...state,
        map: { ...state.map, highlighted_restaurant_id: action.restaurant_id },
      };

    case 'show_restaurant_cards':
      return {
        ...state,
        map: {
          ...state.map,
          marker_restaurant_ids: Array.isArray(action.restaurant_ids)
            ? action.restaurant_ids
            : state.map.marker_restaurant_ids,
          visible: true,
        },
      };

    case 'open_restaurant_preview':
      return {
        ...state,
        map: { ...state.map, highlighted_restaurant_id: action.restaurant_id },
      };

    case 'set_filters':
      return state;

    case 'clear_filters':
      return { ...state, filters: {} };

    case 'start_booking':
      return {
        ...state,
        booking: beginBookingForRestaurant(state.booking, action.restaurant_id),
        availabilityOpen: false,
        showExitX: false,
        customerAccepted: false,
      };

    case 'set_booking_field':
      return {
        ...state,
        booking: { ...state.booking, [action.field]: action.value },
      };

    case 'load_availability':
      return {
        ...state,
        booking: { ...state.booking, status: 'loading_availability' },
        availabilityOpen: true,
      };

    case 'select_time_slot':
      return {
        ...state,
        booking: {
          ...state.booking,
          slot_iso: action.slot_iso,
          shift_id: action.shift_id,
          status: 'awaiting_time_selection',
        },
      };

    case 'confirm_booking':
      return {
        ...state,
        booking: { ...state.booking, status: 'confirming' },
      };

    case 'show_confirmation':
      return {
        ...state,
        booking: {
          ...state.booking,
          status: 'offering_preorder',
          confirmation_code: action.confirmation_code ?? state.booking.confirmation_code,
        },
        customerAccepted: true,
      };

    case 'show_post_booking_questions':
      return { ...state, booking: { ...state.booking, status: 'post_booking' } };

    case 'show_exit_x':
      return { ...state, showExitX: true };

    case 'toast':
    case 'navigate':
    case 'fallback_to_manual':
    case 'navigate_to_checkout':
      return state;

    case 'offer_preorder':
      return { ...state, booking: { ...state.booking, status: 'offering_preorder' } };

    case 'show_menu':
      return {
        ...state,
        booking: {
          ...state.booking,
          restaurant_id: action.restaurant_id ?? state.booking.restaurant_id,
          status: 'browsing_menu',
        },
      };

    case 'add_menu_item': {
      const existing = state.booking.cart.find((item) => item.menu_item_id === action.menu_item_id);
      const qty = action.qty ?? 1;
      const cart = existing
        ? state.booking.cart.map((item) =>
            item.menu_item_id === action.menu_item_id
              ? { ...item, qty: item.qty + qty }
              : item,
          )
        : [
            ...state.booking.cart,
            {
              menu_item_id: action.menu_item_id,
              name: action.name,
              qty,
              unit_price: action.unit_price,
              note: action.note ?? null,
            },
          ];
      return {
        ...state,
        booking: { ...state.booking, cart, cart_subtotal: computeCartSubtotal(cart) },
      };
    }

    case 'remove_menu_item': {
      const existing = state.booking.cart.find((item) => item.menu_item_id === action.menu_item_id);
      if (!existing) return state;
      const cart = existing.qty <= 1
        ? state.booking.cart.filter((item) => item.menu_item_id !== action.menu_item_id)
        : state.booking.cart.map((item) =>
            item.menu_item_id === action.menu_item_id ? { ...item, qty: item.qty - 1 } : item,
          );
      return {
        ...state,
        booking: { ...state.booking, cart, cart_subtotal: computeCartSubtotal(cart) },
      };
    }

    case 'clear_cart':
      return {
        ...state,
        booking: { ...state.booking, cart: [], cart_subtotal: 0 },
      };

    case 'set_tip_choice':
      return {
        ...state,
        booking: {
          ...state.booking,
          tip_choice: action.choice,
          status: action.choice === 'now' ? 'choosing_tip_amount' : 'choosing_tip_timing',
        },
      };

    case 'set_tip':
      return {
        ...state,
        booking: {
          ...state.booking,
          tip_amount: action.amount ?? null,
          tip_percent: action.percent ?? null,
          status: 'choosing_payment_split',
        },
      };

    case 'set_payment_split':
      return {
        ...state,
        booking: {
          ...state.booking,
          payment_split: action.choice,
          status: action.choice === 'single' ? 'charging' : state.booking.status,
        },
      };

    case 'show_payment_success':
      return {
        ...state,
        booking: { ...state.booking, status: 'paid', payment_status: 'paid' },
      };

    default:
      return state;
  }
}

export function assistantReducer(state: AssistantState, action: AssistantAction): AssistantState {
  const localAction = action as LocalAction;

  switch (localAction.type) {
    case 'OPEN':
      return { ...state, isOpen: true, map: { ...state.map, visible: true } };

    case 'CLOSE':
      return { ...initialState };

    case 'SET_VOICE_STATUS':
      if (state.voiceStatus === localAction.status) return state;
      return { ...state, voiceStatus: localAction.status };

    case 'SET_LAST_SPOKEN_TEXT':
      return { ...state, lastSpokenText: localAction.text };

    case 'SET_CONVERSATION_ID':
      return { ...state, conversationId: localAction.id };

    case 'SET_HAS_SAVED_CARD':
      return { ...state, booking: { ...state.booking, has_saved_card: localAction.value } };

    case 'SET_BOOKING_STATUS':
      return { ...state, booking: { ...state.booking, status: localAction.status } };

    case 'APPLY_RESPONSE': {
      const { response } = localAction;
      let next: AssistantState = { ...state, lastSpokenText: response.spoken_text };

      if (response.conversation_id) {
        next = { ...next, conversationId: response.conversation_id };
      }

      if (response.booking) {
        const bookingPatch = Object.fromEntries(
          Object.entries(response.booking).filter(([, value]) => value != null),
        ) as Partial<BookingState>;
        next = { ...next, booking: { ...next.booking, ...bookingPatch } };
      }

      if (response.map) {
        const mapPatch = { ...response.map };
        if (!Array.isArray(mapPatch.marker_restaurant_ids)) {
          mapPatch.marker_restaurant_ids = next.map.marker_restaurant_ids;
        }
        next = { ...next, map: { ...next.map, ...mapPatch } };
      }

      if (response.filters) {
        next = { ...next, filters: { ...next.filters, ...response.filters } };
      }

      next = {
        ...next,
        memory: mergeAssistantMemory(next.memory, response.assistant_memory),
      };

      for (const uiAction of response.ui_actions ?? []) {
        if (!uiAction || typeof (uiAction as { type?: unknown }).type !== 'string') continue;
        try {
          next = applyUIAction(next, uiAction);
        } catch {
          // Skip malformed backend actions without crashing the shell.
        }
      }

      if (
        next.booking.status === 'loading_availability' &&
        !/checking availability/i.test(response.spoken_text ?? '')
      ) {
        next = {
          ...next,
          availabilityOpen: false,
          booking: { ...next.booking, status: 'collecting_minimum_fields' },
        };
      }

      const wasNotBooked = !state.booking.reservation_id;
      const isNowBooked = !!next.booking.reservation_id;
      const alreadyPastPreorder: BookingState['status'][] = [
        'browsing_menu',
        'reviewing_cart',
        'choosing_tip_timing',
        'choosing_tip_amount',
        'choosing_payment_split',
        'charging',
        'paid',
        'post_booking',
      ];

      if (
        wasNotBooked &&
        isNowBooked &&
        !alreadyPastPreorder.includes(next.booking.status) &&
        next.booking.status !== 'offering_preorder'
      ) {
        next = {
          ...next,
          booking: { ...next.booking, status: 'offering_preorder' },
          customerAccepted: true,
        };
      }

      next = {
        ...next,
        memory: {
          ...next.memory,
          booking_process: bookingProcessMemoryFromState(next.booking, next.lastSpokenText || null),
        },
      };

      return next;
    }

    case 'RESET_BOOKING':
      return {
        ...state,
        booking: initialBooking,
        memory: {
          ...state.memory,
          booking_process: null,
        },
        showExitX: false,
        customerAccepted: false,
        availabilityOpen: false,
      };

    case 'RESET_ASSISTANT_CONTEXT':
      return {
        ...state,
        conversationId: null,
        booking: {
          ...initialBooking,
          has_saved_card: state.booking.has_saved_card,
        },
        map: {
          ...initialMap,
          visible: true,
          center: state.map.center,
          zoom: state.map.zoom,
        },
        filters: {},
        memory: initialMemory,
        showExitX: false,
        customerAccepted: false,
        availabilityOpen: false,
      };

    case 'SET_AVAILABILITY_OPEN':
      return { ...state, availabilityOpen: localAction.open };

    case 'PRESELECT_RESTAURANT':
      return {
        ...state,
        isOpen: true,
        map: {
          ...state.map,
          visible: true,
          highlighted_restaurant_id: localAction.restaurant_id,
        },
        booking: beginBookingForRestaurant(
          state.booking,
          localAction.restaurant_id,
          localAction.restaurant_name,
        ),
        availabilityOpen: false,
        showExitX: false,
        customerAccepted: false,
      };
  }

  return applyUIAction(state, action as UIActionType);
}

interface AssistantStoreContextValue {
  state: AssistantState;
  dispatch: Dispatch<AssistantAction>;
}

const AssistantStoreContext = createContext<AssistantStoreContextValue | null>(null);

export function AssistantStoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(assistantReducer, initialState);
  return (
    <AssistantStoreContext.Provider value={{ state, dispatch }}>
      {children}
    </AssistantStoreContext.Provider>
  );
}

export function useAssistantStore(): AssistantStoreContextValue {
  const ctx = useContext(AssistantStoreContext);
  if (!ctx) throw new Error('useAssistantStore must be inside AssistantStoreProvider');
  return ctx;
}
