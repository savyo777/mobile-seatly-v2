import type { Palette } from '@/lib/theme/palettes';
import { darkColors, lightColors } from '@/lib/theme/palettes';
import { useColors } from '@/lib/theme/useColors';
import { brandGold, ownerRadii, ownerSpace, withAlpha } from '@/lib/theme/tokens';

/**
 * Owner mobile UI tokens — derived from the same `Palette` as the customer app so
 * light/dark stay consistent.
 *
 * Layout conventions:
 * - Hero cover height on Profile: ~120–160pt; diner detail uses ~250pt for guest-facing richness.
 * - Section vertical rhythm: use `spacing` from `@/lib/theme` (4pt grid).
 * - One gold accent per viewport: reserve `gold` for primary metric, active filter, or single CTA.
 *
 * All rgba mixes are computed via `withAlpha()` from `lib/theme/tokens.ts` so
 * they track the canonical palette gold automatically.
 */
export function ownerColorsFromPalette(p: Palette) {
  const isLight = p.bgBase === lightColors.bgBase;
  const surfaceMix = isLight ? '#0F0E0C' : '#FFFFFF';
  return {
    bg: p.bgBase,
    bgSurface: p.bgSurface,
    bgCard: p.bgSurface,
    bgElevated: p.bgElevated,
    bgGlass: withAlpha(surfaceMix, isLight ? 0.06 : 0.035),
    border: p.border,
    borderStrong: withAlpha(surfaceMix, isLight ? 0.12 : 0.09),

    gold: p.gold,
    goldMuted: withAlpha(isLight ? brandGold.light : p.gold, isLight ? 0.18 : 0.2),
    goldSubtle: withAlpha(isLight ? brandGold.light : p.gold, 0.12),

    chartPositive: p.success,
    chartNegative: p.danger,
    chartPositiveMuted: withAlpha(p.success, isLight ? 0.25 : 0.3),
    chartNegativeMuted: withAlpha(p.danger, isLight ? 0.25 : 0.3),

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

export { ownerRadii, ownerSpace };

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
