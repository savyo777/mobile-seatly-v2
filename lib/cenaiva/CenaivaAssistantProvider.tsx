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
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  AssistantStoreProvider,
  assistantReducer,
  useAssistantStore,
  type AssistantAction,
} from '@/lib/cenaiva/state/assistantStore';
import { useCenaivaOrchestrator } from '@/lib/cenaiva/api/useCenaivaOrchestrator';
import { useCenaivaVoice } from '@/lib/cenaiva/voice/useCenaivaVoice';
import type { TranscriptionPhase } from '@/lib/cenaiva/voice/useMobileTranscription';
import { useCenaivaWakeWord } from '@/lib/cenaiva/voice/useCenaivaWakeWord';
import { buildWakeGreeting } from '@/lib/cenaiva/voice/wakeGreeting';
import type { CenaivaVoicePermissionStatus } from '@/lib/cenaiva/voice/voicePermission';

type OpenOptions = { autoListen?: boolean; greetingText?: string };

export type CenaivaAssistant = {
  open: (restaurantId?: string, restaurantName?: string, opts?: OpenOptions) => void;
  close: () => void;
  sendTranscript: (
    transcript: string,
    opts?: { restaurantId?: string; silent?: boolean; force?: boolean },
  ) => Promise<void>;
  startListening: () => Promise<void>;
  stopListening: () => void;
  stopSpeaking: () => void;
  setSpeechHints: (hints: string[]) => void;
  setTextMode: (active: boolean) => void;
  voicePermissionStatus: CenaivaVoicePermissionStatus;
  canAskVoicePermission: boolean;
  isWakeWordSupported: boolean;
  requestVoicePermission: () => Promise<boolean>;
  openVoicePermissionSettings: () => Promise<void>;
  voiceTranscript: string;
  voiceActivity: TranscriptionPhase;
  voiceLastError: string | null;
};

const CenaivaAssistantContext = createContext<CenaivaAssistant | null>(null);
const RELISTEN_AFTER_EMPTY_TURN_MS = 260;
const RELISTEN_AFTER_ERROR_MS = 320;
const RELISTEN_AFTER_RESPONSE_MS = 260;
const MAX_EMPTY_RELISTENS = 2;

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

function friendlyVoiceError(cause: string | null) {
  const code = cause ?? '';
  let base = 'Something went wrong. Try again.';

  if (code.includes('not-allowed')) {
    base = 'Microphone access is off. Enable it to use Hey Cenaiva.';
  } else if (code.includes('voice-stt-unavailable')) {
    base = 'Please sign in to use voice input.';
  } else if (code.includes('recording-prepare-failed') || code.includes('recording-start-failed')) {
    base = 'Microphone could not start. Close other recording apps and try again.';
  } else if (
    code.includes('service-not-allowed') ||
    code.includes('language-not-supported') ||
    code.includes('native-speech-unavailable')
  ) {
    base = 'Voice recognition is unavailable in this build. Type your request.';
  } else if (code.includes('deepgram-token-unavailable') || code.includes('deepgram-http')) {
    base = 'Voice input could not reach speech service. Try again or type your request.';
  }

  if (code && process.env.NODE_ENV !== 'production') return `${base} (${code})`;
  return base;
}

