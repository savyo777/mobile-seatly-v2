// Login lockout policy applied to both customer and owner login screens.
// Single source of truth so the customer and owner login surfaces never drift.

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes
