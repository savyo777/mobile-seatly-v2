import {
  normalizeEmail,
  normalizeIntegerRange,
  normalizeMoneyInput,
  normalizeName,
  normalizePhoneInput,
  normalizeTextInput,
  sanitizeCardNumberInput,
  sanitizeOtpInput,
  sanitizePostalCodeInput,
  sanitizePromoCodeInput,
  sanitizeTextInput,
} from '@/lib/validation/input';

describe('input validation helpers', () => {
  it('normalizes email without accepting malformed addresses', () => {
    expect(normalizeEmail(' USER@Example.COM ')).toBe('user@example.com');
    expect(normalizeEmail('not-an-email')).toBeNull();
  });

  it('preserves normal free text while removing unsafe control characters', () => {
    expect(sanitizeTextInput('hello\u0000 world! 🍝', { multiline: true })).toBe('hello world! 🍝');
    expect(normalizeTextInput('  hello   world \n\n\n thanks  ', { multiline: true })).toBe('hello world\n\n thanks');
  });

  it('normalizes names and phone numbers', () => {
    expect(normalizeName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
    expect(normalizePhoneInput('(416) 555-1234')).toBe('+14165551234');
    expect(normalizePhoneInput('123')).toBeNull();
  });

  it('sanitizes structured numeric, card, postal, and promo-code inputs', () => {
    expect(normalizeIntegerRange('42abc', { min: 1, max: 50 })).toBe(42);
    expect(normalizeMoneyInput('$12,34')).toBe(12.34);
    expect(sanitizeCardNumberInput('4242x4242 4242 4242')).toBe('4242 4242 4242 4242');
    expect(sanitizeOtpInput('12 34ab56')).toBe('123456');
    expect(sanitizePostalCodeInput('m5v! 2t6')).toBe('M5V 2T6');
    expect(sanitizePromoCodeInput('save 10!')).toBe('SAVE10');
  });
});
