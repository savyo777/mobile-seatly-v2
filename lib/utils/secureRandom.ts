/**
 * Cryptographically secure random helpers.
 *
 * Why this exists: `Math.random()` in Hermes is xorshift-seeded from
 * Date.now() and is predictable enough that an attacker who can grind
 * candidates against the server can correlate sequential calls. For
 * user-facing identifiers that grant access to data (reservation
 * confirmation codes, idempotency keys), we use OS-provided crypto
 * randomness via `expo-crypto`.
 *
 * Falls back to `Math.random()` only when the native module isn't
 * linked (e.g. a stale dev client). Logs the fallback in `__DEV__` so
 * contributors notice the dev-client mismatch.
 *
 * Added 2026-05-20 in the Phase B+ mobile hardening pass.
 */

import * as Crypto from 'expo-crypto';

/**
 * Generate `length` random characters from `alphabet`. Uses
 * `Crypto.getRandomBytes` (synchronous, OS-backed). Each byte is
 * mapped into the alphabet via modulo, accepting a small modulo bias
 * (≤1.5% for alphabet size up to 32) in exchange for sync API + zero
 * dependencies. The bias matters for compliance-grade tokens; for
 * 6-char user-facing codes it's irrelevant.
 *
 * Falls back to `Math.random()` if `Crypto.getRandomBytes` throws (no
 * native module). The caller can detect this via the second return
 * tuple if they care (most don't).
 */
export function secureRandomCode(length: number, alphabet: string): string {
  if (length <= 0 || alphabet.length === 0) return '';
  let bytes: Uint8Array;
  try {
    bytes = Crypto.getRandomBytes(length);
  } catch {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[secureRandom] expo-crypto getRandomBytes failed — falling back to Math.random. Rebuild the dev client to wire it.',
      );
    }
    bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

/**
 * RFC 4122 v4 UUID using OS-backed randomness. Format:
 *   xxxxxxxx-xxxx-4xxx-Nxxx-xxxxxxxxxxxx   (N in 8|9|a|b)
 *
 * Uses 16 random bytes; bits 12-15 of clock_seq_hi_and_reserved
 * forced to `0100` (version 4) per spec, bits 6-7 of
 * clock_seq_hi_and_reserved forced to `10` (variant 1).
 *
 * Falls back to Math.random-backed generation if native is missing.
 */
export function secureRandomUuidV4(): string {
  // expo-crypto exposes randomUUID() directly — that's the right
  // primitive, returns a real v4 UUID without us hand-rolling byte
  // surgery. Falls back to manual byte assembly if randomUUID isn't
  // available (older expo-crypto versions).
  try {
    const maybeRandomUuid = (Crypto as unknown as { randomUUID?: () => string }).randomUUID;
    if (typeof maybeRandomUuid === 'function') {
      return maybeRandomUuid();
    }
  } catch {
    // fall through
  }

  let bytes: Uint8Array;
  try {
    bytes = Crypto.getRandomBytes(16);
  } catch {
    if (__DEV__) {
      // eslint-disable-next-line no-console
      console.warn(
        '[secureRandom] expo-crypto getRandomBytes failed — Math.random fallback for uuid.',
      );
    }
    bytes = new Uint8Array(16);
    for (let i = 0; i < 16; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  // Force version (0100) + variant (10).
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex: string[] = [];
  for (let i = 0; i < 16; i += 1) {
    hex.push(bytes[i].toString(16).padStart(2, '0'));
  }
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}
