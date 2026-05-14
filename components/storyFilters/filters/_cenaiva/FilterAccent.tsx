/**
 * <FilterAccent /> — renders one accent atom from a Cenaiva filter's
 * `overlay.accents` list. Translated from the reference `filters.jsx`
 * Accent switch into pure React Native.
 *
 * Coordinates `x`/`y` are percentages of the parent frame. Each accent
 * is centred at (x%, y%) via marginLeft/marginTop offsets sized to the
 * accent's own dimensions (so we don't rely on percentage transforms).
 */
import React from 'react';
import { Platform, StyleSheet, Text, View, type ViewStyle } from 'react-native';

export type AccentBase = { kind: string; x: number; y: number };

export type Accent =
  | (AccentBase & { kind: 'gloss'; w: number; h: number; color: string; blur?: number })
  | (AccentBase & { kind: 'shimmer'; size: number })
  | (AccentBase & { kind: 'flare'; size: number; color: string })
  | (AccentBase & { kind: 'dew'; size: number })
  | (AccentBase & { kind: 'liner'; w: number; h: number })
  | (AccentBase & { kind: 'halo'; size: number })
  | (AccentBase & { kind: 'blush'; size: number })
  | (AccentBase & { kind: 'tinyFace'; size: number })
  | (AccentBase & { kind: 'puffyCheek'; size: number })
  | (AccentBase & { kind: 'sleepyEye' })
  | (AccentBase & { kind: 'lashes' })
  | (AccentBase & { kind: 'tear' })
  | (AccentBase & { kind: 'sparkle'; size: number; color?: string })
  | (AccentBase & { kind: 'bubble'; text: string; style: 'shout' | 'thought' })
  | (AccentBase & { kind: 'tag'; text: string; style: 'corp' | 'soft' | 'stamp' | 'chaos' | 'alien' })
  | (AccentBase & { kind: 'emoji'; char: string; size: number; tilt?: number })
  | (AccentBase & { kind: 'smoke'; size: number })
  | (AccentBase & { kind: 'aviators' })
  | (AccentBase & { kind: 'mustache' })
  | (AccentBase & { kind: 'antenna'; mirror?: boolean })
  | (AccentBase & { kind: 'bigEye' })
  | (AccentBase & { kind: 'messyHair' });

type Props = { a: Accent; scale?: number; frameW: number; frameH: number };

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

/** Build a centered absolute style given a known accent width/height. */
function centered(x: number, y: number, w: number, h: number, extra?: ViewStyle): ViewStyle {
  return {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    marginLeft: -w / 2,
    marginTop: -h / 2,
    width: w,
    height: h,
    ...extra,
  };
}

