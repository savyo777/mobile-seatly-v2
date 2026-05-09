// Default values used as last-resort fallbacks throughout the booking layer.
// Database rows on `restaurants` and `shifts` should always supply these
// values explicitly. The defaults exist so the UI doesn't crash on partially
// configured rows; production code that relies on them should treat NULL as
// a config error and surface it rather than silently absorbing the default.

export const DEFAULT_TURN_MINUTES = 90;
export const DEFAULT_SLOT_DURATION_MINUTES = 30;
export const DEFAULT_TIMEZONE = 'UTC';
export const DEFAULT_CURRENCY = 'CAD';
export const DEFAULT_MAX_COVERS = 100;
export const DEFAULT_MAX_PARTY_SIZE = 20;
export const DEFAULT_MIN_PARTY_SIZE = 1;
export const DEFAULT_ADVANCE_BOOKING_DAYS = 30;

// Deprecated: do not rely on this fallback in production paths. The
// `restaurants.tax_rate` column is the source of truth; if it is missing,
// the call site should surface a "restaurant misconfigured" error instead.
// Kept here so the value lives in one place during the migration to fail-loud.
export const DEFAULT_TAX_RATE_FALLBACK = 0.13;

// Total number of steps in the customer booking flow. If you add or remove a
// step, update this constant — it drives the "Step N of M" header chips on
// each step screen.
export const BOOKING_STEPS_TOTAL = 6;

// Reservation-settings picker options.
export const SLOT_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120, 150, 180] as const;

/**
 * Minimum-notice picker options. Labels are i18n keys (resolved at render
 * time) — pairing each minute value with `labelKey` keeps the option list
 * locale-agnostic.
 */
export const NOTICE_OPTIONS = [
  { minutes: 0, labelKey: 'bookingNotice.none' },
  { minutes: 30, labelKey: 'bookingNotice.min30' },
  { minutes: 60, labelKey: 'bookingNotice.hour1' },
  { minutes: 120, labelKey: 'bookingNotice.hour2' },
  { minutes: 1440, labelKey: 'bookingNotice.hour24' },
] as const;

export type NoticeOption = typeof NOTICE_OPTIONS[number];
