import React, { useCallback } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import type { OwnerFloorTable } from '@/lib/mock/ownerApp';
import type { Table } from '@/lib/mock/tables';
import { ownerColors, ownerRadii, ownerShadow } from '@/lib/theme/ownerTheme';

const CANVAS_W = 340;
const CANVAS_H = 300;

function colorForStatus(status: Table['status']): string {
  switch (status) {
    case 'empty':
      return ownerColors.tableAvailable;
    case 'reserved':
      return ownerColors.tableReserved;
    case 'occupied':
      return ownerColors.tableOccupied;
    case 'cleaning':
      return ownerColors.tableCleaning;
    case 'blocked':
      return '#475569';
    default:
      return ownerColors.border;
  }
}

type Props = {
  tables: OwnerFloorTable[];
  onTablePress: (t: OwnerFloorTable) => void;
};

export function FloorCanvas({ tables, onTablePress }: Props) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = savedScale.value * e.scale;
      scale.value = Math.min(2.4, Math.max(0.65, next));
    })
    .onEnd(() => {
      scale.value = withSpring(scale.value, { damping: 18, stiffness: 200 });
    });

  const pan = Gesture.Pan()
    .onStart(() => {
      startX.value = tx.value;
      startY.value = ty.value;
    })
    .onUpdate((e) => {
      tx.value = startX.value + e.translationX;
      ty.value = startY.value + e.translationY;
    })
    .onEnd(() => {
      tx.value = withSpring(tx.value, { damping: 22, stiffness: 180 });
      ty.value = withSpring(ty.value, { damping: 22, stiffness: 180 });
    });

  const composed = Gesture.Simultaneous(pinch, pan);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: scale.value }],
  }));

  const zoomOut = useCallback(() => {
    scale.value = withSpring(Math.max(0.65, scale.value - 0.2), { damping: 18, stiffness: 200 });
  }, [scale]);

  const zoomIn = useCallback(() => {
    scale.value = withSpring(Math.min(2.4, scale.value + 0.2), { damping: 18, stiffness: 200 });
  }, [scale]);

  const reset = useCallback(() => {
    scale.value = withSpring(1);
    tx.value = withSpring(0);
    ty.value = withSpring(0);
  }, [scale, tx, ty]);

  return (
    <View style={styles.wrap}>
      <View style={styles.zoomBar}>
        <Pressable onPress={zoomOut} style={styles.zoomBtn}>
          <Text style={styles.zoomText}>−</Text>
        </Pressable>
        <Pressable onPress={reset} style={styles.zoomBtnWide}>
          <Text style={styles.zoomText}>Reset</Text>
        </Pressable>
        <Pressable onPress={zoomIn} style={styles.zoomBtn}>
          <Text style={styles.zoomText}>+</Text>
        </Pressable>
      </View>
      <View style={styles.clip}>
        <GestureDetector gesture={composed}>
          <Animated.View style={[styles.canvas, animStyle]}>
            {tables.map((t) => {
              const bg = `${colorForStatus(t.status)}30`;
              const border = colorForStatus(t.status);
              return (
                <Pressable
                  key={t.id}
                  onPress={() => onTablePress(t)}
                  style={[
                    t.shape === 'circle' ? styles.circle : styles.rect,
                    {
                      left: t.x,
                      top: t.y,
                      width: t.w,
                      height: t.h,
                      borderColor: border,
                      backgroundColor: bg,
                    },
                  ]}
                >
                  <Text style={styles.tableNum}>{t.tableNumber}</Text>
                </Pressable>
              );
            })}
          </Animated.View>
        </GestureDetector>
      </View>
      <View style={styles.legend}>
        <Legend color={ownerColors.tableAvailable} label="Available" />
        <Legend color={ownerColors.tableReserved} label="Reserved" />
        <Legend color={ownerColors.tableOccupied} label="Occupied" />
        <Legend color={ownerColors.tableCleaning} label="Cleaning" />
      </View>
    </View>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  zoomBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  zoomBtn: {
    width: 44,
    height: 40,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.bgGlass,
    borderWidth: 1,
    borderColor: ownerColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomBtnWide: {
    paddingHorizontal: 16,
    height: 40,
    borderRadius: ownerRadii.xl,
    backgroundColor: ownerColors.bgGlass,
    borderWidth: 1,
    borderColor: ownerColors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomText: {
    fontSize: 16,
    fontWeight: '700',
    color: ownerColors.text,
  },
  clip: {
    height: CANVAS_H + 8,
    borderRadius: ownerRadii['2xl'],
    overflow: 'hidden',
  },
  canvas: {
    width: CANVAS_W,
    height: CANVAS_H,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: ownerRadii['2xl'],
    borderWidth: 1,
    borderColor: ownerColors.border,
  },
  rect: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: ownerRadii.xl,
    alignItems: 'center',
    justifyContent: 'center',
    ...ownerShadow.card,
  },
  circle: {
    position: 'absolute',
    borderWidth: 2.5,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    ...ownerShadow.card,
  },
  tableNum: {
    fontSize: 15,
    fontWeight: '800',
    color: ownerColors.text,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 12,
    fontWeight: '600',
    color: ownerColors.textMuted,
  },
});
