// Palette types + dark/light constants. The actual color values live in
// `lib/theme/tokens.ts` (single source of truth for design tokens). Keep
// this re-export thin so existing `import { darkColors } from '.../palettes'`
// call sites stay working.

import { darkPalette, lightPalette, type PaletteShape } from './tokens';

export type Palette = PaletteShape;

export const darkColors: Palette = darkPalette;
export const lightColors: Palette = lightPalette;
