import React from 'react';
import { Text, StyleSheet } from 'react-native';

type Props = {
  color: string;
  size?: number;
};

/** Text-based chevron — avoids vector icon font fallback “?” in maps and lists. */
export function ChevronGlyph({ color, size = 18 }: Props) {
  return (
    <Text style={[styles.glyph, { color, fontSize: size, lineHeight: size + 2 }]} accessible={false}>
      ›
    </Text>
  );
}

const styles = StyleSheet.create({
  glyph: {
    fontWeight: '300',
    marginTop: -1,
  },
});
