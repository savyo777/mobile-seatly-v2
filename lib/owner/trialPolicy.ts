// Owner free-trial duration. Single source of truth — the 3-month copy used
// to live in 4+ files (registration form, success screen, supabase function).

const DEFAULT_OWNER_TRIAL_MONTHS = 3;

function envNumber(key: string, fallback: number): number {
  const raw = process.env[key];
  if (typeof raw !== 'string') return fallback;
  const parsed = Number(raw.trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export const OWNER_TRIAL_MONTHS = envNumber(
  'EXPO_PUBLIC_OWNER_TRIAL_MONTHS',
  DEFAULT_OWNER_TRIAL_MONTHS,
);

export function ownerTrialLengthLabel(): string {
  if (OWNER_TRIAL_MONTHS === 1) return '1-month';
  return `${OWNER_TRIAL_MONTHS}-month`;
}
