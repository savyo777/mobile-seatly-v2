import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useReservationHold, type UseReservationHoldReturn } from '@/lib/booking/useReservationHold';
import type { HoldSource } from '@/lib/booking/holdApi';

export interface HoldConfig {
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

export interface ReservationHoldContextValue extends UseReservationHoldReturn {
  configure: (config: HoldConfig) => void;
  config: HoldConfig;
}

const DEFAULT_CONFIG: HoldConfig = {
  restaurantId: null,
  shiftId: null,
  dateTime: null,
  partySize: 0,
  enabled: false,
  source: 'app',
  eventId: null,
  promotionId: null,
  appliedPromoCode: null,
};

const ReservationHoldContext = createContext<ReservationHoldContextValue | null>(null);

export function ReservationHoldProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<HoldConfig>(DEFAULT_CONFIG);

  const hold = useReservationHold({
    restaurantId: config.restaurantId,
    shiftId: config.shiftId,
    dateTime: config.dateTime,
    partySize: config.partySize,
    enabled: config.enabled,
    source: config.source,
    eventId: config.eventId,
    promotionId: config.promotionId,
    appliedPromoCode: config.appliedPromoCode,
  });

  const configure = useCallback((next: HoldConfig) => {
    setConfig((prev) => {
      if (
        prev.restaurantId === next.restaurantId &&
        prev.shiftId === next.shiftId &&
        prev.dateTime === next.dateTime &&
        prev.partySize === next.partySize &&
        prev.enabled === next.enabled &&
        prev.source === next.source &&
        prev.eventId === next.eventId &&
        prev.promotionId === next.promotionId &&
        prev.appliedPromoCode === next.appliedPromoCode
      ) {
        return prev;
      }
      return next;
    });
  }, []);

  const value = useMemo<ReservationHoldContextValue>(
    () => ({ ...hold, configure, config }),
    [hold, configure, config],
  );

  return (
    <ReservationHoldContext.Provider value={value}>{children}</ReservationHoldContext.Provider>
  );
}

export function useReservationHoldContext(): ReservationHoldContextValue {
  const ctx = useContext(ReservationHoldContext);
  if (!ctx) {
    throw new Error('useReservationHoldContext must be used inside <ReservationHoldProvider>.');
  }
  return ctx;
}

// Optional read — returns null when no provider is mounted. Useful for
// components that may render outside the booking flow.
export function useOptionalReservationHoldContext(): ReservationHoldContextValue | null {
  return useContext(ReservationHoldContext);
}
