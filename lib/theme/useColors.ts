import { useTheme } from './ThemeProvider';
import type { Palette } from './palettes';

export function useColors(): Palette {
  return useTheme().colors;
}
