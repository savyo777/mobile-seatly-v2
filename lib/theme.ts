export const colors = {
  gold: '#C9A84C',
  goldLight: '#F5E6C8',
  goldDark: '#A8873A',

  bgBase: '#0A0A0A',
  bgSurface: '#1A1A1A',
  bgElevated: '#242424',
  border: '#2E2E2E',

  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',

  tableEmpty: '#22C55E',
  tableReserved: '#C9A84C',
  tableOccupied: '#EF4444',
  tableCleaning: '#6B7280',
  tableBlocked: '#374151',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  '4xl': 40,
  '5xl': 48,
} as const;

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  label: {
    fontSize: 11,
    fontWeight: '500' as const,
    lineHeight: 16,
    textTransform: 'uppercase' as const,
    letterSpacing: 1,
  },
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const shadows = {
  goldGlow: {
    shadowColor: '#C9A84C',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
} as const;
