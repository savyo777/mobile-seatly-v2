export { ThemeProvider, useTheme } from './ThemeProvider';
export type { ThemeMode } from './ThemeProvider';
export { useColors } from './useColors';
export { createStyles } from './createStyles';
export { darkColors, lightColors } from './palettes';
export type { Palette } from './palettes';

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

export const SERIF_FAMILY = 'Georgia';

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 36 },
  h2: { fontSize: 22, fontWeight: '600' as const, lineHeight: 30 },
  h3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 26 },
  serifDisplay: {
    fontFamily: SERIF_FAMILY,
    fontSize: 32,
    fontWeight: '700' as const,
    lineHeight: 38,
  },
  serifHeading: {
    fontFamily: SERIF_FAMILY,
    fontSize: 26,
    fontWeight: '700' as const,
    lineHeight: 32,
  },
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
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

/** Soft elevation only — no gold halos */
export const shadows = {
  goldGlow: {
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  card: {
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  lift: {
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
} as const;
