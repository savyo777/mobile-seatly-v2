import { z } from 'zod';
import { normalizePhoneToE164 } from './phone';

const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g;
const INVISIBLE_DIRECTIONAL_CHARS = /[\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

export type TextInputKind =
  | 'text'
  | 'multiline'
  | 'name'
  | 'email'
  | 'phone'
  | 'digits'
  | 'integer'
  | 'money'
  | 'postalCode'
  | 'url'
  | 'search'
  | 'otp'
  | 'cardNumber'
  | 'expiry'
  | 'cvc'
  | 'promoCode'
  | 'password';

export type TextSanitizeOptions = {
  maxLength?: number;
  multiline?: boolean;
};

function cap(value: string, maxLength?: number): string {
  return typeof maxLength === 'number' && maxLength >= 0 ? value.slice(0, maxLength) : value;
}

export function stripUnsafeControlChars(value: string): string {
  return value.replace(CONTROL_CHARS, '').replace(INVISIBLE_DIRECTIONAL_CHARS, '');
}

export function sanitizeTextInput(value: string, options: TextSanitizeOptions = {}): string {
  const cleaned = stripUnsafeControlChars(String(value ?? '')).replace(/\r\n?/g, '\n');
  if (options.multiline) return cap(cleaned, options.maxLength);
  return cap(cleaned.replace(/[\n\t]+/g, ' '), options.maxLength);
}

export function normalizeTextInput(value: string, options: TextSanitizeOptions = {}): string {
  const cleaned = sanitizeTextInput(value, options).trim();
  if (options.multiline) {
    return cleaned
      .split('\n')
      .map((line) => line.replace(/[ \t]+/g, ' ').trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n');
  }
  return cleaned.replace(/\s+/g, ' ');
}

export function sanitizeNameInput(value: string, maxLength = 80): string {
  return sanitizeTextInput(value, { maxLength });
}

export function normalizeName(value: string, maxLength = 80): string {
  return normalizeTextInput(value, { maxLength });
}

export function sanitizeEmailInput(value: string): string {
  return cap(stripUnsafeControlChars(value).replace(/\s+/g, '').toLowerCase(), 254);
}

export function normalizeEmail(value: string): string | null {
  const cleaned = sanitizeEmailInput(value);
  return EMAIL_RE.test(cleaned) ? cleaned : null;
}

export function isValidEmail(value: string): boolean {
  return normalizeEmail(value) !== null;
}

export function sanitizePhoneInput(value: string): string {
  return cap(stripUnsafeControlChars(value).replace(/[^\d+\-().\s]/g, ''), 32);
}

export function normalizePhoneInput(value: string): string | null {
  return normalizePhoneToE164(sanitizePhoneInput(value));
}

export function sanitizeDigitsInput(value: string, maxLength = Number.POSITIVE_INFINITY): string {
  return cap(String(value ?? '').replace(/\D/g, ''), maxLength);
}

export function sanitizeIntegerInput(value: string, maxLength = 6): string {
  return sanitizeDigitsInput(value, maxLength);
}

export function normalizeIntegerRange(
  value: string,
  options: { min?: number; max?: number; fallback?: number | null } = {},
): number | null {
  const digits = sanitizeIntegerInput(value);
  if (!digits) return options.fallback ?? null;
  const parsed = Number.parseInt(digits, 10);
  if (!Number.isFinite(parsed)) return options.fallback ?? null;
  const min = options.min ?? Number.NEGATIVE_INFINITY;
  const max = options.max ?? Number.POSITIVE_INFINITY;
  return Math.max(min, Math.min(max, parsed));
}

export function sanitizeMoneyInput(value: string): string {
  const cleaned = stripUnsafeControlChars(value).replace(/[^0-9.,-]/g, '').replace(',', '.');
  const negative = cleaned.startsWith('-') ? '-' : '';
  const [whole = '', decimal = ''] = cleaned.replace(/-/g, '').split('.');
  return cap(`${negative}${whole}${decimal.length ? `.${decimal.slice(0, 2)}` : ''}`, 14);
}

export function normalizeMoneyInput(value: string): number | null {
  const cleaned = sanitizeMoneyInput(value);
  if (!cleaned || cleaned === '-') return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

export function sanitizePostalCodeInput(value: string): string {
  return cap(stripUnsafeControlChars(value).toUpperCase().replace(/[^A-Z0-9 -]/g, ''), 16);
}

export function sanitizeUrlInput(value: string): string {
  return cap(stripUnsafeControlChars(value).trim(), 2048);
}

export function normalizeUrlInput(value: string): string | null {
  const cleaned = sanitizeUrlInput(value);
  if (!cleaned) return null;
  const withScheme = /^https?:\/\//i.test(cleaned) ? cleaned : `https://${cleaned}`;
  return URL_RE.test(withScheme) ? withScheme : null;
}

export function sanitizeSearchInput(value: string): string {
  return normalizeTextInput(value, { maxLength: 120 });
}

export function sanitizeOtpInput(value: string): string {
  return sanitizeDigitsInput(value, 6);
}

export function sanitizeCardNumberInput(value: string): string {
  return sanitizeDigitsInput(value, 19).replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

export function sanitizeExpiryInput(value: string): string {
  const digits = sanitizeDigitsInput(value, 4);
  return digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
}

export function sanitizeCvcInput(value: string, maxLength = 4): string {
  return sanitizeDigitsInput(value, maxLength);
}

export function sanitizePromoCodeInput(value: string): string {
  return cap(stripUnsafeControlChars(value).toUpperCase().replace(/[^A-Z0-9_-]/g, ''), 32);
}

export function sanitizeInputByKind(
  value: string,
  kind: TextInputKind = 'text',
  options: TextSanitizeOptions = {},
): string {
  switch (kind) {
    case 'multiline':
      return sanitizeTextInput(value, { ...options, multiline: true });
    case 'name':
      return sanitizeNameInput(value, options.maxLength);
    case 'email':
      return sanitizeEmailInput(value);
    case 'phone':
      return sanitizePhoneInput(value);
    case 'digits':
    case 'integer':
      return sanitizeIntegerInput(value, options.maxLength);
    case 'money':
      return sanitizeMoneyInput(value);
    case 'postalCode':
      return sanitizePostalCodeInput(value);
    case 'url':
      return sanitizeUrlInput(value);
    case 'search':
      return sanitizeSearchInput(value);
    case 'otp':
      return sanitizeOtpInput(value);
    case 'cardNumber':
      return sanitizeCardNumberInput(value);
    case 'expiry':
      return sanitizeExpiryInput(value);
    case 'cvc':
      return sanitizeCvcInput(value, options.maxLength);
    case 'promoCode':
      return sanitizePromoCodeInput(value);
    case 'password':
      return value;
    case 'text':
    default:
      return sanitizeTextInput(value, options);
  }
}

export const ValidationSchemas = {
  email: z.string().transform((value) => normalizeEmail(value)).refine(Boolean, {
    message: 'Enter a valid email address.',
  }),
  phone: z.string().transform((value) => normalizePhoneInput(value)).refine(Boolean, {
    message: 'Enter a valid phone number.',
  }),
  name: z.string().transform((value) => normalizeName(value)).refine((value) => value.length > 0, {
    message: 'Enter a name.',
  }),
  freeText: (maxLength = 1000) =>
    z.string().transform((value) => normalizeTextInput(value, { maxLength, multiline: true })),
  requiredText: (maxLength = 160) =>
    z.string().transform((value) => normalizeTextInput(value, { maxLength })).refine((value) => value.length > 0, {
      message: 'This field is required.',
    }),
  integerRange: (min: number, max: number) =>
    z.string().transform((value) => normalizeIntegerRange(value, { min, max })).refine((value) => value !== null, {
      message: `Enter a number from ${min} to ${max}.`,
    }),
};
