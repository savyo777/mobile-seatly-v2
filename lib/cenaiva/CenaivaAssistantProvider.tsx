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
import type { AssistantResponseType, OrchestratorRequestType } from '@cenaiva/assistant';
import { useAuthSession } from '@/lib/auth/AuthContext';
import {
  AssistantStoreProvider,
  assistantReducer,
  useAssistantStore,
  type AssistantAction,
} from '@/lib/cenaiva/state/assistantStore';
import {
  useCenaivaOrchestrator,
  type OrchestratorTransport,
} from '@/lib/cenaiva/api/useCenaivaOrchestrator';
import { useCenaivaVoice } from '@/lib/cenaiva/voice/useCenaivaVoice';
import { useCenaivaVoicePreference } from '@/lib/cenaiva/voice/CenaivaVoicePreferenceProvider';
import type { TranscriptionPhase } from '@/lib/cenaiva/voice/useMobileTranscription';
import { useCenaivaWakeWord } from '@/lib/cenaiva/voice/useCenaivaWakeWord';
import { buildWakeGreeting } from '@/lib/cenaiva/voice/wakeGreeting';
import type { CenaivaVoicePermissionStatus } from '@/lib/cenaiva/voice/voicePermission';
import {
  applyClientDiscoveryMemory,
  getCenaivaRecommendationMode,
  normalizeSingleRestaurantRecommendationResponse,
} from '@/lib/cenaiva/recommendationIntent';
import {
  getCenaivaImmediateFiller,
  isCenaivaProcessPrompt,
  shouldResetCenaivaBookingContext,
} from '@/lib/cenaiva/simplePromptIntent';
import {
  buildLocalAvailabilityResponse,
  planLocalBookingTurn,
  type CenaivaAvailabilityOption,
} from '@/lib/cenaiva/localBookingCollector';
import { postCenaivaAvailability } from '@/lib/cenaiva/api/checkCenaivaAvailability';
import { postCenaivaSmallPrompt, prewarmCenaivaSmallPrompt } from '@/lib/cenaiva/api/getCenaivaSmallPrompt';

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
const DEFERRED_FILLER_DELAY_MS = 2_000;
const FILLER_TO_RESPONSE_PAUSE_MS = 240;
const MAX_EMPTY_RELISTENS = 2;
const LOCATION_TURN_WAIT_MS = 250;
const CENAIVA_OPEN_MAP_ZOOM = 11;
const LOCAL_AVAILABILITY_TIMEOUT_MS = 20_000;
const LOCAL_FILLER_TO_RESULT_PAUSE_MS = 260;
const SMALL_PROMPT_TIMEOUT_MS = 8_000;

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

