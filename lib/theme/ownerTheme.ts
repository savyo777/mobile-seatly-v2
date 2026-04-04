/**
 * Seatly Owner App — black & gold luxury OS. No blue in UI.
 */
export const ownerColors = {
  bg: '#080B16',
  /** Cards: dark charcoal */
  bgCard: '#12151F',
  bgElevated: '#0D1224',
  bgGlass: 'rgba(255,255,255,0.04)',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.14)',

  /** Primary accent — gold only */
  gold: '#D4AF37',
  goldMuted: 'rgba(212, 175, 55, 0.22)',
  goldSubtle: 'rgba(212, 175, 55, 0.12)',

  /** Charts: green / red only */
  chartPositive: '#22C55E',
  chartNegative: '#EF4444',
  chartPositiveMuted: 'rgba(34, 197, 94, 0.35)',
  chartNegativeMuted: 'rgba(239, 68, 68, 0.35)',

  success: '#22C55E',
  danger: '#EF4444',
  warning: '#FBBF24',

  text: '#FFFFFF',
  textSecondary: 'rgba(255,255,255,0.72)',
  textMuted: 'rgba(255,255,255,0.45)',

  tableAvailable: '#22C55E',
  tableReserved: '#FBBF24',
  tableOccupied: '#EF4444',
  tableCleaning: '#64748B',
} as const;

export const ownerRadii = {
  xl: 16,
  '2xl': 20,
  '3xl': 28,
} as const;

export const ownerShadow = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  glow: {
    shadowColor: '#D4AF37',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
} as const;
