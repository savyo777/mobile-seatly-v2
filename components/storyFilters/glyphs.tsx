/**
 * Reusable SVG glyphs used across multiple story filters.
 * Matches the path data in the reference HTML one-for-one so the visuals
 * stay consistent with the approved design.
 */
import React from 'react';
import Svg, { Circle, Ellipse, Path, Rect, type SvgProps } from 'react-native-svg';

/** Pink bow with darker pink stroke. Used by Pink Bow Dinner. */
export function BowGlyph({
  size = 36,
  fill = '#f4b6c2',
  stroke = '#d97488',
  ...rest
}: { size?: number; fill?: string; stroke?: string } & SvgProps) {
  const w = size;
  const h = (size * 40) / 60;
  return (
    <Svg width={w} height={h} viewBox="0 0 60 40" {...rest}>
      <Path
        d="M30 20 Q10 4 6 18 Q4 30 18 26 L30 22 L42 26 Q56 30 54 18 Q50 4 30 20 Z M26 22 L34 22 L32 32 L28 32 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1}
      />
    </Svg>
  );
}

/** A single pearl bead — radial-style highlight + warm cream body. */
export function Pearl({ size = 8 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 8 8">
      <Circle cx={4} cy={4} r={3.5} fill="#e8d8c8" />
      <Circle cx={2.6} cy={2.6} r={1.2} fill="rgba(255,255,255,0.9)" />
      <Circle cx={4} cy={4} r={3.5} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={0.4} />
    </Svg>
  );
}

/** Pink ribbon — sits below the pearl row in Coquette Dinner. */
export function Ribbon({
  width = 60,
  fill = '#f4b6c2',
}: { width?: number; fill?: string }) {
  const h = (width * 14) / 60;
  return (
    <Svg width={width} height={h} viewBox="0 0 60 14">
      <Path
        d="M0 7 Q10 0 30 7 Q50 14 60 7 L60 10 Q50 17 30 10 Q10 3 0 10 Z"
        fill={fill}
      />
    </Svg>
  );
}

/** Martini glass doodle — line drawing matching reference. */
export function MartiniGlyph({
  size = 30,
  cherry = false,
  rotate = 0,
}: { size?: number; cherry?: boolean; rotate?: number }) {
  const w = size;
  const h = (size * 36) / 30;
  return (
    <Svg width={w} height={h} viewBox="0 0 30 36">
      <Path
        d="M3 4 L27 4 L15 18 Z M15 18 L15 30 M9 30 L21 30"
        fill="none"
        stroke="white"
        strokeWidth={1.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        rotation={rotate}
        originX={15}
        originY={18}
      />
      {cherry ? <Circle cx={22} cy={6} r={1.4} fill="#f4b6c2" /> : null}
    </Svg>
  );
}

/** Tiny gold crown — Birthday Princess. */
export function CrownGlyph({ size = 36 }: { size?: number }) {
  const w = size;
  const h = (size * 22) / 36;
  return (
    <Svg width={w} height={h} viewBox="0 0 60 36">
      <Path
        d="M4 32 L8 12 L20 24 L30 6 L40 24 L52 12 L56 32 Z"
        fill="#c9a86a"
        stroke="#7a5a28"
        strokeWidth={1}
      />
      <Circle cx={30} cy={14} r={2} fill="#f4b6c2" />
    </Svg>
  );
}

/** Single butterfly — used in Butterfly Glow at three sizes. */
export function ButterflyGlyph({
  size = 24,
  fill = '#f4b6c2',
  stroke = '#d97488',
}: { size?: number; fill?: string; stroke?: string }) {
  const w = size;
  const h = (size * 24) / 30;
  return (
    <Svg width={w} height={h} viewBox="0 0 30 24">
      <Path
        d="M15 12 Q4 0 2 10 Q4 18 15 13 Q26 18 28 10 Q26 0 15 12 Z M15 13 L15 22"
        fill={fill}
        stroke={stroke}
        strokeWidth={0.7}
        opacity={0.95}
      />
    </Svg>
  );
}

/** Heart glyph — used by multiple filters for tiny ♡ accents. */
export function Heart({
  size = 12,
  fill = '#f4b6c2',
  stroke,
}: { size?: number; fill?: string; stroke?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 12 12">
      <Path
        d="M6 10.6 L1.4 6.2 Q-0.2 4.6 1 3 Q2.6 1.2 4 2.6 L6 4.4 L8 2.6 Q9.4 1.2 11 3 Q12.2 4.6 10.6 6.2 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={stroke ? 0.6 : 0}
      />
    </Svg>
  );
}

/** Tiny 4-point sparkle (✦) drawn as SVG so we can stroke/glow it. */
export function Sparkle({
  size = 10,
  color = '#ffffff',
}: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 10 10">
      <Path
        d="M5 0 L5.7 4.3 L10 5 L5.7 5.7 L5 10 L4.3 5.7 L0 5 L4.3 4.3 Z"
        fill={color}
      />
    </Svg>
  );
}

/** Curved "swoop" arrow used by No Crumbs Left to point at the dish. */
export function ArrowSwoop({
  width = 36,
  color = '#ffd6e0',
}: { width?: number; color?: string }) {
  const h = (width * 32) / 40;
  return (
    <Svg width={width} height={h} viewBox="0 0 40 36" fill="none">
      <Path d="M6 6 Q26 4 32 22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
      <Path d="M28 16 L32 22 L24 22" stroke={color} strokeWidth={1.6} strokeLinecap="round" />
    </Svg>
  );
}

/** 5 strands of pasta — used by Pasta Night. */
export function PastaStrands({
  width = 36,
  color = '#ffffff',
}: { width?: number; color?: string }) {
  const h = (width * 30) / 36;
  return (
    <Svg width={width} height={h} viewBox="0 0 36 30" fill="none">
      <Path
        d="M4 4 Q10 16 4 28 M10 4 Q16 16 10 28 M16 4 Q22 16 16 28 M22 4 Q28 16 22 28 M28 4 Q34 16 28 28"
        stroke={color}
        strokeWidth={1.4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Sushi nigiri (rice + tuna + dot) — used by Sushi Date. */
export function SushiGlyph({ size = 24 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Ellipse cx={12} cy={14} rx={9} ry={5} fill="none" stroke="#fff" strokeWidth={1.4} />
      <Rect x={3} y={9} width={18} height={2.5} fill="#fff" />
      <Circle cx={12} cy={14} r={2.4} fill="#ffd6e0" />
    </Svg>
  );
}

/** Three horizontal lines — chopstick-like. */
export function ChopsticksGlyph({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6 L21 6 M3 12 L21 12 M3 18 L21 18"
        stroke="#fff"
        strokeWidth={1.3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/** Minimal analog clock — used by Cocktail Hour. */
export function ClockGlyph({ size = 11 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke="#fff" strokeWidth={1.4} />
      <Path d="M12 7 L12 12 L16 14" stroke="#fff" strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

/** Simple location pin — used by Dined in Toronto. */
export function PinGlyph({ size = 12, color = '#e63946' }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={(size * 14) / 12} viewBox="0 0 12 14">
      <Path
        d="M6 0.6 C 8.8 0.6 10.6 2.6 10.6 5 C 10.6 8.6 6 13.2 6 13.2 C 6 13.2 1.4 8.6 1.4 5 C 1.4 2.6 3.2 0.6 6 0.6 Z"
        fill={color}
      />
      <Circle cx={6} cy={5} r={1.6} fill="#fff" />
    </Svg>
  );
}
