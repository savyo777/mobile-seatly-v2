export const MAX_ONLINE_PARTY_SIZE = 150;

export const BOOKING_WINDOW_MIN_DAYS = 7;
export const BOOKING_WINDOW_MAX_DAYS = 182;
export const BOOKING_WINDOW_STEP_DAYS = 7;
export const DEFAULT_BOOKING_WINDOW_DAYS = 63;

// Re-export booking defaults so existing imports of bookingLimits continue
// to find what they need. New code should import from `bookingDefaults`
// directly.
export {
  BOOKING_STEPS_TOTAL,
  DEFAULT_TURN_MINUTES,
  DEFAULT_SLOT_DURATION_MINUTES,
  DEFAULT_TIMEZONE,
  DEFAULT_CURRENCY,
  DEFAULT_MAX_COVERS,
  DEFAULT_MAX_PARTY_SIZE,
  DEFAULT_MIN_PARTY_SIZE,
  DEFAULT_ADVANCE_BOOKING_DAYS,
  DEFAULT_TAX_RATE_FALLBACK,
  SLOT_DURATION_OPTIONS,
  NOTICE_OPTIONS,
} from '@/lib/booking/bookingDefaults';