function AssistantInner({ children }: { children: ReactNode }) {
  const { state, dispatch } = useAssistantStore();
  const orchestrator = useCenaivaOrchestrator();
  const voice = useCenaivaVoice();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, user } = useAuthSession();

  const stateRef = useRef(state);
  stateRef.current = state;
  const processingRef = useRef(false);
  const textModeRef = useRef(false);
  const isOpenRef = useRef(false);
  const listeningRef = useRef(false);
  const listenTurnIdRef = useRef(0);
  const speechHintsRef = useRef<string[]>([]);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const forceStopWakeWordRef = useRef<() => void>(() => {});
  const requestWakePermissionRef = useRef<() => Promise<boolean>>(async () => false);
  const wakePermissionPromptedRef = useRef(false);
  const emptyRelistenStreakRef = useRef(0);

  const commit = useCallback(
    (action: AssistantAction) => {
      stateRef.current = assistantReducer(stateRef.current, action);
      dispatch(action);
    },
    [dispatch],
  );

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
      listeningRef.current = false;
      listenTurnIdRef.current += 1;
      emptyRelistenStreakRef.current = 0;
      voice.stopListening();
      commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
    }
  }, [commit, voice]);

  const close = useCallback(() => {
    isOpenRef.current = false;
    textModeRef.current = false;
    processingRef.current = false;
    listeningRef.current = false;
    listenTurnIdRef.current += 1;
    emptyRelistenStreakRef.current = 0;
    orchestrator.cancel();
    voice.stopListening();
    voice.stopSpeaking();
    commit({ type: 'CLOSE' });
  }, [commit, orchestrator, voice]);

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

      if (listeningRef.current) {
        listeningRef.current = false;
        listenTurnIdRef.current += 1;
        voice.stopListening();
      }

      processingRef.current = true;
      voice.stopListening();
      commit({ type: 'SET_VOICE_STATUS', status: 'processing' });

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
          commit({ type: 'SET_LAST_SPOKEN_TEXT', text: message });
          if (!opts?.silent && !textModeRef.current) {
            commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
            await voice.speak(message);
          }
          commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
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

        const appliedResponse = spokenText === response.spoken_text
          ? response
          : { ...response, spoken_text: spokenText };
        commit({
          type: 'APPLY_RESPONSE',
          response: appliedResponse,
        });

        for (const action of response.ui_actions ?? []) {
          if (action.type === 'navigate') {
            router.push(action.path as never);
          }
          if (action.type === 'navigate_to_checkout') {
            voice.stopSpeaking();
            voice.stopListening();
            commit({ type: 'CLOSE' });
            router.push(action.path as never);
          }
        }

        if (spokenText && !opts?.silent) {
          const normalize = (value: string) =>
            value.replace(/\s+/g, ' ').replace(/[.!?,\s]+$/, '').trim().toLowerCase();
          commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
          if (streamingActive && normalize(streamedText) && normalize(streamedText) === normalize(spokenText)) {
            await voice.drainStreamingSpeech();
          } else {
            if (streamingActive) voice.discardStreamingSpeech();
            await voice.speak(spokenText);
          }
        } else if (streamingActive) {
          voice.discardStreamingSpeech();
        }

        const responseStatus = stateRef.current.booking.status;
        const skipRelisten =
          freshlyBooked ||
          uiTypes.includes('offer_preorder') ||
          uiTypes.includes('show_menu') ||
          NO_AUTO_RELISTEN_STATUSES.has(responseStatus);

        if (isOpenRef.current && !textModeRef.current && !skipRelisten) {
          setTimeout(() => {
            if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
          }, RELISTEN_AFTER_RESPONSE_MS);
        } else {
          commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
        }
      } catch {
        processingRef.current = false;
        if (streamingActive) voice.discardStreamingSpeech();
        const message = 'Something went wrong. Try again.';
        commit({ type: 'SET_LAST_SPOKEN_TEXT', text: message });
        if (!opts?.silent && !textModeRef.current) {
          commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
          await voice.speak(message);
        }
        commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
      }
    },
    [commit, orchestrator, pathname, requestLocation, router, voice],
  );

  const startListening = useCallback(async () => {
    if (!isOpenRef.current) return;
    if (processingRef.current) return;
    if (listeningRef.current) return;
    const turnId = listenTurnIdRef.current + 1;
    listenTurnIdRef.current = turnId;
    listeningRef.current = true;
    try {
      commit({ type: 'SET_VOICE_STATUS', status: 'listening' });
      const { transcript, stopped } = await voice.startListening(speechHintsRef.current);
      if (turnId !== listenTurnIdRef.current) return;
      listeningRef.current = false;
      if (stopped) {
        emptyRelistenStreakRef.current = 0;
        commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
        return;
      }
      if (transcript.trim()) {
        emptyRelistenStreakRef.current = 0;
        await sendTranscript(transcript);
      } else {
        emptyRelistenStreakRef.current += 1;
        if (emptyRelistenStreakRef.current >= MAX_EMPTY_RELISTENS) {
          emptyRelistenStreakRef.current = 0;
          commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
          return;
        }
        commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
        setTimeout(() => {
          if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
        }, RELISTEN_AFTER_EMPTY_TURN_MS);
      }
    } catch (err) {
      if (turnId !== listenTurnIdRef.current) return;
      listeningRef.current = false;
      const message = (err as Error)?.message || voice.transcriptionLastError || null;
      const isPermDenied = message?.includes('not-allowed') === true;
      const isVoiceUnavailable =
        message?.includes('voice-stt-unavailable') === true ||
        message?.includes('deepgram-stt-unavailable') === true ||
        message?.includes('native-speech-unavailable') === true ||
        message?.includes('service-not-allowed') === true ||
        message?.includes('language-not-supported') === true;
      const friendly = friendlyVoiceError(message);
      commit({
        type: 'SET_LAST_SPOKEN_TEXT',
        text: friendly,
      });
      if (isPermDenied || isVoiceUnavailable) {
        emptyRelistenStreakRef.current = 0;
        commit({ type: 'SET_VOICE_STATUS', status: isPermDenied ? 'error' : 'idle' });
        return;
      }
      emptyRelistenStreakRef.current += 1;
      if (emptyRelistenStreakRef.current >= MAX_EMPTY_RELISTENS) {
        emptyRelistenStreakRef.current = 0;
        commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
        return;
      }
      commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
      setTimeout(() => {
        if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
      }, RELISTEN_AFTER_ERROR_MS);
    }
  }, [commit, sendTranscript, voice]);

  const stopListening = useCallback(() => {
    listeningRef.current = false;
    listenTurnIdRef.current += 1;
    emptyRelistenStreakRef.current = 0;
    voice.stopListening();
    if (!processingRef.current) {
      commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
    }
  }, [commit, voice]);

  const stopSpeaking = useCallback(() => {
    voice.stopSpeaking();
    if (!processingRef.current && !listeningRef.current) {
      commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
    }
  }, [commit, voice]);

  const startListeningRef = useRef(startListening);
  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  const open = useCallback(
    (restaurantId?: string, restaurantName?: string, opts?: OpenOptions) => {
      isOpenRef.current = true;
      forceStopWakeWordRef.current();
      voice.primeTTS();
      void requestWakePermissionRef.current();
      void requestLocation();
      if (restaurantId && restaurantName) {
        commit({ type: 'PRESELECT_RESTAURANT', restaurant_id: restaurantId, restaurant_name: restaurantName });
      } else {
        commit({ type: 'OPEN' });
      }
      if (opts?.autoListen) {
        const greetingText = opts.greetingText?.trim();
        setTimeout(() => {
          if (!isOpenRef.current || textModeRef.current) return;
          if (greetingText) {
            commit({ type: 'SET_LAST_SPOKEN_TEXT', text: greetingText });
          }
          if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
        }, 0);
      }
    },
    [commit, requestLocation, voice],
  );

  const onWake = useCallback(() => {
    if (!isAuthenticated) return;
    open(undefined, undefined, { autoListen: true, greetingText: buildWakeGreeting(user) });
  }, [isAuthenticated, open, user]);

  const {
    isSupported: isWakeWordSupported,
    forceStop: forceStopWakeWord,
    requestPermission: requestWakePermission,
    hasPermission: hasWakePermission,
    openPermissionSettings: openWakePermissionSettings,
    permissionStatus: wakePermissionStatus,
    canAskAgain: canAskWakePermissionAgain,
    setEnabled: setWakeWordEnabled,
  } = useCenaivaWakeWord(onWake);

  useEffect(() => {
    forceStopWakeWordRef.current = forceStopWakeWord;
    requestWakePermissionRef.current = requestWakePermission;
  }, [forceStopWakeWord, requestWakePermission]);

  const isCustomerRoute =
    isAuthenticated &&
    !pathname?.startsWith('/(auth)') &&
    !pathname?.startsWith('/(staff)') &&
    !pathname?.startsWith('/onboarding') &&
    pathname !== '/';

  useEffect(() => {
    if (!isCustomerRoute || state.isOpen || !isWakeWordSupported) {
      forceStopWakeWord();
      return;
    }

    let cancelled = false;
    const timer = setTimeout(() => {
      void (async () => {
        let granted = await hasWakePermission();
        if (!granted && !wakePermissionPromptedRef.current) {
          wakePermissionPromptedRef.current = true;
          granted = await requestWakePermission();
        }
        if (!cancelled && granted) setWakeWordEnabled(true);
      })();
    }, 500);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [
    forceStopWakeWord,
    hasWakePermission,
    isCustomerRoute,
    isWakeWordSupported,
    requestWakePermission,
    setWakeWordEnabled,
    state.isOpen,
  ]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') {
        forceStopWakeWord();
        listeningRef.current = false;
        listenTurnIdRef.current += 1;
        voice.stopListening();
        voice.stopSpeaking();
        emptyRelistenStreakRef.current = 0;
        commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
      }
    });
    return () => sub.remove();
  }, [commit, forceStopWakeWord, voice]);

  const value = useMemo<CenaivaAssistant>(
    () => ({
      open,
      close,
      sendTranscript,
      startListening,
      stopListening,
      stopSpeaking,
      setSpeechHints,
      setTextMode,
      voicePermissionStatus: wakePermissionStatus,
      canAskVoicePermission: canAskWakePermissionAgain,
      isWakeWordSupported,
      requestVoicePermission: requestWakePermission,
      openVoicePermissionSettings: openWakePermissionSettings,
      voiceTranscript: voice.liveTranscript,
      voiceActivity: voice.transcriptionPhase,
      voiceLastError: voice.transcriptionLastError,
    }),
    [
      canAskWakePermissionAgain,
      close,
      isWakeWordSupported,
      open,
      openWakePermissionSettings,
      requestWakePermission,
      sendTranscript,
      setSpeechHints,
      setTextMode,
      startListening,
      stopListening,
      stopSpeaking,
      voice.liveTranscript,
      voice.transcriptionPhase,
      voice.transcriptionLastError,
      wakePermissionStatus,
    ],
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
