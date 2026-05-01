import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import { usePathname, useRouter } from 'expo-router';
import type { OrchestratorRequestType } from '@cenaiva/assistant';
import { AssistantStoreProvider, useAssistantStore } from '@/lib/cenaiva/state/assistantStore';
import { useCenaivaOrchestrator } from '@/lib/cenaiva/api/useCenaivaOrchestrator';
import { useCenaivaVoice } from '@/lib/cenaiva/voice/useCenaivaVoice';

type OpenOptions = { autoListen?: boolean };

export type CenaivaAssistant = {
  open: (restaurantId?: string, restaurantName?: string, opts?: OpenOptions) => void;
  close: () => void;
  sendTranscript: (
    transcript: string,
    opts?: { restaurantId?: string; silent?: boolean; force?: boolean },
  ) => Promise<void>;
  startListening: () => Promise<void>;
  setSpeechHints: (hints: string[]) => void;
  setTextMode: (active: boolean) => void;
};

const CenaivaAssistantContext = createContext<CenaivaAssistant | null>(null);

const NO_AUTO_RELISTEN_STATUSES = new Set([
  'offering_preorder',
  'browsing_menu',
  'reviewing_cart',
  'choosing_tip_timing',
  'choosing_tip_amount',
  'choosing_payment_split',
  'charging',
  'paid',
  'post_booking',
]);

export function useCenaivaAssistant(): CenaivaAssistant {
  const ctx = useContext(CenaivaAssistantContext);
  if (!ctx) throw new Error('useCenaivaAssistant must be inside CenaivaAssistantProvider');
  return ctx;
}

function friendlyError(cause: string | null) {
  if (cause === 'not_authenticated') return 'Please sign in to continue.';
  if (cause === 'timeout') return 'The assistant is taking a while. Try again.';
  return 'Something went wrong. Try again.';
}

