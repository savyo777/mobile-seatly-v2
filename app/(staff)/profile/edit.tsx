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
  OWNER_BUSINESS_PROFILE,
  OWNER_BUSINESS_HOURS,
  OWNER_BUSINESS_INSTAGRAM,
  OWNER_BUSINESS_PRICE,
  type BusinessHoursRow,
} from '@/lib/mock/ownerApp';

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
    height: 160,
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

const PRICE_OPTIONS = ['$', '$$', '$$$', '$$$$'];

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

  // Basics
  const [name, setName] = useState(p.name);
  const [cuisine, setCuisine] = useState(p.cuisine);
  const [neighborhood, setNeighborhood] = useState(p.neighborhood);
  const [description, setDescription] = useState(p.description);
  const [instagram, setInstagram] = useState(OWNER_BUSINESS_INSTAGRAM);
  const [price, setPrice] = useState(OWNER_BUSINESS_PRICE);

  // Contact
  const [phone, setPhone] = useState(p.phone);
  const [email, setEmail] = useState(p.email);
  const [website, setWebsite] = useState(p.website);
  const [address, setAddress] = useState(p.address);

  // Photos
  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [galleryUris, setGalleryUris] = useState<(string | null)[]>([null, null, null]);

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

  const save = () => {
    Alert.alert('Saved', 'Business profile updated.', [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top }} />

      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable style={styles.iconBtn} onPress={() => router.back()} accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Edit profile</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: 120 }}
      >
        {/* ── Photos ── */}
        <SectionHeader title="Photos" />

        {/* Cover photo */}
        <Pressable style={styles.coverWrap} onPress={pickCover} accessibilityRole="button">
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

        {/* Gallery */}
        <View style={styles.galleryRow}>
          {galleryUris.map((uri, i) => (
            <Pressable
              key={i}
              style={styles.gallerySlot}
              onPress={() => pickGallery(i)}
              accessibilityRole="button"
              accessibilityLabel={`Gallery photo ${i + 1}`}
            >
              {uri ? (
                <Image source={{ uri }} style={styles.galleryImage} resizeMode="cover" />
              ) : (
                <View style={styles.galleryPlaceholder}>
                  <Ionicons name="add-circle-outline" size={22} color={c.textMuted} />
                  <Text style={styles.galleryPlaceholderText}>Photo</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

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
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Price range</Text>
            <View style={styles.priceRow}>
              {PRICE_OPTIONS.map((opt) => (
                <Pressable
                  key={opt}
                  style={[styles.priceChip, price === opt && styles.priceChipActive]}
                  onPress={() => setPrice(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={opt}
                >
                  <Text style={[styles.priceChipText, price === opt && styles.priceChipTextActive]}>
                    {opt}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
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

        {/* ── Hours ── */}
        <SectionHeader title="Hours" />
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
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          onPress={save}
          style={({ pressed }) => [styles.saveBtn, { opacity: pressed ? 0.85 : 1 }]}
          accessibilityRole="button"
        >
          <Text style={styles.saveBtnText}>Save changes</Text>
        </Pressable>
      </View>

      <TimePickerModal
        visible={pickerVisible}
        initial={pickerInitial}
        label={pickerLabel}
        onConfirm={(v) => pickerCallback.current(v)}
        onClose={() => setPickerVisible(false)}
      />
    </KeyboardAvoidingView>
  );
}
