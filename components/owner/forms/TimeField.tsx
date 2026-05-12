import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  ScrollView,
  StyleSheet,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

const ROW_H = 40;
const ROW_COUNT_VISIBLE = 5; // 2 above + center + 2 below

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5); // 5-min increments

function parseTimeString(value: string | null): { h: number; m: number } {
  if (!value) return { h: 18, m: 0 };
  const [hStr, mStr] = value.split(':');
  const h = Math.max(0, Math.min(23, Number(hStr) || 0));
  const m = Math.max(0, Math.min(59, Number(mStr) || 0));
  return { h, m: Math.round(m / 5) * 5 };
}

function format12(h: number, m: number): string {
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

function toDbTime(h: number, m: number): string {
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}

interface WheelProps {
  values: number[];
  selectedIndex: number;
  onChange: (index: number) => void;
  formatter: (v: number) => string;
}

function Wheel({ values, selectedIndex, onChange, formatter }: WheelProps) {
  const c = useColors();
  const styles = useStyles();
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: selectedIndex * ROW_H, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const idx = Math.round(e.nativeEvent.contentOffset.y / ROW_H);
    onChange(Math.max(0, Math.min(values.length - 1, idx)));
  };

  return (
    <View style={[styles.wheel, { height: ROW_H * ROW_COUNT_VISIBLE }]}>
      <View pointerEvents="none" style={[styles.wheelMarker, { top: ROW_H * 2, height: ROW_H, borderColor: c.gold }]} />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ROW_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ROW_H * 2 }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
      >
        {values.map((v, i) => (
          <View key={v} style={[styles.wheelRow, { height: ROW_H }]}>
            <Text style={[styles.wheelText, i === selectedIndex && styles.wheelTextActive]}>
              {formatter(v)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles((c) => ({
  field: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  fieldValue: { fontSize: 16, fontWeight: '600', color: c.textPrimary, paddingVertical: 4 },
  fieldEmpty: { color: c.textMuted },

  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: c.bgSurface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.lg,
  },
  sheetTitle: {
    fontSize: 16, fontWeight: '800', color: c.textPrimary,
    textAlign: 'center', marginBottom: spacing.md,
  },
  wheels: { flexDirection: 'row', gap: spacing.md },
  wheel: { flex: 1, overflow: 'hidden' },
  wheelMarker: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: 1, borderBottomWidth: 1,
  },
  wheelRow: { alignItems: 'center', justifyContent: 'center' },
  wheelText: { fontSize: 18, fontWeight: '600', color: c.textMuted },
  wheelTextActive: { color: c.textPrimary, fontWeight: '800' },

  footer: {
    flexDirection: 'row',
    paddingTop: spacing.md,
    gap: spacing.md,
  },
  clearBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    alignItems: 'center', justifyContent: 'center',
  },
  clearText: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  doneBtn: {
    flex: 1, paddingVertical: 12,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  doneText: { fontSize: 14, fontWeight: '800', color: c.bgBase },
}));

export interface TimeFieldProps {
  label: string;
  value: string | null; // HH:MM:SS
  onChange: (value: string | null) => void;
  placeholder?: string;
}

export function TimeField({ label, value, onChange, placeholder = 'Select a time' }: TimeFieldProps) {
  const styles = useStyles();
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => parseTimeString(value), [value]);
  const [hIdx, setHIdx] = useState(initial.h);
  const [mIdx, setMIdx] = useState(MINUTES.indexOf(initial.m));

  const display = value ? format12(initial.h, initial.m) : '';

  const onOpen = () => {
    const init = parseTimeString(value);
    setHIdx(init.h);
    setMIdx(MINUTES.indexOf(init.m));
    setOpen(true);
  };

  const onDone = () => {
    const h = HOURS[hIdx];
    const m = MINUTES[mIdx];
    onChange(toDbTime(h, m));
    setOpen(false);
  };

  return (
    <>
      <Pressable onPress={onOpen} style={styles.field}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={[styles.fieldValue, !value && styles.fieldEmpty]}>
          {display || placeholder}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable onPress={() => {}} style={styles.sheet}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <View style={styles.wheels}>
              <Wheel
                values={HOURS}
                selectedIndex={hIdx}
                onChange={setHIdx}
                formatter={(v) => {
                  const p = v >= 12 ? 'PM' : 'AM';
                  const h12 = v === 0 ? 12 : v > 12 ? v - 12 : v;
                  return `${h12} ${p}`;
                }}
              />
              <Wheel
                values={MINUTES}
                selectedIndex={mIdx}
                onChange={setMIdx}
                formatter={(v) => String(v).padStart(2, '0')}
              />
            </View>
            <View style={styles.footer}>
              <Pressable onPress={() => { onChange(null); setOpen(false); }} style={styles.clearBtn}>
                <Text style={styles.clearText}>Clear</Text>
              </Pressable>
              <Pressable onPress={onDone} style={styles.doneBtn}>
                <Text style={styles.doneText}>Done</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

export const TimeFieldStyles = StyleSheet.create({});
