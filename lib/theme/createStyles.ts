import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useColors } from './useColors';
import type { Palette } from './palettes';

type StyleFactory<T extends StyleSheet.NamedStyles<T>> = (c: Palette) => T;

export function createStyles<T extends StyleSheet.NamedStyles<T>>(
  factory: StyleFactory<T>,
): () => T {
  return function useStyles(): T {
    const c = useColors();
    return useMemo(() => StyleSheet.create(factory(c)), [c]);
  };
}
