// Canonical design tokens. Three files used to define overlapping color,
// spacing, and radius scales — palettes.ts, index.ts, ownerTheme.ts — and
// they had drifted (`#C9A24A` vs `#C9A84C` vs `#D4AF37` for the brand
// gold). This module is the single source of truth; everything else
// imports from here.

// ── Brand colors ────────────────────────────────────────────────────────────
//
// Brand gold has historically been written four different ways:
//   #C9A24A — palettes.ts darkColors.gold (canonical)
//   #C9A84C — tailwind.config.js / loyalty Gold tier
//   #D4AF37 — design-system/MASTER.md (deleted in Phase I)
//   #A8832A — palettes.ts lightColors.gold (intentional light-mode shift)
// We pick `#C9A24A` for dark and `#A8832A` for light, then derive everything
// else from there.

export const brandGold = {
  /** Default accent gold used on dark surfaces. */
  dark: '#C9A24A',
  /** Pre-computed lighter shade (for hover, focus states). */
  darkLight: '#DDD5C4',
  /** Pre-computed darker shade. */
  darkDark: '#A38630',
  /** Light-mode gold; deeper to keep contrast on cream surfaces. */
  light: '#A8832A',
  lightShade: '#7A5E1A',
} as const;

// ── Palettes ────────────────────────────────────────────────────────────────

export type PaletteShape = {
  gold: string;
  goldLight: string;
  goldDark: string;
  bgBase: string;
  bgSurface: string;
  bgElevated: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  tableEmpty: string;
  tableReserved: string;
  tableOccupied: string;
  tableCleaning: string;
  tableBlocked: string;
};

export const darkPalette: PaletteShape = {
  gold: brandGold.dark,
  goldLight: brandGold.darkLight,
  goldDark: brandGold.darkDark,

  bgBase: '#000000',
  bgSurface: '#0F0F0F',
  bgElevated: '#161616',
  border: 'rgba(255,255,255,0.06)',

  textPrimary: '#FFFFFF',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',

  success: '#22C55E',
  warning: '#D4A574',
  danger: '#EF4444',
  info: '#71717A',

  tableEmpty: '#22C55E',
  tableReserved: brandGold.dark,
  tableOccupied: '#EF4444',
  tableCleaning: '#71717A',
  tableBlocked: '#52525C',
};

export const lightPalette: PaletteShape = {
  gold: brandGold.light,
  goldLight: brandGold.lightShade,
  goldDark: brandGold.lightShade,

  bgBase: '#F8F7F4',
  bgSurface: '#FFFFFF',
  bgElevated: '#F0EDE8',
  border: 'rgba(0,0,0,0.08)',

  textPrimary: '#0F0E0C',
  textSecondary: '#4A4740',
  textMuted: '#8A8480',

  success: '#16A34A',
  warning: '#92540A',
  danger: '#DC2626',
  info: '#6B7280',

  tableEmpty: '#16A34A',
  tableReserved: brandGold.light,
  tableOccupied: '#DC2626',
  tableCleaning: '#6B7280',
  tableBlocked: '#9CA3AF',
};

// ── Spacing (4pt grid) ──────────────────────────────────────────────────────

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

/**
 * Owner-side spacing. Numerically larger than customer-side values because
 * owner UI is denser-information and benefits from more breathing room.
 * These map to a subset of the customer scale rather than introducing new
 * values — `ownerSpace.xs === spacing.sm`, etc.
 */
export const ownerSpace = {
  xs: spacing.sm,
  sm: spacing.md,
  md: spacing.lg,
  lg: spacing['2xl'],
  xl: spacing['3xl'],
} as const;

// ── Border radius ───────────────────────────────────────────────────────────

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 18,
  full: 9999,
} as const;

/**
 * Owner radii are slightly larger to match the heavier panel layouts. Kept
 * as a separate scale (rather than aligned to customer-side values) because
 * owner cards are intentionally more rounded.
 */
export const ownerRadii = {
  sm: 10,
  md: 14,
  xl: 16,
  '2xl': 20,
  '3xl': 26,
} as const;

// ── Loyalty tier colors ─────────────────────────────────────────────────────

export const loyaltyTierColors = {
  bronze: '#CD7F32',
  silver: '#A8A8B8',
  gold: brandGold.dark,
  platinum: '#E2E2F0',
} as const;

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Mix an opaque hex color with an alpha channel to get an rgba() string.
 * Replaces hand-written `'rgba(201,162,74,0.18)'` strings that drift away
 * from the source hex when the brand color changes.
 *
 * @example withAlpha(brandGold.dark, 0.18) → 'rgba(201,162,74,0.18)'
 */
export function withAlpha(hex: string, alpha: number): string {
  const cleaned = hex.replace('#', '');
  if (cleaned.length !== 6) return hex;
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  const safeAlpha = Math.max(0, Math.min(1, alpha));
  return `rgba(${r},${g},${b},${safeAlpha})`;
}
