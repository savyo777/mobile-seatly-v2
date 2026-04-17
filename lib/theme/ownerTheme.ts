import { appPalette } from '@/lib/theme/appPalette';

/**
 * Restaurant / owner app — same palette as customer (`appPalette`).
 * Gold only for actions, active filters, and key accents.
 */
export const ownerColors = {
  bg: appPalette.bgBase,
  bgSurface: appPalette.bgSurface,
  bgCard: appPalette.bgSurface,
  bgElevated: appPalette.bgElevated,
  bgGlass: 'rgba(255,255,255,0.035)',
  border: appPalette.border,
  borderStrong: 'rgba(255,255,255,0.09)',

  gold: appPalette.gold,
  goldMuted: 'rgba(201, 162, 74, 0.2)',
  goldSubtle: appPalette.goldSubtle,

  chartPositive: '#22C55E',
  chartNegative: '#EF4444',
  chartPositiveMuted: 'rgba(34, 197, 94, 0.3)',
  chartNegativeMuted: 'rgba(239, 68, 68, 0.3)',

  success: '#22C55E',
  danger: '#EF4444',
  warning: '#D4A574',

  text: appPalette.textPrimary,
  textSecondary: appPalette.textSecondary,
  textMuted: appPalette.textMuted,

  tableAvailable: '#22C55E',
  tableReserved: appPalette.gold,
  tableOccupied: '#EF4444',
  tableCleaning: appPalette.textMuted,
} as const;

export const ownerRadii = {
  sm: 10,
  md: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 26,
} as const;

export const ownerSpace = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Subtle lift — no colored glow */
export const ownerShadow = {
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
} as const;
