// @ts-nocheck
// Phone number normalization (server side). Must stay in lockstep with
// `lib/validation/phone.ts` on the client — the rules are intentionally
// duplicated rather than fetched at runtime so the server can reject bad
// input before any DB or auth operation, and so the client can short-
// circuit invalid numbers without a network round-trip.

export function normalizePhoneToE164(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  if (raw.startsWith("+")) {
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith("1")) {
    return `+${digits}`;
  }

  return null;
}
