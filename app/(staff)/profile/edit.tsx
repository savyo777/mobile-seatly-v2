import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Switch,
  Image,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import {
  OWNER_BUSINESS_PROFILE as DEMO_OWNER_BUSINESS_PROFILE,
  OWNER_BUSINESS_HOURS as DEMO_OWNER_BUSINESS_HOURS,
  OWNER_BUSINESS_INSTAGRAM as DEMO_OWNER_BUSINESS_INSTAGRAM,
  type BusinessHoursRow,
} from '@/lib/mock/ownerApp';
import { isDemoModeEnabled } from '@/lib/config/demoMode';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { uploadRestaurantPhoto } from '@/lib/owner/uploadRestaurantPhoto';
import { saveRestaurantProfile } from '@/lib/owner/saveRestaurantProfile';
import {
  buildWeeklyHours,
  fetchRestaurantShifts,
  type RestaurantShift,
} from '@/lib/owner/restaurantShifts';
import { saveRestaurantHours, time12hToDbString } from '@/lib/owner/saveRestaurantHours';

const EMPTY_OWNER_BUSINESS_PROFILE: typeof DEMO_OWNER_BUSINESS_PROFILE = {
  name: '',
  cuisine: '',
  neighborhood: '',
  description: '',
  phone: '',
  email: '',
  address: '',
  website: '',
  rating: 0,
  reviewCount: 0,
  followerCount: 0,
  coverPhotoSeed: '',
};
const OWNER_BUSINESS_PROFILE: typeof DEMO_OWNER_BUSINESS_PROFILE = isDemoModeEnabled()
  ? DEMO_OWNER_BUSINESS_PROFILE
  : EMPTY_OWNER_BUSINESS_PROFILE;
const OWNER_BUSINESS_HOURS: typeof DEMO_OWNER_BUSINESS_HOURS = isDemoModeEnabled()
  ? DEMO_OWNER_BUSINESS_HOURS
  : [];
const OWNER_BUSINESS_INSTAGRAM = isDemoModeEnabled() ? DEMO_OWNER_BUSINESS_INSTAGRAM : '';

// ── Styles ──────────────────────────────────────────────────────────────────

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: c.border,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSave: {
    minWidth: 56,
    height: 38,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSavePressed: { opacity: 0.7 },
  topSaveText: {
    fontSize: 14,
    fontWeight: '800',
    color: c.bgBase,
    letterSpacing: -0.1,
  },
  topSaveTextDisabled: { opacity: 0.85 },
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
  },

  // ── Section header ──
  sectionHeader: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
    marginTop: spacing.lg,
    paddingHorizontal: 2,
  },
  card: {
    borderRadius: borderRadius.xl,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    marginBottom: 2,
  },

  // ── Photos ──
  coverWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverImage: { width: '100%', height: '100%' },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  coverOverlayText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },
  logoWrap: {
    // Roughly a third of the cover width so the two tiles read as a pair
    // (wide hero + square mark) instead of one giant and one tiny tile.
    width: '36%',
    aspectRatio: 1,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    marginBottom: spacing.sm,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoImage: { width: '100%', height: '100%' },
  logoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  photoHint: {
    fontSize: 12,
    fontWeight: '500',
    color: c.textMuted,
    marginBottom: spacing.md,
    paddingHorizontal: 2,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  dayLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: c.textPrimary,
    minWidth: 92,
  },
  dayValueCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  dayHours: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },
  dayClosed: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textMuted,
  },
  turnRowValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  galleryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: 2,
  },
  gallerySlot: {
    flex: 1,
    height: 88,
    borderRadius: borderRadius.lg,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryImage: { width: '100%', height: '100%' },
  galleryPlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  galleryPlaceholderText: {
    fontSize: 11,
    fontWeight: '600',
    color: c.textMuted,
  },

  // ── Fields ──
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 6,
  },
  fieldDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.3,
  },
  input: {
    fontSize: 15,
    fontWeight: '600',
    color: c.textPrimary,
    paddingVertical: 2,
    minHeight: 26,
  },
  inputMultiline: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    minHeight: 80,
    paddingVertical: 4,
    lineHeight: 22,
    textAlignVertical: 'top',
  },

  // ── Price range ──
  priceRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: 4,
  },
  priceChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    borderWidth: 1.5,
    borderColor: c.border,
    backgroundColor: c.bgElevated,
  },
  priceChipActive: {
    borderColor: c.gold,
    backgroundColor: `${c.gold}22`,
  },
  priceChipText: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textMuted,
  },
  priceChipTextActive: {
    color: c.gold,
  },

  // ── Hours ──
  hoursRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    gap: 8,
  },
  hoursTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  hoursDay: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: c.textPrimary,
  },
  hoursClosed: {
    fontSize: 13,
    fontWeight: '500',
    color: c.textMuted,
  },
  hoursTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 2,
  },
  hoursTimeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: c.textMuted,
    width: 36,
  },
  hoursTimeInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  hoursDash: {
    fontSize: 14,
    color: c.textMuted,
  },
  hoursTimeBtn: {
    flex: 1,
    backgroundColor: c.bgElevated,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
  },
  hoursTimeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: c.textPrimary,
  },

  // ── Time picker modal ──
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  pickerCard: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  pickerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.45)',
    textAlign: 'center',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  pickerColumns: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pickerColWrap: {
    flex: 1,
    alignItems: 'center',
  },
  pickerHighlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderRadius: 10,
  },
  pickerDoneBtn: {
    marginTop: spacing.lg,
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    paddingVertical: 14,
  },
  pickerDoneText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },

  // ── Bottom bar ──
  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  saveBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
    letterSpacing: 0.2,
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────


