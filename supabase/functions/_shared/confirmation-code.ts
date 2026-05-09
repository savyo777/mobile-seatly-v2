// @ts-nocheck
// Reservation confirmation code generator. Previously two functions had
// two implementations:
//   - _shared/booking.ts: 4 chars base36 (~1.7M codes — collision-prone)
//   - create-public-booking/index.ts: 6 chars Crockford-like
// Use the longer 6-char Crockford alphabet everywhere; the DB
// `reservations.confirmation_code` column should be UNIQUE so we can
// retry on the rare collision rather than trust uniqueness blindly.

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
const PREFIX = "SEAT";
const LENGTH = 6;

export function makeConfirmationCode(): string {
  let code = `${PREFIX}-`;
  for (let i = 0; i < LENGTH; i += 1) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}
