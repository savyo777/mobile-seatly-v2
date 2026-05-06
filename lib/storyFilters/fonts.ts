/**
 * Story-filter font stacks.
 *
 * The reference HTML uses Italiana, Cormorant Garamond, Pinyon Script,
 * Bodoni Moda, Caveat, DM Mono, and Inter. We map those to the closest
 * platform-native fonts so we don't have to ship Google Fonts as a new
 * dependency. iOS gets the prettiest results (Snell Roundhand / Didot);
 * Android falls back to its serif / cursive families.
 *
 * If the team later wants pixel-perfect typography, swap each entry here
 * to the real `@expo-google-fonts/<family>` font name and ensure that
 * font is loaded in the root <_layout/> via expo-font.
 */
import { Platform } from 'react-native';

const ios = Platform.OS === 'ios';

/** "Italiana" — wide caps display serif. Closest native: Didot. */
export const FONT_DISPLAY_SERIF = ios ? 'Didot' : 'serif';

/** "Cormorant Garamond" italic — refined italic body. Closest: Times New Roman / Georgia. */
export const FONT_BODY_SERIF_ITALIC = ios ? 'Times New Roman' : 'serif';
export const FONT_BODY_SERIF = ios ? 'Times New Roman' : 'serif';

/** "Pinyon Script" — formal script. Closest: Snell Roundhand on iOS. */
export const FONT_SCRIPT_FORMAL = ios ? 'Snell Roundhand' : 'cursive';

/** "Caveat" — handwritten marker. Closest: Snell Roundhand / cursive. */
export const FONT_SCRIPT_HANDWRITTEN = ios ? 'Snell Roundhand' : 'cursive';

/** "Bodoni Moda" italic — high-contrast luxe italic. Closest: Didot italic. */
export const FONT_DISPLAY_BODONI = ios ? 'Didot' : 'serif';

/** "DM Mono" — minimal monospace. Closest: Menlo / monospace. */
export const FONT_MONO = ios ? 'Menlo' : 'monospace';

/** "Inter" — neutral sans. Closest: System / Roboto. */
export const FONT_SANS: string | undefined = undefined; // System default