function debugTiming(event: string, details?: Record<string, unknown>) {
  if (process.env.EXPO_PUBLIC_CENAIVA_VOICE_DEBUG !== 'true') return;
  if (details) console.log(`[Cenaiva timing] ${event}`, details);
  else console.log(`[Cenaiva timing] ${event}`);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type DeferredAction = {
  cancel: () => boolean;
  done: Promise<void>;
};

function createDeferredAction(delayMs: number, action: () => void | Promise<void>): DeferredAction {
  let started = false;
  let settled = false;
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let resolveDone: (() => void) | null = null;
  const done = new Promise<void>((resolve) => {
    resolveDone = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    timeout = setTimeout(() => {
      timeout = null;
      started = true;
      Promise.resolve(action()).finally(() => {
        resolveDone?.();
      });
    }, delayMs);
  });

  return {
    cancel() {
      if (!started) {
        if (timeout) clearTimeout(timeout);
        timeout = null;
        resolveDone?.();
        return false;
      }
      return true;
    },
    done,
  };
}

// WS-3.1: Per-turn latency summary. Aggregates the individual debugTiming
// checkpoints into a single line at end of turn so we can spot regressions
// against the 1500ms simple-prompt budget without scrolling through events.
type LatencyCheckpoints = {
  transcriptAt?: number;
  firstSpeechChunkAt?: number;
  requestSentAt?: number;
  finalReceivedAt?: number;
  playbackRequestedAt?: number;
  firstAudioDecodedAt?: number;
  streamingTransport?: OrchestratorTransport;
};
function logLatencySummary(turnStartedAt: number, c: LatencyCheckpoints, outcome: string) {
  if (process.env.EXPO_PUBLIC_CENAIVA_VOICE_DEBUG !== 'true') return;
  const ms = (t?: number) => (t == null ? null : t - turnStartedAt);
  console.log('[Cenaiva timing] summary', {
    outcome,
    transcript_ms: ms(c.transcriptAt),
    request_sent_ms: ms(c.requestSentAt),
    first_speech_chunk_ms: ms(c.firstSpeechChunkAt),
    final_received_ms: ms(c.finalReceivedAt),
    playback_requested_ms: ms(c.playbackRequestedAt),
    first_audio_decoded_ms: ms(c.firstAudioDecodedAt),
    streaming_transport: c.streamingTransport ?? null,
    total_ms: Date.now() - turnStartedAt,
  });
}

function looksLikeFillerSpeech(text: string) {
  return /^(hold on while i\b|hold on a second\b|one moment\b|still working\b)/i.test(text.trim());
}

function AssistantInner({ children }: { children: ReactNode }) {
  const { state, dispatch } = useAssistantStore();
  const orchestrator = useCenaivaOrchestrator();
  const activeLatencyRef = useRef<{
    turnStartedAt: number;
    checkpoints: LatencyCheckpoints;
  } | null>(null);
  const handleFirstAudioStart = useCallback(() => {
    const active = activeLatencyRef.current;
    if (!active || active.checkpoints.firstAudioDecodedAt) return;
    active.checkpoints.firstAudioDecodedAt = Date.now();
    debugTiming('first audio decoded', {
      elapsedMs: active.checkpoints.firstAudioDecodedAt - active.turnStartedAt,
    });
  }, []);
  const voice = useCenaivaVoice({ onFirstAudioStart: handleFirstAudioStart });
  const {
    isLoading: isVoicePreferenceLoading,
    needsSelection: voiceSelectionRequired,
  } = useCenaivaVoicePreference();
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, session, user } = useAuthSession();

  const stateRef = useRef(state);
  stateRef.current = state;
  const processingRef = useRef(false);
  const textModeRef = useRef(false);
  const isOpenRef = useRef(false);
  const listeningRef = useRef(false);
  const listenTurnIdRef = useRef(0);
  const speechHintsRef = useRef<string[]>([]);
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const locationRequestRef = useRef<Promise<{ lat: number; lng: number } | null> | null>(null);
  const forceStopWakeWordRef = useRef<() => void>(() => {});
  const requestWakePermissionRef = useRef<() => Promise<boolean>>(async () => false);
  const wakePermissionPromptedRef = useRef(false);
  const emptyRelistenStreakRef = useRef(0);
  const pendingOpenRef = useRef<OpenOptions | null>(null);
  const pendingAvailabilityOptionsRef = useRef<CenaivaAvailabilityOption[]>([]);

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
    if (!locationRequestRef.current) {
      locationRequestRef.current = (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') return null;
          const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          userLocationRef.current = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          return userLocationRef.current;
        } catch {
          return null;
        } finally {
          locationRequestRef.current = null;
        }
      })();
    }
    return locationRequestRef.current;
  }, []);

  const getLocationForTurn = useCallback(async () => {
    if (userLocationRef.current) return userLocationRef.current;
    const locationPromise = requestLocation();
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), LOCATION_TURN_WAIT_MS);
    });
    const result = await Promise.race([locationPromise, timeoutPromise]);
    if (!result) {
      debugTiming('location skipped for turn', { timeoutMs: LOCATION_TURN_WAIT_MS });
    }
    return result;
  }, [requestLocation]);

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
    pendingOpenRef.current = null;
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
      if (isVoicePreferenceLoading || voiceSelectionRequired) return;
      const trimmed = transcript.trim();
      if (!trimmed) return;

      if (processingRef.current) {
        if (!opts?.force) return;
        orchestrator.cancel();
        processingRef.current = false;
      }
      const turnStartedAt = Date.now();
      const checkpoints: LatencyCheckpoints = { transcriptAt: turnStartedAt };
      activeLatencyRef.current = { turnStartedAt, checkpoints };
      const recommendationMode = getCenaivaRecommendationMode(trimmed);
      debugTiming('transcript accepted', {
        length: trimmed.length,
        recommendationMode,
      });

      if (listeningRef.current) {
        listeningRef.current = false;
        listenTurnIdRef.current += 1;
        voice.stopListening();
      }

      processingRef.current = true;
      voice.stopListening();
      commit({ type: 'SET_VOICE_STATUS', status: 'processing' });

      const shouldResetContext = shouldResetCenaivaBookingContext(trimmed);
      if (shouldResetContext && stateRef.current.booking.restaurant_id) {
        commit({ type: 'RESET_ASSISTANT_CONTEXT' });
        debugTiming('booking context reset for new search', { transcript: trimmed });
      }

      const current = stateRef.current;
      const timezone =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone
          : undefined;

      const speakWithSyncedApply = async (
        spokenText: string | null | undefined,
        debugEvent: string,
        apply: () => void,
      ) => {
        let applied = false;
        const applyOnce = () => {
          if (applied) return;
          applied = true;
          apply();
        };

        if (!spokenText || opts?.silent) {
          applyOnce();
          return;
        }

        commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
        checkpoints.playbackRequestedAt = Date.now();
        debugTiming(debugEvent, {
          elapsedMs: Date.now() - turnStartedAt,
        });
        await voice.speak(spokenText, { onFirstAudioStart: applyOnce });
        applyOnce();
      };

      const finishLocalResponse = async (response: AssistantResponseType, outcome: string) => {
        await speakWithSyncedApply(
          response.spoken_text,
          'local speech playback requested',
          () => {
            processingRef.current = false;
            commit({ type: 'APPLY_RESPONSE', response });
          },
        );

        const responseStatus = stateRef.current.booking.status;
        const skipRelisten = NO_AUTO_RELISTEN_STATUSES.has(responseStatus);
        if (isOpenRef.current && !textModeRef.current && !skipRelisten) {
          setTimeout(() => {
            if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
          }, RELISTEN_AFTER_RESPONSE_MS);
        } else {
          commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
        }
        logLatencySummary(turnStartedAt, checkpoints, outcome);
        activeLatencyRef.current = null;
      };

      const localDecision = planLocalBookingTurn({
        transcript: trimmed,
        booking: current.booking,
        conversationId: current.conversationId,
        selectedRestaurantId: opts?.restaurantId ?? current.booking.restaurant_id,
        selectedRestaurantName: current.booking.restaurant_name,
        timezone,
        pendingOptions: pendingAvailabilityOptionsRef.current,
      });

      if (localDecision.kind === 'local_response') {
        if (localDecision.clearPendingOptions) pendingAvailabilityOptionsRef.current = [];
        await finishLocalResponse(localDecision.response, 'local_booking_collect');
        return;
      }

      if (localDecision.kind === 'check_availability') {
        pendingAvailabilityOptionsRef.current = [];
        let deferredFiller: DeferredAction | null = null;
        if (!opts?.silent) {
          deferredFiller = createDeferredAction(
            Math.max(0, DEFERRED_FILLER_DELAY_MS - (Date.now() - turnStartedAt)),
            async () => {
              let fillerApplied = false;
              const applyFiller = () => {
                if (fillerApplied) return;
                fillerApplied = true;
                commit({ type: 'APPLY_RESPONSE', response: localDecision.responseBeforeCheck });
                checkpoints.firstSpeechChunkAt = Date.now();
                debugTiming('local availability filler started', {
                  elapsedMs: Date.now() - turnStartedAt,
                });
              };
              commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
              checkpoints.playbackRequestedAt = Date.now();
              await voice.speak(localDecision.filler, { onFirstAudioStart: applyFiller });
              applyFiller();
            },
          );
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), LOCAL_AVAILABILITY_TIMEOUT_MS);
        checkpoints.requestSentAt = Date.now();
        debugTiming('availability request sent', {
          elapsedMs: Date.now() - turnStartedAt,
          mode: localDecision.request.mode,
        });

        try {
          const result = await postCenaivaAvailability(localDecision.request, {
            accessToken: session?.access_token,
            signal: controller.signal,
          });
          checkpoints.finalReceivedAt = Date.now();
          debugTiming('availability final received', {
            elapsedMs: Date.now() - turnStartedAt,
            error: result.error,
          });
          clearTimeout(timeoutId);
          const fillerWasStarted = deferredFiller?.cancel() ?? false;

          const availabilityResult = result.data ?? {
            status: 'unavailable' as const,
            alternatives: [],
            message: friendlyError(result.error),
          };
          const { response, pendingOptions } = buildLocalAvailabilityResponse({
            conversationId: current.conversationId,
            request: localDecision.request,
            result: availabilityResult,
          });
          pendingAvailabilityOptionsRef.current = pendingOptions;

          if (response.spoken_text && !opts?.silent) {
            if (fillerWasStarted) {
              await deferredFiller?.done.catch(() => undefined);
              await wait(LOCAL_FILLER_TO_RESULT_PAUSE_MS);
            }
            await speakWithSyncedApply(
              response.spoken_text,
              'availability speech playback requested',
              () => {
                processingRef.current = false;
                commit({ type: 'APPLY_RESPONSE', response });
              },
            );
          } else {
            processingRef.current = false;
            commit({ type: 'APPLY_RESPONSE', response });
          }

          if (isOpenRef.current && !textModeRef.current) {
            setTimeout(() => {
              if (isOpenRef.current && !textModeRef.current) void startListeningRef.current();
            }, RELISTEN_AFTER_RESPONSE_MS);
          } else {
            commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
          }
          logLatencySummary(turnStartedAt, checkpoints, result.error ? 'availability_error' : 'availability_ok');
          activeLatencyRef.current = null;
          return;
        } catch {
          clearTimeout(timeoutId);
          processingRef.current = false;
          const fillerWasStarted = deferredFiller?.cancel() ?? false;
          if (fillerWasStarted) await deferredFiller?.done.catch(() => undefined);
          const message = 'I could not check availability. Try another date and time.';
          commit({ type: 'SET_LAST_SPOKEN_TEXT', text: message });
          if (!opts?.silent && !textModeRef.current) {
            commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
            await voice.speak(message);
          }
          commit({ type: 'SET_VOICE_STATUS', status: 'idle' });
          logLatencySummary(turnStartedAt, checkpoints, 'availability_exception');
          activeLatencyRef.current = null;
          return;
        }
      }

      if (!isCenaivaProcessPrompt(trimmed)) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), SMALL_PROMPT_TIMEOUT_MS);
        checkpoints.requestSentAt = Date.now();
        debugTiming('small prompt request sent', {
          elapsedMs: Date.now() - turnStartedAt,
        });
        try {
          const result = await postCenaivaSmallPrompt({
            transcript: trimmed,
            booking: {
              restaurant_id: current.booking.restaurant_id,
              restaurant_name: current.booking.restaurant_name,
              party_size: current.booking.party_size,
              date: current.booking.date,
              time: current.booking.time,
            },
          }, {
            accessToken: session?.access_token,
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
          checkpoints.finalReceivedAt = Date.now();
          debugTiming('small prompt final received', {
            elapsedMs: Date.now() - turnStartedAt,
            error: result.error,
          });

          const next = result.data?.next_expected_input ?? 'restaurant';
          const step =
            next === 'party_size' ? 'choose_party' :
              next === 'date' ? 'choose_date' :
                next === 'time' ? 'choose_time' :
                  next === 'confirmation' ? 'confirm' :
                    'choose_restaurant';
          const response: AssistantResponseType = {
            conversation_id: current.conversationId ?? '',
            spoken_text: result.data?.spoken_text ?? friendlyError(result.error),
            intent: 'general_question',
            step,
            next_expected_input: next,
            ui_actions: [],
            booking: null,
            map: null,
            filters: null,
            assistant_memory: null,
          };
          checkpoints.firstSpeechChunkAt = checkpoints.finalReceivedAt;
          await finishLocalResponse(response, result.error ? 'small_prompt_error' : 'small_prompt_ok');
          return;
        } catch {
          clearTimeout(timeoutId);
          const response: AssistantResponseType = {
            conversation_id: current.conversationId ?? '',
            spoken_text: 'I could not answer that quickly. What restaurant or area should I book?',
            intent: 'general_question',
            step: 'choose_restaurant',
            next_expected_input: 'restaurant',
            ui_actions: [],
            booking: null,
            map: null,
            filters: null,
            assistant_memory: null,
          };
          await finishLocalResponse(response, 'small_prompt_exception');
          return;
        }
      }

      const currentLocation = await getLocationForTurn();
      if (currentLocation) {
        commit({
          type: 'update_map_center',
          lat: currentLocation.lat,
          lng: currentLocation.lng,
          zoom: current.map.zoom,
        });
      }
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
        recommendation_mode: recommendationMode ?? undefined,
        assistant_memory: current.memory,
        user_location: currentLocation,
        timezone,
        conversation_id: current.conversationId ?? undefined,
        has_saved_card: current.booking.has_saved_card,
        guest_id: null,
        reservation_id: current.booking.reservation_id,
      };

      let serverStreamedText = '';
      let serverChunkSeen = false;
      let fillerQueued = false;
      let deferredFiller: DeferredAction | null = null;
      const streamingActive = voice.isStreamingTTSAvailable && !opts?.silent;
      const immediateFiller = streamingActive ? getCenaivaImmediateFiller(trimmed) : null;
      const scheduleDeferredFiller = () => {
        if (!immediateFiller || deferredFiller) return;
        deferredFiller = createDeferredAction(
          Math.max(0, DEFERRED_FILLER_DELAY_MS - (Date.now() - turnStartedAt)),
          () => {
            if (serverChunkSeen || serverStreamedText.trim()) return;
            fillerQueued = true;
            let fillerApplied = false;
            const applyFiller = () => {
              if (fillerApplied) return;
              fillerApplied = true;
              checkpoints.firstSpeechChunkAt = Date.now();
              debugTiming('client filler started', {
                elapsedMs: Date.now() - turnStartedAt,
                text: immediateFiller,
              });
              commit({ type: 'SET_LAST_SPOKEN_TEXT', text: immediateFiller });
            };
            voice.speakStreamingChunk(immediateFiller, {
              pacingAfterMs: FILLER_TO_RESPONSE_PAUSE_MS,
              onFirstAudioStart: applyFiller,
            });
          },
        );
      };
      const cancelDeferredFiller = () => {
        if (deferredFiller == null) return false;
        const currentFiller = deferredFiller as DeferredAction;
        const started = currentFiller.cancel();
        if (!started) deferredFiller = null;
        return started;
      };
      scheduleDeferredFiller();
      const callbacks = streamingActive
        ? {
            onTransport: (transport: OrchestratorTransport) => {
              checkpoints.streamingTransport = transport;
            },
            onSpeechChunk: (text: string) => {
              const normalize = (value: string) =>
                value.replace(/\s+/g, ' ').replace(/[.!?,\s]+$/, '').trim().toLowerCase();
              if (
                immediateFiller &&
                !serverChunkSeen &&
                (normalize(text) === normalize(immediateFiller) || looksLikeFillerSpeech(text))
              ) {
                return;
              }
              if (!serverChunkSeen && !immediateFiller && !checkpoints.firstSpeechChunkAt) {
                checkpoints.firstSpeechChunkAt = Date.now();
                debugTiming('first speech chunk', { elapsedMs: Date.now() - turnStartedAt });
              }
              cancelDeferredFiller();
              serverChunkSeen = true;
              if (looksLikeFillerSpeech(text)) {
                scheduleDeferredFiller();
                return;
              }
              serverStreamedText += (serverStreamedText ? ' ' : '') + text;
              const nextStreamedText = serverStreamedText;
              voice.speakStreamingChunk(text, {
                onFirstAudioStart: () => {
                  commit({ type: 'SET_LAST_SPOKEN_TEXT', text: nextStreamedText });
                },
              });
            },
            onDiscardPendingSpeech: () => {
              cancelDeferredFiller();
              if (!serverChunkSeen) return;
              serverChunkSeen = false;
              serverStreamedText = '';
              if (immediateFiller) {
                scheduleDeferredFiller();
              }
              voice.discardStreamingSpeech();
            },
          }
        : undefined;

      try {
        checkpoints.requestSentAt = Date.now();
        debugTiming('orchestrator request sent', {
          elapsedMs: Date.now() - turnStartedAt,
          hasLocation: Boolean(currentLocation),
        });
        const response = await orchestrator.send(req, callbacks);
        checkpoints.finalReceivedAt = Date.now();
        debugTiming('orchestrator final received', { elapsedMs: Date.now() - turnStartedAt });
        const fillerWasStarted = cancelDeferredFiller();
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
          logLatencySummary(turnStartedAt, checkpoints, 'no_response');
          activeLatencyRef.current = null;
          return;
        }

        const recommendationResponse = applyClientDiscoveryMemory(
          normalizeSingleRestaurantRecommendationResponse(response, trimmed),
          trimmed,
          {
            rawResponse: response,
            previousMemory: current.memory,
            recommendationMode,
          },
        );
        const uiTypes = (recommendationResponse.ui_actions ?? []).map((action) => action.type);
        let spokenText = recommendationResponse.spoken_text ?? '';
        const freshlyBooked =
          uiTypes.includes('show_confirmation') ||
          (!!recommendationResponse.booking?.reservation_id && !current.booking.reservation_id);
        if (freshlyBooked && !/pre-?order|menu/i.test(spokenText)) {
          const base = spokenText.trim().replace(/[.!?]*$/, '');
          spokenText = `${base ? `${base}. ` : ''}Would you like to pre-order from the menu?`;
        }

        const appliedResponse = spokenText === recommendationResponse.spoken_text
          ? recommendationResponse
          : { ...recommendationResponse, spoken_text: spokenText };
        let finalApplied = false;
        const applyFinalResponse = () => {
          if (finalApplied) return;
          finalApplied = true;
          commit({
            type: 'APPLY_RESPONSE',
            response: appliedResponse,
          });

          for (const action of appliedResponse.ui_actions ?? []) {
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
        };

        if (spokenText && !opts?.silent) {
          const normalize = (value: string) =>
            value.replace(/\s+/g, ' ').replace(/[.!?,\s]+$/, '').trim().toLowerCase();
          if (streamingActive && normalize(serverStreamedText) && normalize(serverStreamedText) === normalize(spokenText)) {
            applyFinalResponse();
            await voice.drainStreamingSpeech();
          } else if (streamingActive && (fillerQueued || fillerWasStarted) && !normalize(serverStreamedText)) {
            await voice.drainStreamingSpeech();
            await speakWithSyncedApply(spokenText, 'speech playback requested', applyFinalResponse);
          } else {
            if (streamingActive) voice.discardStreamingSpeech();
            await speakWithSyncedApply(spokenText, 'speech playback requested', applyFinalResponse);
          }
        } else {
          applyFinalResponse();
          if (streamingActive) voice.discardStreamingSpeech();
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
        logLatencySummary(turnStartedAt, checkpoints, 'ok');
        activeLatencyRef.current = null;
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
        logLatencySummary(turnStartedAt, checkpoints, 'error');
        activeLatencyRef.current = null;
      }
    },
    [
      commit,
      getLocationForTurn,
      isVoicePreferenceLoading,
      orchestrator,
      pathname,
      router,
      session?.access_token,
      voice,
      voiceSelectionRequired,
    ],
  );

  const startListening = useCallback(async () => {
    if (!isOpenRef.current) return;
    if (processingRef.current) return;
    if (listeningRef.current) return;
    if (isVoicePreferenceLoading || voiceSelectionRequired) return;
    const turnId = listenTurnIdRef.current + 1;
    listenTurnIdRef.current = turnId;
    listeningRef.current = true;
    try {
      const listenStartedAt = Date.now();
      debugTiming('listening started');
      commit({ type: 'SET_VOICE_STATUS', status: 'listening' });
      const { transcript, stopped } = await voice.startListening(speechHintsRef.current);
      debugTiming('listening finished', {
        elapsedMs: Date.now() - listenStartedAt,
        hasTranscript: Boolean(transcript.trim()),
        stopped: Boolean(stopped),
      });
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
  }, [
    commit,
    isVoicePreferenceLoading,
    sendTranscript,
    voice,
    voiceSelectionRequired,
  ]);

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

  const speakGreetingThenListen = useCallback(
    async (greetingText?: string) => {
      if (!isOpenRef.current || textModeRef.current) return;
      const trimmedGreeting = greetingText?.trim();

      if (trimmedGreeting) {
        let greetingApplied = false;
        const applyGreeting = () => {
          if (greetingApplied) return;
          greetingApplied = true;
          commit({ type: 'SET_LAST_SPOKEN_TEXT', text: trimmedGreeting });
        };
        commit({ type: 'SET_VOICE_STATUS', status: 'speaking' });
        await voice.speak(trimmedGreeting, { onFirstAudioStart: applyGreeting });
        applyGreeting();
      }

      if (isOpenRef.current && !textModeRef.current) {
        void startListeningRef.current();
      }
    },
    [commit, voice],
  );

  useEffect(() => {
    if (isVoicePreferenceLoading || voiceSelectionRequired) return;
    const pending = pendingOpenRef.current;
    if (!pending?.autoListen) return;
    pendingOpenRef.current = null;

    setTimeout(() => {
      void speakGreetingThenListen(pending.greetingText);
    }, 0);
  }, [isVoicePreferenceLoading, speakGreetingThenListen, voiceSelectionRequired]);

  const open = useCallback(
    (restaurantId?: string, restaurantName?: string, opts?: OpenOptions) => {
      isOpenRef.current = true;
      debugTiming('assistant opened', {
        autoListen: Boolean(opts?.autoListen),
        hasRestaurant: Boolean(restaurantId),
      });
      if (restaurantId && restaurantName) {
        commit({ type: 'PRESELECT_RESTAURANT', restaurant_id: restaurantId, restaurant_name: restaurantName });
      } else {
        commit({ type: 'OPEN' });
      }
      forceStopWakeWordRef.current();
      voice.primeTTS();
      orchestrator.prewarm?.();
      prewarmCenaivaSmallPrompt({ accessToken: session?.access_token });
      void requestWakePermissionRef.current();
      void requestLocation().then((location) => {
        if (!location || !isOpenRef.current) return;
        commit({
          type: 'update_map_center',
          lat: location.lat,
          lng: location.lng,
          zoom: CENAIVA_OPEN_MAP_ZOOM,
        });
      });
      if (opts?.autoListen) {
        if (isVoicePreferenceLoading || voiceSelectionRequired) {
          pendingOpenRef.current = opts;
          return;
        }

        setTimeout(() => {
          void speakGreetingThenListen(opts.greetingText);
        }, 0);
      }
    },
    [
      commit,
      isVoicePreferenceLoading,
      requestLocation,
      session?.access_token,
      speakGreetingThenListen,
      voice,
      voiceSelectionRequired,
    ],
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
        pendingOpenRef.current = null;
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
    () => {
      const voicePermissionStatus: CenaivaVoicePermissionStatus =
        voice.permissionDenied
          ? 'denied'
          : voice.transcriptionUnavailable
            ? 'unavailable'
            : wakePermissionStatus === 'blocked' || wakePermissionStatus === 'denied'
              ? wakePermissionStatus
              : 'unknown';

      return {
        open,
        close,
        sendTranscript,
        startListening,
        stopListening,
        stopSpeaking,
        setSpeechHints,
        setTextMode,
        voicePermissionStatus,
        canAskVoicePermission: canAskWakePermissionAgain,
        isWakeWordSupported,
        requestVoicePermission: requestWakePermission,
        openVoicePermissionSettings: openWakePermissionSettings,
        voiceTranscript: voice.liveTranscript,
        voiceActivity: voice.transcriptionPhase,
        voiceLastError: voice.transcriptionLastError,
      };
    },
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
      voice.permissionDenied,
      voice.liveTranscript,
      voice.transcriptionPhase,
      voice.transcriptionUnavailable,
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
