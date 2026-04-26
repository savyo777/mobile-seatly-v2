import type { Palette } from '@/lib/theme/palettes';
import { darkColors, lightColors } from '@/lib/theme/palettes';
import { useColors } from '@/lib/theme/useColors';

/**
 * Owner mobile UI tokens — derived from the same `Palette` as the customer app so
 * light/dark stay consistent.
 *
 * Layout conventions:
 * - Hero cover height on Profile: ~120–160pt; diner detail uses ~250pt for guest-facing richness.
 * - Section vertical rhythm: use `spacing` from `@/lib/theme` (8pt grid).
 * - One gold accent per viewport: reserve `gold` for primary metric, active filter, or single CTA.
 */
export function ownerColorsFromPalette(p: Palette) {
  const isLight = p.bgBase === lightColors.bgBase;
  return {
    bg: p.bgBase,
    bgSurface: p.bgSurface,
    bgCard: p.bgSurface,
    bgElevated: p.bgElevated,
    bgGlass: isLight ? 'rgba(15,14,12,0.06)' : 'rgba(255,255,255,0.035)',
    border: p.border,
    borderStrong: isLight ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.09)',

    gold: p.gold,
    goldMuted: isLight ? 'rgba(168,131,42,0.18)' : 'rgba(201, 162, 74, 0.2)',
    goldSubtle: isLight ? 'rgba(168,131,42,0.12)' : 'rgba(201,162,74,0.12)',

    chartPositive: p.success,
    chartNegative: p.danger,
    chartPositiveMuted: isLight ? 'rgba(22,163,74,0.25)' : 'rgba(34, 197, 94, 0.3)',
    chartNegativeMuted: isLight ? 'rgba(220,38,38,0.25)' : 'rgba(239, 68, 68, 0.3)',

    success: p.success,
    danger: p.danger,
    warning: p.warning,

    text: p.textPrimary,
    textSecondary: p.textSecondary,
    textMuted: p.textMuted,

    tableAvailable: p.tableEmpty,
    tableReserved: p.tableReserved,
    tableOccupied: p.tableOccupied,
    tableCleaning: p.tableCleaning,
  } as const;
}

export function useOwnerColors() {
  return ownerColorsFromPalette(useColors());
}

/** Static alias for legacy imports (dark palette only). Prefer `ownerColorsFromPalette(useColors())` in new code. */
export const ownerColors = ownerColorsFromPalette(darkColors);

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

/** Extra bottom inset for scroll content above the custom tab bar (center + button). */
export const OWNER_TAB_SCROLL_BOTTOM_PADDING = 16;

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
