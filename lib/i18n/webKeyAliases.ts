/**
 * Reference map: StevenGeorgy/Seatly web i18n paths (namespace `common`) vs mobile keys.
 * Use when porting copy or auditing parity — does not affect runtime.
 */

export const WEB_BOOKING_STEP_TITLES = {
  step1: 'common.booking.step1.title',
  step2: 'common.booking.step2.title',
  step3: 'common.booking.step3.title',
  step4: 'common.booking.step4.title',
  step5: 'common.booking.step5.title',
  step6: 'common.booking.step6.title',
  step7: 'common.booking.step7.title',
} as const;

/** Mobile [`lib/i18n/locales/en.ts`](./locales/en.ts) keys for the same steps */
export const MOBILE_BOOKING_STEP_KEYS = {
  step1: 'booking.step1Title',
  step2: 'booking.step2Title',
  step3: 'booking.step3Title',
  step4: 'booking.step4Title',
  step5: 'booking.step5Title',
  step6: 'booking.step6Title',
  step7: 'booking.step7Title',
} as const;
