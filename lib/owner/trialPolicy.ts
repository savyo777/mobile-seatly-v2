// Owner free-trial duration. Single source of truth.
//
// Canonical = 90 DAYS, enforced server-side and anchored to the PUBLISH day:
// publish-restaurant creates the Stripe subscription with trial_period_days: 90.
// The client labels below are a pre-publish ESTIMATE only — the real trial clock
// starts when the restaurant goes live to diners, not at registration.

const DEFAULT_OWNER_TRIAL_DAYS = 90;

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const OWNER_TRIAL_DAYS = envNumber(
  'EXPO_PUBLIC_OWNER_TRIAL_DAYS',
  DEFAULT_OWNER_TRIAL_DAYS,
);

/** Display label, e.g. "90-day". */
export function ownerTrialLengthLabel(): string {
  return `${OWNER_TRIAL_DAYS}-day`;
}

/** Estimated trial-end date (base + trial days). Display only. */
export function ownerTrialEndDate(base: Date = new Date()): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + OWNER_TRIAL_DAYS);
  return d;
}
