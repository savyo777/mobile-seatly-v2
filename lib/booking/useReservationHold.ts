import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  HoldApiError,
  cancelReservationHold,
  confirmHoldPaid,
  createReservationHold,
  fireAndForgetCancel,
  heartbeatReservationHold,
  mapHoldErrorCode,
  updateReservationHold,
  type ConfirmHoldPaidResponse,
  type CreateHoldResponse,
  type HoldSource,
  type HoldUnavailableReason,
} from '@/lib/booking/holdApi';
import { key } from '@/lib/storage/keys';
import { isHoldsEnabled } from '@/lib/config/holdsFeature';

export type HoldVisualState = 'calm' | 'warning' | 'urgent';

export type HoldState =
  | { status: 'idle' }
  | { status: 'creating' }
  | {
      status: 'active';
      holdId: string;
      expiresAt: string;
      secondsLeft: number;
      serverSkewMs: number;
      depositAmountCents: number;
      confirmationCode: string;
      tableIds: string[];
      durationMinutes: number;
    }
  | { status: 'expired'; holdId: string | null }
  | { status: 'converting' }
  | { status: 'confirmed'; reservationId: string; confirmationCode: string }
  | { status: 'error'; message: string; reason: HoldUnavailableReason };

export interface UseReservationHoldArgs {
  restaurantId: string | null;
  shiftId: string | null;
  dateTime: string | null;
  partySize: number;
  enabled: boolean;
  source?: HoldSource;
  eventId?: string | null;
  promotionId?: string | null;
  appliedPromoCode?: string | null;
}

export interface UseReservationHoldReturn {
  state: HoldState;
  visualState: HoldVisualState;
  createHold: () => Promise<{ holdId: string; expiresAt: string } | null>;
  updateDiner: (input: {
    name?: string;
    email?: string;
    phone?: string;
    specialRequest?: string;
    dietaryNotes?: string;
    occasion?: string;
    seatingPreference?: string;
  }) => Promise<{ ok: boolean; reason?: HoldUnavailableReason }>;
  updateCart: (
    cartSnapshot: Record<string, unknown>,
    totalAmountCents: number,
  ) => Promise<{ ok: boolean; reason?: HoldUnavailableReason }>;
  confirmHoldPayment: (
    paymentIntentId: string,
  ) => Promise<ConfirmHoldPaidResponse | null>;
  grabAgain: () => Promise<boolean>;
  cancelHold: () => Promise<void>;
  confirmConverted: (reservationId: string, confirmationCode: string) => void;
}

type StoredHold = {
  holdId: string;
  expiresAt: string;
  confirmationCode: string;
  tableIds: string[];
  durationMinutes: number;
  depositAmountCents: number;
  serverSkewMs: number;
  createdAt: string;
};

const HEARTBEAT_INTERVAL_MS = 30_000;
const TIMER_TICK_MS = 1_000;
const WARNING_THRESHOLD_SECONDS = 5 * 60;
const URGENT_THRESHOLD_SECONDS = 60;

function storageKey(restaurantId: string, dateTime: string): string {
  return key(`hold:${restaurantId}:${dateTime}`);
}

function uuidV4(): string {
  // Minimal RFC4122 v4 generator — good enough for an idempotency key.
  const hex = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) {
      out += '-';
    } else if (i === 14) {
      out += '4';
    } else if (i === 19) {
      out += hex[(Math.floor(Math.random() * 16) & 0x3) | 0x8];
    } else {
      out += hex[Math.floor(Math.random() * 16)];
    }
  }
  return out;
}

function computeSecondsLeft(expiresAt: string, serverSkewMs: number): number {
  const nowMs = Date.now() - serverSkewMs;
  const remaining = Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000);
  return Math.max(0, remaining);
}

function deriveVisualState(secondsLeft: number): HoldVisualState {
  if (secondsLeft <= URGENT_THRESHOLD_SECONDS) return 'urgent';
  if (secondsLeft <= WARNING_THRESHOLD_SECONDS) return 'warning';
  return 'calm';
}

export function useReservationHold(args: UseReservationHoldArgs): UseReservationHoldReturn {
  const {
    restaurantId,
    shiftId,
    dateTime,
    partySize,
    enabled,
    source = 'app',
    eventId = null,
    promotionId = null,
    appliedPromoCode = null,
  } = args;

  const [state, setState] = useState<HoldState>({ status: 'idle' });
  const stateRef = useRef<HoldState>(state);
  stateRef.current = state;

  const createInflightRef = useRef(false);
  const hydratedRef = useRef(false);

  const persistedKey = restaurantId && dateTime ? storageKey(restaurantId, dateTime) : null;

  const persistHold = useCallback(
    async (stored: StoredHold) => {
      if (!persistedKey) return;
      try {
        await AsyncStorage.setItem(persistedKey, JSON.stringify(stored));
      } catch {
        /* ignore */
      }
    },
    [persistedKey],
  );

  const clearPersistedHold = useCallback(async () => {
    if (!persistedKey) return;
    try {
      await AsyncStorage.removeItem(persistedKey);
    } catch {
      /* ignore */
    }
  }, [persistedKey]);

  const transitionToActive = useCallback(
    (resp: CreateHoldResponse | StoredHold, persisted: StoredHold) => {
      const secondsLeft = computeSecondsLeft(persisted.expiresAt, persisted.serverSkewMs);
      if (secondsLeft <= 0) {
        setState({ status: 'expired', holdId: persisted.holdId });
        return;
      }
      setState({
        status: 'active',
        holdId: persisted.holdId,
        expiresAt: persisted.expiresAt,
        secondsLeft,
        serverSkewMs: persisted.serverSkewMs,
        depositAmountCents: persisted.depositAmountCents,
        confirmationCode: persisted.confirmationCode,
        tableIds: persisted.tableIds,
        durationMinutes: persisted.durationMinutes,
      });
    },
    [],
  );

  // Hydrate from AsyncStorage on mount / when keys change.
  useEffect(() => {
    hydratedRef.current = false;
    if (!enabled || !persistedKey || !isHoldsEnabled()) {
      setState({ status: 'idle' });
      hydratedRef.current = true;
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const raw = await AsyncStorage.getItem(persistedKey);
        if (cancelled) return;
        if (!raw) {
          hydratedRef.current = true;
          return;
        }
        const parsed = JSON.parse(raw) as StoredHold;
        if (!parsed?.holdId || !parsed.expiresAt) {
          await clearPersistedHold();
          hydratedRef.current = true;
          return;
        }
        transitionToActive(parsed, parsed);
      } catch {
        /* ignore parse errors */
      } finally {
        hydratedRef.current = true;
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, persistedKey, clearPersistedHold, transitionToActive]);

  const createHold = useCallback(async (): Promise<{ holdId: string; expiresAt: string } | null> => {
    if (!isHoldsEnabled()) return null;
    if (!restaurantId || !shiftId || !dateTime || partySize <= 0) return null;
    if (createInflightRef.current) return null;
    const current = stateRef.current;
    if (current.status === 'active' || current.status === 'creating' || current.status === 'converting' || current.status === 'confirmed') {
      return null;
    }

    createInflightRef.current = true;
    setState({ status: 'creating' });
    try {
      const resp = await createReservationHold({
        restaurant_id: restaurantId,
        shift_id: shiftId,
        date_time: dateTime,
        party_size: partySize,
        source,
        idempotency_key: uuidV4(),
        event_id: eventId,
        promotion_id: promotionId,
        applied_promo_code: appliedPromoCode,
      });
      const serverSkewMs = Date.now() - new Date(resp.server_now).getTime();
      const stored: StoredHold = {
        holdId: resp.hold_id,
        expiresAt: resp.expires_at,
        confirmationCode: resp.confirmation_code,
        tableIds: resp.table_ids,
        durationMinutes: resp.duration_minutes,
        depositAmountCents: resp.deposit_amount_cents,
        serverSkewMs,
        createdAt: new Date().toISOString(),
      };
      await persistHold(stored);
      transitionToActive(resp, stored);
      return { holdId: resp.hold_id, expiresAt: resp.expires_at };
    } catch (error) {
      const reason = error instanceof HoldApiError ? error.reason : 'unknown';
      const message = error instanceof Error ? error.message : 'Could not hold your table.';
      setState({ status: 'error', message, reason });
      return null;
    } finally {
      createInflightRef.current = false;
    }
  }, [
    restaurantId,
    shiftId,
    dateTime,
    partySize,
    source,
    eventId,
    promotionId,
    appliedPromoCode,
    persistHold,
    transitionToActive,
  ]);

  // Auto-create on mount once hydration finishes (matches web behaviour).
  useEffect(() => {
    if (!enabled || !isHoldsEnabled()) return;
    if (!restaurantId || !shiftId || !dateTime || partySize <= 0) return;
    let cancelled = false;
    void (async () => {
      // Wait for hydration to land before deciding whether to auto-create.
      for (let i = 0; i < 50; i++) {
        if (hydratedRef.current) break;
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
      if (cancelled) return;
      const current = stateRef.current;
      if (current.status === 'idle') {
        void createHold();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, restaurantId, shiftId, dateTime, partySize, createHold]);

  // Countdown ticker — only runs while active and foregrounded.
  useEffect(() => {
    if (state.status !== 'active') return;
    let timerId: ReturnType<typeof setInterval> | null = null;
    let appStateSub: { remove: () => void } | null = null;

    const tick = () => {
      const current = stateRef.current;
      if (current.status !== 'active') return;
      const secondsLeft = computeSecondsLeft(current.expiresAt, current.serverSkewMs);
      if (secondsLeft <= 0) {
        setState({ status: 'expired', holdId: current.holdId });
        return;
      }
      if (secondsLeft !== current.secondsLeft) {
        setState({ ...current, secondsLeft });
      }
    };

    const startTimer = () => {
      if (timerId !== null) return;
      timerId = setInterval(tick, TIMER_TICK_MS);
    };
    const stopTimer = () => {
      if (timerId === null) return;
      clearInterval(timerId);
      timerId = null;
    };

    if (AppState.currentState === 'active') startTimer();
    appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        tick();
        startTimer();
      } else {
        stopTimer();
      }
    });

    return () => {
      stopTimer();
      appStateSub?.remove();
    };
  }, [state.status]);

  // Heartbeat to keep the server-side hold extended while active and foregrounded.
  useEffect(() => {
    if (state.status !== 'active') return;
    const holdId = state.holdId;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let appStateSub: { remove: () => void } | null = null;

    const fireHeartbeat = () => {
      // TODO(activity-gated heartbeat): only fire when there's been recent
      // user input; for v1 we beat unconditionally while foregrounded.
      heartbeatReservationHold(holdId, 120).catch((error) => {
        if (error instanceof HoldApiError && error.status === 410) {
          setState({ status: 'expired', holdId });
        }
      });
    };

    const startHeartbeat = () => {
      if (intervalId !== null) return;
      intervalId = setInterval(fireHeartbeat, HEARTBEAT_INTERVAL_MS);
    };
    const stopHeartbeat = () => {
      if (intervalId === null) return;
      clearInterval(intervalId);
      intervalId = null;
    };

    if (AppState.currentState === 'active') startHeartbeat();
    appStateSub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') startHeartbeat();
      else stopHeartbeat();
    });

    return () => {
      stopHeartbeat();
      appStateSub?.remove();
    };
  }, [state.status, state.status === 'active' ? state.holdId : null]);

  const updateDinerImpl = useCallback<UseReservationHoldReturn['updateDiner']>(
    async (input) => {
      const current = stateRef.current;
      if (current.status !== 'active') return { ok: false, reason: 'hold_not_found' };
      try {
        await updateReservationHold({
          hold_id: current.holdId,
          full_name: input.name,
          email: input.email,
          phone: input.phone,
          special_request: input.specialRequest,
          dietary_notes: input.dietaryNotes,
          occasion: input.occasion,
          seating_preference: input.seatingPreference,
        });
        return { ok: true };
      } catch (error) {
        const reason = error instanceof HoldApiError ? error.reason : 'unknown';
        if (reason === 'hold_expired') {
          setState({ status: 'expired', holdId: current.holdId });
        }
        return { ok: false, reason };
      }
    },
    [],
  );

  const updateCartImpl = useCallback<UseReservationHoldReturn['updateCart']>(
    async (cartSnapshot, totalAmountCents) => {
      const current = stateRef.current;
      if (current.status !== 'active') return { ok: false, reason: 'hold_not_found' };
      try {
        await updateReservationHold({
          hold_id: current.holdId,
          cart_snapshot: cartSnapshot,
          total_amount_cents: totalAmountCents,
        });
        return { ok: true };
      } catch (error) {
        const reason = error instanceof HoldApiError ? error.reason : 'unknown';
        if (reason === 'hold_expired') {
          setState({ status: 'expired', holdId: current.holdId });
        }
        return { ok: false, reason };
      }
    },
    [],
  );

  const confirmHoldPaymentImpl = useCallback<UseReservationHoldReturn['confirmHoldPayment']>(
    async (paymentIntentId) => {
      const current = stateRef.current;
      if (current.status !== 'active') return null;
      setState({ status: 'converting' });
      try {
        const resp = await confirmHoldPaid(current.holdId, paymentIntentId);
        await clearPersistedHold();
        setState({
          status: 'confirmed',
          reservationId: resp.reservation_id,
          confirmationCode: resp.confirmation_code,
        });
        return resp;
      } catch (error) {
        const reason = error instanceof HoldApiError ? error.reason : 'unknown';
        const message = error instanceof Error ? error.message : 'Could not confirm your reservation.';
        if (reason === 'hold_expired') {
          setState({ status: 'expired', holdId: current.holdId });
        } else {
          setState({ status: 'error', message, reason });
        }
        return null;
      }
    },
    [clearPersistedHold],
  );

  const grabAgain = useCallback(async () => {
    await clearPersistedHold();
    setState({ status: 'idle' });
    const result = await createHold();
    return Boolean(result);
  }, [clearPersistedHold, createHold]);

  const cancelHoldImpl = useCallback(async () => {
    const current = stateRef.current;
    if (current.status === 'active' || current.status === 'expired') {
      const holdId = current.status === 'active' ? current.holdId : current.holdId;
      if (holdId) {
        try {
          await cancelReservationHold(holdId);
        } catch {
          /* best effort */
        }
      }
    }
    await clearPersistedHold();
    setState({ status: 'idle' });
  }, [clearPersistedHold]);

  const confirmConverted = useCallback<UseReservationHoldReturn['confirmConverted']>(
    (reservationId, confirmationCode) => {
      void clearPersistedHold();
      setState({ status: 'confirmed', reservationId, confirmationCode });
    },
    [clearPersistedHold],
  );

  // Best-effort cancel on unmount when the hold is still active.
  useEffect(() => {
    return () => {
      const current = stateRef.current;
      if (current.status === 'active') {
        fireAndForgetCancel(current.holdId);
        // Don't await — the layout is unmounting.
        void clearPersistedHold();
      }
    };
  }, [clearPersistedHold]);

  const visualState = useMemo<HoldVisualState>(() => {
    if (state.status !== 'active') return 'calm';
    return deriveVisualState(state.secondsLeft);
  }, [state]);

  return useMemo<UseReservationHoldReturn>(
    () => ({
      state,
      visualState,
      createHold,
      updateDiner: updateDinerImpl,
      updateCart: updateCartImpl,
      confirmHoldPayment: confirmHoldPaymentImpl,
      grabAgain,
      cancelHold: cancelHoldImpl,
      confirmConverted,
    }),
    [
      state,
      visualState,
      createHold,
      updateDinerImpl,
      updateCartImpl,
      confirmHoldPaymentImpl,
      grabAgain,
      cancelHoldImpl,
      confirmConverted,
    ],
  );
}
