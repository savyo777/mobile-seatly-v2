/**
 * Regression coverage for the friendlyError → string-input bug.
 *
 * Before the 2026-05-28 fix, every Hey Cenaiva error surfaced the generic
 * "Something went wrong. Please try again." message because the orchestrator
 * hook stored error codes as raw strings (e.g. 'not_authenticated',
 * 'no_final_payload', 'timeout') but friendlyError's `extractCandidateCodes`
 * only inspected object fields. Every Hey Cenaiva interaction (voice / text /
 * restaurant-card tap) went through the same broken path → identical generic
 * error for the user.
 *
 * These tests lock in:
 *   - String inputs that exactly match a code table return the mapped copy.
 *   - The orchestrator's specific codes (not_authenticated, timeout,
 *     no_final_payload, etc.) all surface their intended messages.
 *   - The server-side rate-limit plain-English message routes to the
 *     rate-limit copy.
 *   - HTTP status fallback strings (`http_429`, `http_500`) route to the
 *     right copy.
 */

import { friendlyError, isUserCancellation } from '@/lib/errors/friendlyError';

describe('friendlyError', () => {
  describe('bare string codes (orchestrator path)', () => {
    it('maps not_authenticated to the sign-in prompt', () => {
      expect(friendlyError('not_authenticated')).toBe(
        'Please sign in to continue.',
      );
    });

    it('maps auth_required (server-side alias) to the sign-in prompt', () => {
      expect(friendlyError('auth_required')).toBe(
        'Please sign in to continue.',
      );
    });

    it('maps timeout to the assistant-slow copy', () => {
      expect(friendlyError('timeout')).toBe(
        'The assistant is taking a while. Try again.',
      );
    });

    it('maps no_final_payload to the assistant-incomplete copy', () => {
      expect(friendlyError('no_final_payload')).toBe(
        "Cenaiva didn't finish that one. Please try again.",
      );
    });

    it('maps rate_limit_minute to the slow-down copy', () => {
      expect(friendlyError('rate_limit_minute')).toBe(
        'Slow down for a moment and try again.',
      );
    });

    it('maps rate_limit_day to the daily-cap copy', () => {
      expect(friendlyError('rate_limit_day')).toBe(
        "You've used Hey Cenaiva a lot today. Try again tomorrow.",
      );
    });

    it('maps validation_failed to the request-malformed copy', () => {
      expect(friendlyError('validation_failed')).toBe(
        "Cenaiva couldn't understand that request. Please try again.",
      );
    });
  });

  describe('substring + status-string fallbacks', () => {
    it('detects "Too many requests" → rate-limit copy', () => {
      expect(
        friendlyError(
          'Too many requests. Please wait a moment before trying again.',
        ),
      ).toBe('Slow down for a moment and try again.');
    });

    it('detects http_429 → rate-limit copy', () => {
      expect(friendlyError('http_429')).toBe(
        'Slow down for a moment and try again.',
      );
    });

    it('detects http_500 → Cenaiva-trouble copy', () => {
      expect(friendlyError('http_500')).toBe(
        'Cenaiva is having trouble right now. Please try again in a moment.',
      );
    });

    it('detects http_401 → sign-in copy', () => {
      expect(friendlyError('http_401')).toBe('Please sign in to continue.');
    });
  });

  describe('object-shaped errors still work (regression)', () => {
    it('extracts code from { code: ... }', () => {
      expect(friendlyError({ code: 'not_authenticated' })).toBe(
        'Please sign in to continue.',
      );
    });

    it('extracts code from { unavailable_reason: ... }', () => {
      expect(friendlyError({ unavailable_reason: 'slot_taken' })).toBe(
        'That time was just booked by someone else. Pick another slot.',
      );
    });
  });

  describe('fallback', () => {
    it('returns the supplied fallback when nothing matches', () => {
      expect(friendlyError('totally-unknown-code', 'Saved with a hiccup.')).toBe(
        'Saved with a hiccup.',
      );
    });

    it('returns the generic fallback when no fallback supplied', () => {
      expect(friendlyError('totally-unknown-code')).toBe(
        'Something went wrong. Please try again.',
      );
    });

    it('returns the fallback for null input', () => {
      expect(friendlyError(null, 'My fallback')).toBe('My fallback');
    });
  });

  describe('isUserCancellation', () => {
    it('detects Stripe Canceled', () => {
      expect(isUserCancellation({ code: 'Canceled' })).toBe(true);
    });
    it('returns false for real errors', () => {
      expect(isUserCancellation({ code: 'card_declined' })).toBe(false);
    });
  });
});
