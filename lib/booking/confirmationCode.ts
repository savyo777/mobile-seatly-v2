// Client-side reservation confirmation-code generator. Mirrors
// `supabase/functions/_shared/confirmation-code.ts` so codes generated
// client-side (preorder checkout, demo bookings) match the format the
// server uses for real reservations. The DB column is the source of
// truth; legacy prefixes (SEAT-, PRE-, CNV-) remain valid for lookup.

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
const PREFIX = 'CEN';
const LENGTH = 6;

export function makeConfirmationCode(): string {
  let code = `${PREFIX}-`;
  for (let i = 0; i < LENGTH; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

export function isValidConfirmationCode(code: string): boolean {
  return /^(CEN|SEAT|PRE|CNV)-[A-Z0-9]{4,8}$/i.test(code.trim());
}