export function FilterAccent({ a, scale = 1, frameW, frameH }: Props) {
  switch (a.kind) {
    case 'gloss': {
      const w = (a.w / 100) * frameW * scale;
      const h = Math.max(2, (a.h / 100) * frameH * scale);
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            backgroundColor: a.color,
            borderRadius: 9999,
            opacity: 0.85,
          })}
        />
      );
    }
    case 'shimmer': {
      const s = a.size * scale;
      return (
        <View
          style={centered(a.x, a.y, s, s, {
            borderRadius: s / 2,
            backgroundColor: 'rgba(255,255,255,0.95)',
            shadowColor: '#fff',
            shadowOpacity: 0.6,
            shadowRadius: s * 0.6,
            shadowOffset: { width: 0, height: 0 },
          })}
        />
      );
    }
    case 'flare': {
      const s = a.size * scale;
      return (
        <View
          style={centered(a.x, a.y, s, s, {
            borderRadius: s / 2,
            backgroundColor: a.color,
            opacity: 0.55,
            shadowColor: a.color,
            shadowOpacity: 0.7,
            shadowRadius: s * 0.4,
            shadowOffset: { width: 0, height: 0 },
          })}
        />
      );
    }
    case 'dew': {
      const s = a.size * scale;
      return (
        <View
          style={centered(a.x, a.y, s, s, {
            borderRadius: s / 2,
            backgroundColor: 'rgba(255,255,255,0.85)',
            borderWidth: 0.5,
            borderColor: 'rgba(255,255,255,0.3)',
            shadowColor: '#000',
            shadowOpacity: 0.15,
            shadowRadius: 1.5,
            shadowOffset: { width: 0, height: 1 },
          })}
        >
          <View
            style={{
              position: 'absolute',
              top: s * 0.18,
              left: s * 0.22,
              width: s * 0.3,
              height: s * 0.3,
              borderRadius: s * 0.15,
              backgroundColor: 'rgba(255,255,255,0.95)',
            }}
          />
        </View>
      );
    }
    case 'liner': {
      const w = (a.w / 100) * frameW * scale;
      const h = a.h * scale;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            backgroundColor: 'rgba(20,8,15,0.85)',
            borderRadius: 2,
          })}
        />
      );
    }
    case 'halo': {
      const w = a.size * scale * 3;
      const h = a.size * scale * 1.6;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            borderRadius: Math.max(w, h),
            backgroundColor: 'rgba(255,255,255,0.32)',
            opacity: 0.9,
          })}
        />
      );
    }
    case 'blush': {
      const w = a.size * scale;
      const h = a.size * scale * 0.7;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            borderRadius: w,
            backgroundColor: 'rgba(255,150,170,0.35)',
            opacity: 0.85,
          })}
        />
      );
    }
    case 'tinyFace': {
      const w = (a.size / 100) * frameW * scale;
      const h = w * 1.15;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            borderTopLeftRadius: w * 0.46,
            borderTopRightRadius: w * 0.46,
            borderBottomLeftRadius: w * 0.5,
            borderBottomRightRadius: w * 0.5,
            backgroundColor: '#a07654',
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOpacity: 0.4,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 4 },
          })}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '60%',
              backgroundColor: '#f3d4b8',
              opacity: 0.55,
            }}
          />
          <View style={{ position: 'absolute', left: '30%', top: '40%', width: 5, height: 5, backgroundColor: '#1a0a05', borderRadius: 2.5 }} />
          <View style={{ position: 'absolute', right: '30%', top: '40%', width: 5, height: 5, backgroundColor: '#1a0a05', borderRadius: 2.5 }} />
          <View style={{ position: 'absolute', left: '50%', top: '62%', marginLeft: -7, width: 14, height: 2, backgroundColor: '#3a1810', borderRadius: 1 }} />
        </View>
      );
    }
    case 'puffyCheek': {
      const s = (a.size / 100) * frameW * scale;
      return (
        <View
          style={centered(a.x, a.y, s, s, {
            borderRadius: s / 2,
            backgroundColor: 'rgba(255,170,140,0.6)',
            opacity: 0.85,
          })}
        />
      );
    }
    case 'sleepyEye': {
      const w = 26 * scale;
      const h = 8 * scale;
      return (
        <View
          style={centered(a.x, a.y, w, h, { overflow: 'hidden' })}
        >
          <View
            style={{
              width: w,
              height: w,
              borderRadius: w / 2,
              borderTopWidth: 2,
              borderColor: '#1a0a05',
            }}
          />
        </View>
      );
    }
    case 'lashes': {
      const w = 36 * scale;
      const h = 12 * scale;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          })}
        >
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={{
                width: 2,
                height: 8 + (i === 2 || i === 3 ? 4 : 0),
                backgroundColor: '#0a0407',
                transform: [{ rotate: `${(i - 2.5) * 12}deg` }],
                borderRadius: 1,
              }}
            />
          ))}
        </View>
      );
    }
    case 'tear': {
      const w = 16 * scale;
      const h = 26 * scale;
      return (
        <View style={centered(a.x, a.y, w, h)}>
          <View
            style={{
              width: w,
              height: w * 1.4,
              backgroundColor: 'rgba(110,170,240,0.9)',
              borderTopLeftRadius: w / 2,
              borderTopRightRadius: w / 2,
              borderBottomLeftRadius: w * 0.8,
              borderBottomRightRadius: w * 0.8,
              shadowColor: 'rgba(40,80,150,0.5)',
              shadowOpacity: 1,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 2 },
            }}
          />
        </View>
      );
    }
    case 'sparkle': {
      const c = a.color || '#fff8c2';
      const s = a.size * scale;
      return (
        <View style={centered(a.x, a.y, s, s)}>
          <View
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              bottom: 0,
              width: 2,
              marginLeft: -1,
              backgroundColor: c,
              borderRadius: 1,
              shadowColor: c,
              shadowOpacity: 0.9,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: '50%',
              left: 0,
              right: 0,
              height: 2,
              marginTop: -1,
              backgroundColor: c,
              borderRadius: 1,
              shadowColor: c,
              shadowOpacity: 0.9,
              shadowRadius: 4,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: '35%',
              left: '35%',
              width: s * 0.3,
              height: s * 0.3,
              borderRadius: s * 0.15,
              backgroundColor: c,
              shadowColor: c,
              shadowOpacity: 1,
              shadowRadius: 3,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </View>
      );
    }
    case 'bubble': {
      const isShout = a.style === 'shout';
      return (
        <View style={[styles.textAnchor, { left: `${a.x}%`, top: `${a.y}%` }]}>
          <View
            style={[
              styles.textAnchorInner,
              {
                paddingHorizontal: 14,
                paddingVertical: 8,
                backgroundColor: isShout ? '#ffffff' : 'rgba(255,255,255,0.95)',
                borderRadius: 18,
                borderWidth: isShout ? 3 : 2,
                borderColor: isShout ? '#c4243f' : 'rgba(80,40,100,0.4)',
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 6,
                shadowOffset: { width: 0, height: 4 },
              },
            ]}
          >
            <Text
              style={{
                color: isShout ? '#c4243f' : '#3a1640',
                fontWeight: isShout ? '900' : '700',
                fontSize: isShout ? 14 : 12,
                letterSpacing: isShout ? 0.6 : 0.2,
                textTransform: isShout ? 'uppercase' : 'none',
              }}
            >
              {a.text}
            </Text>
          </View>
        </View>
      );
    }
    case 'tag': {
      const tagStyles = {
        corp:  { bg: '#0a0a0a',                  color: '#d4af6a', borderColor: '#d4af6a',         font: MONO,      letter: 1.8, padV: 10, padH: 16, radius: 4,   upper: true,  weight: '700' as const, size: 11, dashed: false, border: 1 },
        soft:  { bg: 'rgba(255,255,255,0.92)',   color: '#5a3a2a', borderColor: 'transparent',     font: undefined, letter: 0,   padV: 10, padH: 18, radius: 999, upper: false, weight: '600' as const, size: 13, dashed: false, border: 0 },
        stamp: { bg: '#3a1f0a',                  color: '#f7d18a', borderColor: '#f7d18a',         font: MONO,      letter: 1.6, padV: 8,  padH: 14, radius: 4,   upper: true,  weight: '800' as const, size: 11, dashed: true,  border: 2 },
        chaos: { bg: '#ff6b3d',                  color: '#fff',    borderColor: 'transparent',     font: undefined, letter: 1.4, padV: 9,  padH: 16, radius: 4,   upper: true,  weight: '900' as const, size: 11, dashed: false, border: 0 },
        alien: { bg: '#0a2a14',                  color: '#7aff9c', borderColor: '#2dd66a',         font: MONO,      letter: 0.8, padV: 9,  padH: 16, radius: 999, upper: false, weight: '700' as const, size: 12, dashed: false, border: 1 },
      };
      const s = tagStyles[a.style];
      return (
        <View style={[styles.textAnchor, { left: `${a.x}%`, top: `${a.y}%` }]}>
          <View
            style={[
              styles.textAnchorInner,
              {
                paddingVertical: s.padV,
                paddingHorizontal: s.padH,
                backgroundColor: s.bg,
                borderRadius: s.radius,
                borderWidth: s.border,
                borderColor: s.borderColor,
                borderStyle: s.dashed ? 'dashed' : 'solid',
                shadowColor: '#000',
                shadowOpacity: 0.35,
                shadowRadius: 5,
                shadowOffset: { width: 0, height: 4 },
              },
            ]}
          >
            <Text
              style={{
                color: s.color,
                fontWeight: s.weight,
                fontSize: s.size,
                letterSpacing: s.letter,
                textTransform: s.upper ? 'uppercase' : 'none',
                fontFamily: s.font,
              }}
            >
              {a.text}
            </Text>
          </View>
        </View>
      );
    }
    case 'emoji': {
      const s = a.size * scale;
      return (
        <Text
          style={{
            position: 'absolute',
            left: `${a.x}%`,
            top: `${a.y}%`,
            marginLeft: -s / 2,
            marginTop: -s / 2,
            fontSize: s,
            transform: [{ rotate: `${a.tilt ?? 0}deg` }],
            textShadowColor: 'rgba(0,0,0,0.35)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
          }}
        >
          {a.char}
        </Text>
      );
    }
    case 'smoke': {
      const s = a.size * scale;
      return (
        <View
          style={centered(a.x, a.y, s, s, {
            borderRadius: s / 2,
            backgroundColor: 'rgba(220,220,220,0.45)',
            opacity: 0.7,
          })}
        />
      );
    }
    case 'aviators': {
      const w = frameW * 0.7 * scale;
      const h = 38 * scale;
      const lensW = w * 0.42;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          })}
        >
          <View
            style={{
              width: lensW,
              height: h,
              backgroundColor: '#1a1a1a',
              borderTopLeftRadius: lensW * 0.4,
              borderTopRightRadius: lensW * 0.4,
              borderBottomLeftRadius: lensW * 0.6,
              borderBottomRightRadius: lensW * 0.5,
              borderWidth: 2,
              borderColor: '#c9a13a',
            }}
          />
          <View style={{ width: 12, height: 3, backgroundColor: '#c9a13a' }} />
          <View
            style={{
              width: lensW,
              height: h,
              backgroundColor: '#1a1a1a',
              borderTopLeftRadius: lensW * 0.4,
              borderTopRightRadius: lensW * 0.4,
              borderBottomLeftRadius: lensW * 0.5,
              borderBottomRightRadius: lensW * 0.6,
              borderWidth: 2,
              borderColor: '#c9a13a',
            }}
          />
        </View>
      );
    }
    case 'mustache': {
      const w = frameW * 0.46 * scale;
      const h = 22 * scale;
      return (
        <View
          style={centered(a.x, a.y, w, h, { flexDirection: 'row' })}
        >
          <View
            style={{
              flex: 1,
              backgroundColor: '#1a0a05',
              borderBottomRightRadius: h,
              borderBottomLeftRadius: h * 0.4,
              transform: [{ rotate: '-3deg' }],
            }}
          />
          <View
            style={{
              flex: 1,
              backgroundColor: '#1a0a05',
              borderBottomLeftRadius: h,
              borderBottomRightRadius: h * 0.4,
              transform: [{ rotate: '3deg' }],
            }}
          />
        </View>
      );
    }
    case 'antenna': {
      const w = 8 * scale;
      const h = 60 * scale;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            transform: [{ rotate: `${a.mirror ? 18 : -18}deg` }],
          })}
        >
          <View
            style={{
              position: 'absolute',
              left: '50%',
              bottom: 0,
              marginLeft: -1.5,
              width: 3,
              height: '80%',
              backgroundColor: '#1d6a30',
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '50%',
              top: 0,
              marginLeft: -8,
              width: 16,
              height: 16,
              borderRadius: 8,
              backgroundColor: '#2dd66a',
              shadowColor: '#2dd66a',
              shadowOpacity: 1,
              shadowRadius: 6,
              shadowOffset: { width: 0, height: 0 },
            }}
          />
        </View>
      );
    }
    case 'bigEye': {
      const w = 36 * scale;
      const h = 44 * scale;
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            borderRadius: w / 2,
            backgroundColor: '#0a0a0a',
            borderWidth: 2,
            borderColor: '#1d6a30',
            shadowColor: '#7aff9c',
            shadowOpacity: 0.55,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 0 },
            overflow: 'hidden',
          })}
        >
          <View
            style={{
              position: 'absolute',
              top: '15%',
              left: '20%',
              right: '20%',
              bottom: '45%',
              backgroundColor: '#fff',
              borderRadius: w / 2,
              opacity: 0.95,
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: '40%',
              top: '22%',
              width: 5,
              height: 5,
              borderRadius: 2.5,
              backgroundColor: '#fff',
            }}
          />
        </View>
      );
    }
    case 'messyHair': {
      const w = frameW * 0.7 * scale;
      const h = 40 * scale;
      const heights = [12, 26, 18, 32, 14, 22, 10];
      return (
        <View
          style={centered(a.x, a.y, w, h, {
            flexDirection: 'row',
            justifyContent: 'space-around',
            alignItems: 'flex-end',
          })}
        >
          {heights.map((hh, i) => (
            <View
              key={i}
              style={{
                width: 5,
                height: hh * scale,
                backgroundColor: '#2a1018',
                borderTopLeftRadius: 3,
                borderTopRightRadius: 3,
                transform: [{ rotate: `${(i - 3) * 8}deg` }],
              }}
            />
          ))}
        </View>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  textAnchor: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textAnchorInner: {
    // Pulls the variable-width text bubble back so its centre sits on the anchor.
    transform: [{ translateX: '-50%' }, { translateY: '-50%' }],
  },
});
