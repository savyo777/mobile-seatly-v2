// Phone number normalization. Mirrors `supabase/functions/_shared/phone.ts`
// (server side) — keep the two in sync because the validation runs on
// both client (before submit) and server (defense-in-depth).
//
// Rules (US/Canada-default app, since the launch market is Toronto):
// - If the input starts with `+`, the country-code-included number must be
//   8–15 digits (matches E.164 max 15, ITU min ~8 with country code).
// - Otherwise the user must enter exactly a 10-digit number, or an
//   11-digit number starting with `1` (US/CA country code without the `+`).
//   Anything else is rejected to avoid silently fabricating an
//   international number from raw input.

export function normalizePhoneToE164(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  if (raw.startsWith('+')) {
    if (digits.length < 8 || digits.length > 15) return null;
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+1${digits}`;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`;
  }

  return null;
}

/** Convenience boolean form. */
export function isValidPhoneE164(input: string): boolean {
  return normalizePhoneToE164(input) !== null;
}