// ── Time helpers ─────────────────────────────────────────────────────────────

function to12h(time24: string | null): string {
  if (!time24) return '';
  const [hStr, mStr] = time24.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ?? '00';
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${m} ${period}`;
}

function parseTime12(t: string): { hour: string; minute: string; period: string } {
  const match = t.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return { hour: '5', minute: '00', period: 'PM' };
  return { hour: String(parseInt(match[1], 10)), minute: match[2], period: match[3].toUpperCase() };
}

// ── Wheel picker ─────────────────────────────────────────────────────────────

const ITEM_H = 44;
const SIDE = 2;
const COL_H = ITEM_H * (SIDE * 2 + 1);
const HOURS = ['1','2','3','4','5','6','7','8','9','10','11','12'];
const MINUTES = ['00','15','30','45'];
const PERIODS = ['AM','PM'];

// Turn time picker: 20..120 in 5-minute steps.
const TURN_TIME_MIN = 20;
const TURN_TIME_MAX = 120;
const TURN_TIME_STEP = 5;
const TURN_TIME_OPTIONS: string[] = (() => {
  const out: string[] = [];
  for (let v = TURN_TIME_MIN; v <= TURN_TIME_MAX; v += TURN_TIME_STEP) out.push(String(v));
  return out;
})();
const DEFAULT_TURN_TIME = '90';

function clampTurnTime(value: string): string {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return DEFAULT_TURN_TIME;
  const stepped = Math.round(n / TURN_TIME_STEP) * TURN_TIME_STEP;
  const clamped = Math.max(TURN_TIME_MIN, Math.min(TURN_TIME_MAX, stepped));
  return String(clamped);
}

function WheelColumn({ items, selected, onSelect }: {
  items: string[];
  selected: string;
  onSelect: (v: string) => void;
}) {
  const ref = useRef<ScrollView>(null);
  const idx = Math.max(0, items.indexOf(selected));

  useEffect(() => {
    const t = setTimeout(() => {
      ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    }, 30);
    return () => clearTimeout(t);
  }, []);

  const handleScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const newIdx = Math.max(0, Math.min(Math.round(y / ITEM_H), items.length - 1));
    onSelect(items[newIdx]);
  };

  return (
    <View style={{ height: COL_H }}>
      <View style={{ position: 'absolute', top: ITEM_H * SIDE, left: 0, right: 0, height: ITEM_H,
        backgroundColor: 'rgba(255,255,255,0.10)', borderRadius: 10 }} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM_H * SIDE }}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
      >
        {items.map((item) => {
          const active = item === selected;
          return (
            <View key={item} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{
                fontSize: active ? 22 : 17,
                fontWeight: active ? '700' : '400',
                color: active ? '#fff' : 'rgba(255,255,255,0.3)',
              }}>
                {item}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

function TimePickerModal({ visible, initial, label, onConfirm, onClose }: {
  visible: boolean;
  initial: string;
  label: string;
  onConfirm: (time: string) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const parsed = parseTime12(initial || '5:00 PM');
  const [hour, setHour] = useState(parsed.hour);
  const [minute, setMinute] = useState(parsed.minute);
  const [period, setPeriod] = useState(parsed.period);

  useEffect(() => {
    if (visible) {
      const p = parseTime12(initial || '5:00 PM');
      setHour(p.hour);
      setMinute(p.minute);
      setPeriod(p.period);
    }
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>{label.toUpperCase()}</Text>
          <View style={styles.pickerColumns}>
            <View style={styles.pickerColWrap}>
              <WheelColumn items={HOURS} selected={hour} onSelect={setHour} />
            </View>
            <View style={styles.pickerColWrap}>
              <WheelColumn items={MINUTES} selected={minute} onSelect={setMinute} />
            </View>
            <View style={styles.pickerColWrap}>
              <WheelColumn items={PERIODS} selected={period} onSelect={setPeriod} />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.pickerDoneBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => { onConfirm(`${hour}:${minute} ${period}`); onClose(); }}
          >
            <Text style={styles.pickerDoneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function TurnTimePickerModal({
  visible,
  initial,
  onConfirm,
  onClose,
}: {
  visible: boolean;
  initial: string;
  onConfirm: (value: string) => void;
  onClose: () => void;
}) {
  const styles = useStyles();
  const initialClamped = clampTurnTime(initial || DEFAULT_TURN_TIME);
  const [value, setValue] = useState(initialClamped);

  useEffect(() => {
    if (visible) setValue(clampTurnTime(initial || DEFAULT_TURN_TIME));
  }, [visible, initial]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.pickerBackdrop} onPress={onClose}>
        <Pressable onPress={() => {}} style={styles.pickerCard}>
          <Text style={styles.pickerTitle}>TURN TIME · MINUTES</Text>
          <View style={styles.pickerColumns}>
            <View style={styles.pickerColWrap}>
              <WheelColumn items={TURN_TIME_OPTIONS} selected={value} onSelect={setValue} />
            </View>
          </View>
          <Pressable
            style={({ pressed }) => [styles.pickerDoneBtn, { opacity: pressed ? 0.85 : 1 }]}
            onPress={() => {
              onConfirm(value);
              onClose();
            }}
          >
            <Text style={styles.pickerDoneText}>Done</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  const styles = useStyles();
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function FieldInput({
  label,
  value,
  onChangeText,
  divider,
  multiline,
  keyboardType,
  autoCapitalize,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  divider?: boolean;
  multiline?: boolean;
  keyboardType?: React.ComponentProps<typeof TextInput>['keyboardType'];
  autoCapitalize?: React.ComponentProps<typeof TextInput>['autoCapitalize'];
  placeholder?: string;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.fieldRow, divider && styles.fieldDivider]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        style={multiline ? styles.inputMultiline : styles.input}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize ?? 'sentences'}
      />
    </View>
  );
}

function HoursRowEditor({
  row,
  isOpen,
  onToggle,
  onPickTime,
  divider,
}: {
  row: BusinessHoursRow;
  isOpen: boolean;
  onToggle: (v: boolean) => void;
  onPickTime: (field: 'open' | 'close') => void;
  divider: boolean;
}) {
  const c = useColors();
  const styles = useStyles();
  return (
    <View style={[styles.hoursRow, divider && styles.fieldDivider]}>
      <View style={styles.hoursTop}>
        <Text style={styles.hoursDay}>{row.label}</Text>
        {!isOpen && <Text style={styles.hoursClosed}>Closed</Text>}
        <Switch
          value={isOpen}
          onValueChange={onToggle}
          trackColor={{ true: c.gold, false: c.border }}
          thumbColor="#fff"
        />
      </View>
      {isOpen && (
        <View style={styles.hoursTimeRow}>
          <Text style={styles.hoursTimeLabel}>Open</Text>
          <Pressable
            style={({ pressed }) => [styles.hoursTimeBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => onPickTime('open')}
            accessibilityRole="button"
          >
            <Text style={styles.hoursTimeBtnText}>{row.open || '5:00 PM'}</Text>
          </Pressable>
          <Text style={styles.hoursDash}>–</Text>
          <Text style={styles.hoursTimeLabel}>Close</Text>
          <Pressable
            style={({ pressed }) => [styles.hoursTimeBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={() => onPickTime('close')}
            accessibilityRole="button"
          >
            <Text style={styles.hoursTimeBtnText}>{row.close || '10:00 PM'}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function EditBusinessProfileScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const p = OWNER_BUSINESS_PROFILE;
  const { selectedRestaurant } = useOwnerScope();

  // Basics — seed from the selected real restaurant when not in demo mode.
  const [name, setName] = useState(p.name);
  const [cuisine, setCuisine] = useState(p.cuisine);
  const [neighborhood, setNeighborhood] = useState(p.neighborhood);
  const [description, setDescription] = useState(p.description);
  const [instagram, setInstagram] = useState(OWNER_BUSINESS_INSTAGRAM);

  // Contact
  const [phone, setPhone] = useState(p.phone);
  const [email, setEmail] = useState(p.email);
  const [website, setWebsite] = useState(p.website);
  const [address, setAddress] = useState(p.address);

  useEffect(() => {
    if (isDemoModeEnabled() || !selectedRestaurant) return;
    setName(selectedRestaurant.name ?? '');
    setCuisine(selectedRestaurant.cuisine ?? '');
    setDescription(selectedRestaurant.description ?? '');
    setInstagram(selectedRestaurant.instagram ?? '');
    setPhone(selectedRestaurant.phone ?? '');
    setEmail(selectedRestaurant.email ?? '');
    setWebsite(selectedRestaurant.website ?? '');
    setAddress(selectedRestaurant.address ?? '');
    setCoverUri(selectedRestaurant.coverPhotoUrl ?? null);
    setLogoUri(selectedRestaurant.logoUrl ?? null);
    setTurnTime(
      selectedRestaurant.turnTimeMinutes != null
        ? String(selectedRestaurant.turnTimeMinutes)
        : '',
    );
    let active = true;
    void fetchRestaurantShifts(selectedRestaurant.id).then((rows) => {
      if (!active) return;
      setShifts(rows);
      // Seed the per-day editor from the weekly view.
      // BusinessHoursRow uses UI day 0=Mon..6=Sun; buildWeeklyHours returns
      // entries in Mon..Sun order keyed by DB day (0=Sun..6=Sat).
      const weekly = buildWeeklyHours(rows);
      const nextHours: BusinessHoursRow[] = weekly.map((w, idx) => {
        const firstWindow = w.windows[0] ?? '';
        const [openStr = '', closeStr = ''] = firstWindow.split('–').map((p) => p.trim());
        const open12 = openStr || null;
        const close12 = closeStr || null;
        return {
          day: idx,
          label: w.dayLabel,
          open: open12,
          close: close12,
        };
      });
      setHours(nextHours);
      setOpenDays(weekly.map((w) => !w.isClosed));
    });
    return () => {
      active = false;
    };
  }, [selectedRestaurant]);

  // Photos. `*Uri` holds either a remote URL (loaded from the DB) or a local
  // file:// URI from the picker that still needs to be uploaded on save.
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [galleryUris, setGalleryUris] = useState<(string | null)[]>([null, null, null]);
  const [saving, setSaving] = useState(false);

  // Live hours (read from the shifts table) and restaurant-level turn time
  // (settings_json.turnTimeMinutes).
  const [shifts, setShifts] = useState<RestaurantShift[]>([]);
  const [turnTime, setTurnTime] = useState<string>('');
  const [turnTimePickerVisible, setTurnTimePickerVisible] = useState(false);

  // Hours
  const [hours, setHours] = useState<BusinessHoursRow[]>(
    OWNER_BUSINESS_HOURS.map((h) => ({ ...h, open: to12h(h.open), close: to12h(h.close) })),
  );
  const [openDays, setOpenDays] = useState<boolean[]>(
    OWNER_BUSINESS_HOURS.map((h) => h.open !== null),
  );

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.9,
    });
    if (!result.canceled) setCoverUri(result.assets[0].uri);
  };

  const pickLogo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled) setLogoUri(result.assets[0].uri);
  };

  const pickGallery = async (index: number) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    });
    if (!result.canceled) {
      setGalleryUris((prev) => {
        const next = [...prev];
        next[index] = result.assets[0].uri;
        return next;
      });
    }
  };

  // Time picker modal state
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerLabel, setPickerLabel] = useState('');
  const [pickerInitial, setPickerInitial] = useState('5:00 PM');
  const pickerCallback = useRef<(v: string) => void>(() => {});

  const openTimePicker = (label: string, current: string, onConfirm: (v: string) => void) => {
    setPickerLabel(label);
    setPickerInitial(current || '5:00 PM');
    pickerCallback.current = onConfirm;
    setPickerVisible(true);
  };

  const updateHour = (i: number, field: 'open' | 'close', value: string) => {
    setHours((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  };

  const toggleDay = (i: number, value: boolean) => {
    setOpenDays((prev) => {
      const next = [...prev];
      next[i] = value;
      return next;
    });
    if (!value) {
      setHours((prev) => {
        const next = [...prev];
        next[i] = { ...next[i], open: null, close: null };
        return next;
      });
    } else {
      setHours((prev) => {
        const next = [...prev];
        next[i] = {
          ...next[i],
          open: next[i].open ?? '5:00 PM',
          close: next[i].close ?? '10:00 PM',
        };
        return next;
      });
    }
  };

  const save = async () => {
    if (saving) return;
    const restaurantId = selectedRestaurant?.id;
    if (!restaurantId) {
      Alert.alert('No restaurant selected', 'Pick a restaurant before saving.');
      return;
    }
    setSaving(true);
    try {
      // Upload photos first (only when the user picked a new local file).
      // Already-remote URLs are left as-is.
      let coverImageUrl: string | null | undefined = undefined;
      let logoUrl: string | null | undefined = undefined;
      if (coverUri && coverUri.startsWith('file:')) {
        coverImageUrl = await uploadRestaurantPhoto({
          uri: coverUri,
          restaurantId,
          kind: 'cover',
        });
      } else if (coverUri === null && selectedRestaurant?.coverPhotoUrl) {
        coverImageUrl = null; // user cleared the photo
      }
      if (logoUri && logoUri.startsWith('file:')) {
        logoUrl = await uploadRestaurantPhoto({
          uri: logoUri,
          restaurantId,
          kind: 'logo',
        });
      } else if (logoUri === null && selectedRestaurant?.logoUrl) {
        logoUrl = null;
      }

      const parsedTurn = turnTime.trim() ? Number(turnTime.trim()) : null;
      const turnTimeMinutes =
        parsedTurn != null && Number.isFinite(parsedTurn) && parsedTurn > 0
          ? Math.round(parsedTurn)
          : null;

      await saveRestaurantProfile({
        restaurantId,
        name,
        cuisine,
        description,
        phone,
        email,
        address,
        website,
        instagram,
        coverImageUrl,
        logoUrl,
        turnTimeMinutes,
      });

      // Sync hours back to the shifts table. UI day index is 0=Mon..6=Sun;
      // the shifts table uses 0=Sun..6=Sat, so we shift by +1 mod 7.
      await saveRestaurantHours({
        restaurantId,
        turnTimeMinutes,
        days: hours.map((h, i) => ({
          dayIndex: (h.day + 1) % 7,
          isOpen: openDays[i] && Boolean(h.open) && Boolean(h.close),
          startTime: time12hToDbString(h.open),
          endTime: time12hToDbString(h.close),
        })),
      });

      Alert.alert('Saved', 'Business profile updated.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Save failed', err instanceof Error ? err.message : 'Try again in a moment.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => router.back()}
          accessibilityLabel="Back"
          accessibilityRole="button"
          hitSlop={8}
        >
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Edit profile</Text>
        <Pressable
          onPress={save}
          disabled={saving}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
          hitSlop={8}
          style={({ pressed }) => [styles.topSave, (pressed || saving) && styles.topSavePressed]}
        >
          <Text style={[styles.topSaveText, saving && styles.topSaveTextDisabled]}>
            {saving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
      >
        {/* ── Cover photo ── */}
        <SectionHeader title="Cover photo" />
        <Pressable
          style={styles.coverWrap}
          onPress={pickCover}
          accessibilityRole="button"
          accessibilityLabel={coverUri ? 'Change cover photo' : 'Add cover photo'}
        >
          {coverUri ? (
            <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
          ) : null}
          <View style={styles.coverOverlay}>
            <Ionicons name="camera-outline" size={26} color="#fff" />
            <Text style={styles.coverOverlayText}>
              {coverUri ? 'Change cover photo' : 'Add cover photo'}
            </Text>
          </View>
        </Pressable>
        <Text style={styles.photoHint}>Wide hero image shown at the top of your restaurant page.</Text>

        {/* ── Logo photo ── */}
        <SectionHeader title="Logo photo" />
        <Pressable
          style={styles.logoWrap}
          onPress={pickLogo}
          accessibilityRole="button"
          accessibilityLabel={logoUri ? 'Change logo photo' : 'Add logo photo'}
        >
          {logoUri ? (
            <Image source={{ uri: logoUri }} style={styles.logoImage} resizeMode="cover" />
          ) : null}
          <View style={styles.logoOverlay}>
            <Ionicons name="image-outline" size={22} color="#fff" />
            <Text style={styles.coverOverlayText}>
              {logoUri ? 'Change logo photo' : 'Add logo photo'}
            </Text>
          </View>
        </Pressable>
        <Text style={styles.photoHint}>Square mark used as your avatar in listings and headers.</Text>

        {/* ── Basics ── */}
        <SectionHeader title="Basics" />
        <View style={styles.card}>
          <FieldInput label="Restaurant name" value={name} onChangeText={setName} />
          <FieldInput label="Cuisine" value={cuisine} onChangeText={setCuisine} divider />
          <FieldInput label="Neighborhood" value={neighborhood} onChangeText={setNeighborhood} divider />
          <FieldInput
            label="Description"
            value={description}
            onChangeText={setDescription}
            divider
            multiline
          />
          <FieldInput
            label="Instagram"
            value={instagram}
            onChangeText={setInstagram}
            divider
            autoCapitalize="none"
            placeholder="@yourhandle"
          />
        </View>

        {/* ── Contact ── */}
        <SectionHeader title="Contact" />
        <View style={styles.card}>
          <FieldInput label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <FieldInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            divider
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <FieldInput
            label="Website"
            value={website}
            onChangeText={setWebsite}
            divider
            autoCapitalize="none"
          />
          <FieldInput label="Address" value={address} onChangeText={setAddress} divider multiline />
        </View>

        {/* ── Hours of operation (editable; one row per day Mon..Sun) ── */}
        <SectionHeader title="Hours of operation" />
        <View style={styles.card}>
          {hours.map((h, i) => (
            <HoursRowEditor
              key={h.day}
              row={h}
              isOpen={openDays[i]}
              onToggle={(v) => toggleDay(i, v)}
              onPickTime={(field) =>
                openTimePicker(
                  `${h.label} · ${field === 'open' ? 'Opening' : 'Closing'} time`,
                  (field === 'open' ? h.open : h.close) ?? '5:00 PM',
                  (v) => updateHour(i, field, v),
                )
              }
              divider={i > 0}
            />
          ))}
        </View>
        <Text style={styles.photoHint}>
          Tap a day to toggle open/closed. Times save to the shifts table on Save changes.
        </Text>

        {/* ── Turn time (restaurant-level default, used by the booking flow) ── */}
        <SectionHeader title="Turn time" />
        <Pressable
          style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
          onPress={() => setTurnTimePickerVisible(true)}
          accessibilityRole="button"
          accessibilityLabel="Edit turn time"
        >
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Average minutes per table</Text>
            <View style={styles.turnRowValue}>
              <Text style={styles.input}>
                {turnTime ? `${clampTurnTime(turnTime)} min` : 'Tap to set'}
              </Text>
              <Ionicons name="chevron-forward" size={16} color={c.textMuted} />
            </View>
          </View>
        </Pressable>
        <Text style={styles.photoHint}>
          How long a table is held per reservation. 20–120 min in 5-minute steps. Saves to
          settings_json.turnTimeMinutes and stamps every new shift.
        </Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          onPress={save}
          disabled={saving}
          style={({ pressed }) => [
            styles.saveBtn,
            { opacity: saving ? 0.7 : pressed ? 0.85 : 1 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Save changes"
        >
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save changes'}</Text>
        </Pressable>
      </View>

      <TimePickerModal
        visible={pickerVisible}
        initial={pickerInitial}
        label={pickerLabel}
        onConfirm={(v) => pickerCallback.current(v)}
        onClose={() => setPickerVisible(false)}
      />

      <TurnTimePickerModal
        visible={turnTimePickerVisible}
        initial={turnTime || DEFAULT_TURN_TIME}
        onConfirm={(v) => setTurnTime(v)}
        onClose={() => setTurnTimePickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