function AssistantInner({ children }: { children: ReactNode }) {
  const { state, dispatch } = useAssistantStore();
  const orchestrator = useCenaivaOrchestrator();
  const voice = useCenaivaVoice();
  const router = useRouter();
  const pathname = usePathname();

  const stateRef = useRef(state);
  stateRef.current = state;
  const processingRef = useRef(false);
  const textModeRef = useRef(false);
  const isOpenRef = useRef(false);
  const speechHintsRef = useRef<string[]>([]);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    isOpenRef.current = state.isOpen;
  }, [state.isOpen]);

  const requestLocation = useCallback(async () => {
    if (userLocationRef.current) return userLocationRef.current;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      return userLocationRef.current;
    } catch {
      return null;
    }
  }, []);

  const setSpeechHints = useCallback((hints: string[]) => {
    speechHintsRef.current = hints.map((hint) => hint.trim()).filter(Boolean).slice(0, 12);
  }, []);

  const setTextMode = useCallback((active: boolean) => {
    textModeRef.current = active;
    if (active) {
      processingRef.current = false;
      voice.stopListening();
      dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
    }
  }, [dispatch, voice]);

  const close = useCallback(() => {
    isOpenRef.current = false;
    textModeRef.current = false;
    processingRef.current = false;
    orchestrator.cancel();
    voice.stopListening();
    voice.stopSpeaking();
    dispatch({ type: 'CLOSE' });
  }, [dispatch, orchestrator, voice]);

  const sendTranscript = useCallback(
    async (
      transcript: string,
      opts?: { restaurantId?: string; silent?: boolean; force?: boolean },
    ) => {
      const trimmed = transcript.trim();
      if (!trimmed) return;

      if (processingRef.current) {
        if (!opts?.force) return;
        orchestrator.cancel();
        processingRef.current = false;
      }

      processingRef.current = true;
      voice.stopListening();
      dispatch({ type: 'SET_VOICE_STATUS', status: 'processing' });

      const current = stateRef.current;
      const currentLocation = userLocationRef.current ?? (await requestLocation());
      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;

      const req: OrchestratorRequestType = {
        transcript: trimmed,
        screen: pathname ?? 'discover',
        booking_state: {
          restaurant_id: current.booking.restaurant_id,
          restaurant_name: current.booking.restaurant_name,
          party_size: current.booking.party_size,
          date: current.booking.date,
          time: current.booking.time,
          shift_id: current.booking.shift_id,
          slot_iso: current.booking.slot_iso,
          special_request: current.booking.special_request,
          occasion: current.booking.occasion,
          status: current.booking.status,
          confirmation_code: current.booking.confirmation_code,
          reservation_id: current.booking.reservation_id,
          order_id: current.booking.order_id,
          tip_choice: current.booking.tip_choice,
          tip_amount: current.booking.tip_amount,
          tip_percent: current.booking.tip_percent,
          payment_split: current.booking.payment_split,
          payment_status: current.booking.payment_status,
          pending_action: current.booking.pending_action,
          cart_subtotal: current.booking.cart_subtotal,
          cart: current.booking.cart,
        },
        map_state: {
          visible: current.map.visible,
          center: current.map.center,
          zoom: current.map.zoom,
          marker_restaurant_ids: current.map.marker_restaurant_ids,
          highlighted_restaurant_id: current.map.highlighted_restaurant_id,
        },
        filters: current.filters,
        visible_restaurant_ids: current.map.marker_restaurant_ids,
        selected_restaurant_id: opts?.restaurantId ?? current.booking.restaurant_id,
        user_location: currentLocation,
        timezone,
        conversation_id: current.conversationId ?? undefined,
        has_saved_card: current.booking.has_saved_card,
        guest_id: null,
        reservation_id: current.booking.reservation_id,
      };

      let streamedText = '';
      const streamingActive = voice.isStreamingTTSAvailable && !opts?.silent;
      const callbacks = streamingActive
        ? {
            onSpeechChunk: (text: string) => {
              streamedText += (streamedText ? ' ' : '') + text;
              voice.speakStreamingChunk(text);
            },
            onDiscardPendingSpeech: () => {
              streamedText = '';
              voice.discardStreamingSpeech();
            },
          }
        : undefined;

      try {
        const response = await orchestrator.send(req, callbacks);
        processingRef.current = false;

        if (!response) {
          if (streamingActive) voice.discardStreamingSpeech();
          const message = friendlyError(orchestrator.lastErrorRef.current);
          dispatch({ type: 'SET_LAST_SPOKEN_TEXT', text: message });
          if (!opts?.silent && !textModeRef.current) {
            dispatch({ type: 'SET_VOICE_STATUS', status: 'speaking' });
            await voice.speak(message);
          }
          dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
          return;
        }

        const uiTypes = (response.ui_actions ?? []).map((action) => action.type);
        let spokenText = response.spoken_text ?? '';
        const freshlyBooked =
          uiTypes.includes('show_confirmation') ||
          (!!response.booking?.reservation_id && !current.booking.reservation_id);
        if (freshlyBooked && !/pre-?order|menu/i.test(spokenText)) {
          const base = spokenText.trim().replace(/[.!?]*$/, '');
          spokenText = `${base ? `${base}. ` : ''}Would you like to pre-order from the menu?`;
        }

        dispatch({
          type: 'APPLY_RESPONSE',
          response: spokenText === response.spoken_text ? response : { ...response, spoken_text: spokenText },
        });

        for (const action of response.ui_actions ?? []) {
          if (action.type === 'navigate') {
            router.push(action.path as never);
          }
          if (action.type === 'navigate_to_checkout') {
            voice.stopSpeaking();
            voice.stopListening();
            dispatch({ type: 'CLOSE' });
            router.push(action.path as never);
          }
        }

        if (spokenText && !opts?.silent) {
          const normalize = (value: string) =>
            value.replace(/\s+/g, ' ').replace(/[.!?,\s]+$/, '').trim().toLowerCase();
          dispatch({ type: 'SET_VOICE_STATUS', status: 'speaking' });
          if (streamingActive && normalize(streamedText) && normalize(streamedText) === normalize(spokenText)) {
            await voice.drainStreamingSpeech();
          } else {
            if (streamingActive) voice.discardStreamingSpeech();
            await voice.speak(spokenText);
          }
        } else if (streamingActive) {
          voice.discardStreamingSpeech();
        }

        const responseStatus = response.booking?.status;
        const skipRelisten =
          freshlyBooked ||
          uiTypes.includes('offer_preorder') ||
          uiTypes.includes('show_menu') ||
          (responseStatus ? NO_AUTO_RELISTEN_STATUSES.has(responseStatus) : false);

        if (isOpenRef.current && !textModeRef.current && !skipRelisten) {
          void startListeningRef.current();
        } else {
          dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
        }
      } catch {
        processingRef.current = false;
        if (streamingActive) voice.discardStreamingSpeech();
        const message = 'Something went wrong. Try again.';
        dispatch({ type: 'SET_LAST_SPOKEN_TEXT', text: message });
        if (!opts?.silent && !textModeRef.current) {
          dispatch({ type: 'SET_VOICE_STATUS', status: 'speaking' });
          await voice.speak(message);
        }
        dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
      }
    },
    [dispatch, orchestrator, pathname, requestLocation, router, voice],
  );

  const startListening = useCallback(async () => {
    if (!isOpenRef.current) return;
    if (processingRef.current) return;
    try {
      dispatch({ type: 'SET_VOICE_STATUS', status: 'listening' });
      const { transcript, stopped } = await voice.startListening(speechHintsRef.current);
      if (stopped) {
        dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
        return;
      }
      if (transcript.trim()) {
        await sendTranscript(transcript);
      } else {
        dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
      }
    } catch (err) {
      const message = (err as Error)?.message ?? '';
      dispatch({
        type: 'SET_LAST_SPOKEN_TEXT',
        text: message.includes('not-allowed')
          ? 'Voice input is not available. Type your request.'
          : 'Something went wrong. Try again.',
      });
      dispatch({ type: 'SET_VOICE_STATUS', status: message.includes('not-allowed') ? 'error' : 'idle' });
    }
  }, [dispatch, sendTranscript, voice]);

  const startListeningRef = useRef(startListening);
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const open = useCallback(
    (restaurantId?: string, restaurantName?: string, opts?: OpenOptions) => {
      isOpenRef.current = true;
      voice.primeTTS();
      void requestLocation();
      if (restaurantId && restaurantName) {
        dispatch({ type: 'PRESELECT_RESTAURANT', restaurant_id: restaurantId, restaurant_name: restaurantName });
      } else {
        dispatch({ type: 'OPEN' });
      }
      if (opts?.autoListen) {
        setTimeout(() => {
          if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
        }, 150);
      }
    },
    [dispatch, requestLocation, voice],
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        voice.stopListening();
        voice.stopSpeaking();
        dispatch({ type: 'SET_VOICE_STATUS', status: 'idle' });
      }
    });
    return () => sub.remove();
  }, [dispatch, voice]);

  const value = useMemo<CenaivaAssistant>(
    () => ({
      open,
      close,
      sendTranscript,
      startListening,
      setSpeechHints,
      setTextMode,
    }),
    [close, open, sendTranscript, setSpeechHints, setTextMode, startListening],
  );

  return (
    <CenaivaAssistantContext.Provider value={value}>
      {children}
    </CenaivaAssistantContext.Provider>
  );
}

export function CenaivaAssistantProvider({ children }: { children: ReactNode }) {
  return (
    <AssistantStoreProvider>
      <AssistantInner>{children}</AssistantInner>
    </AssistantStoreProvider>
  );
}
