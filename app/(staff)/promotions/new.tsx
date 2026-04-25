import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type EventType = 'promotion' | 'happy_hour' | 'tasting_menu' | 'event';

const TYPE_OPTIONS: { value: EventType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'promotion', label: 'Promotion', icon: 'pricetag-outline' },
  { value: 'happy_hour', label: 'Happy Hour', icon: 'wine-outline' },
  { value: 'tasting_menu', label: 'Tasting Menu', icon: 'restaurant-outline' },
  { value: 'event', label: 'Event', icon: 'sparkles-outline' },
];

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
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },

  imagePicker: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    height: 200,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerPressed: { opacity: 0.85 },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imagePlaceholderText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  coverImage: { width: '100%', height: '100%' },
  changePhotoBtn: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: borderRadius.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changePhotoText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.8,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: 4,
  },
  fieldRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  fieldDivider: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
  },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  input: {
    fontSize: 16,
    fontWeight: '600',
    color: c.textPrimary,
    paddingVertical: 4,
    minHeight: 28,
  },
  inputMultiline: {
    fontSize: 15,
    fontWeight: '500',
    color: c.textPrimary,
    minHeight: 72,
    paddingVertical: 4,
    lineHeight: 22,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
  },
  typeChipActive: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: 'rgba(212,175,55,0.5)',
  },
  typeChipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  typeChipTextActive: { color: c.gold },

  rowPair: {
    flexDirection: 'row',
  },
  rowPairField: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 4,
  },
  rowPairDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: spacing.sm,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 52,
  },
  toggleLabelCol: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  toggleSub: { fontSize: 12, color: c.textMuted, fontWeight: '500' },

  preview: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    height: 260,
    borderWidth: 1,
    borderColor: c.border,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: c.textMuted,
    letterSpacing: 0.8,
    marginHorizontal: spacing.lg,
    marginBottom: 6,
  },
  previewRestaurant: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(212,175,55,0.9)',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  previewTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  previewMeta: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: borderRadius.full,
    backgroundColor: c.gold,
  },
  previewBtnText: { fontSize: 13, fontWeight: '800', color: c.bgBase },
  previewBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    gap: 4,
  },

  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  postBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  postBtnPressed: { opacity: 0.92, transform: [{ scale: 0.98 }] },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
}));

export default function NewPromotionScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [type, setType] = useState<EventType>('promotion');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [price, setPrice] = useState('');
  const [limitedSpots, setLimitedSpots] = useState(false);
  const [spots, setSpots] = useState('');
  const [description, setDescription] = useState('');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setCoverImage(result.assets[0].uri);
    }
  };

  const canSubmit = title.trim().length > 0 && date.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Alert.alert('Promotion posted', `"${title}" is now live.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  const typeLabel = TYPE_OPTIONS.find((t) => t.value === type)?.label ?? 'Promotion';

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }} />

      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Post a promotion</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing['3xl'] + Math.max(insets.bottom, spacing.md) }}>

        {/* Cover photo */}
        <Pressable
          style={({ pressed }) => [styles.imagePicker, pressed && styles.imagePickerPressed]}
          onPress={pickImage}
        >
          {coverImage ? (
            <>
              <Image source={{ uri: coverImage }} style={styles.coverImage} resizeMode="cover" />
              <Pressable style={styles.changePhotoBtn} onPress={pickImage}>
                <Ionicons name="camera-outline" size={14} color="#fff" />
                <Text style={styles.changePhotoText}>Change</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Ionicons name="image-outline" size={36} color={c.textMuted} />
              <Text style={styles.imagePlaceholderText}>Add a cover photo</Text>
            </View>
          )}
        </Pressable>

        {/* Basics */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>BASICS</Text>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Truffle & Barolo Tasting Night"
              placeholderTextColor={c.textMuted}
              style={styles.input}
            />
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What guests will see"
              placeholderTextColor={c.textMuted}
              style={styles.inputMultiline}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>CATEGORY</Text>
          <View style={styles.typeGrid}>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [styles.typeChip, active && styles.typeChipActive, pressed && { opacity: 0.85 }]}
                  onPress={() => setType(opt.value)}
                >
                  <Ionicons name={opt.icon} size={15} color={active ? c.gold : c.textMuted} />
                  <Text style={[styles.typeChipText, active && styles.typeChipTextActive]}>{opt.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Date & time */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DATE & TIME</Text>
          <View style={styles.rowPair}>
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>Date</Text>
              <TextInput
                value={date}
                onChangeText={setDate}
                placeholder="Apr 21, 2026"
                placeholderTextColor={c.textMuted}
                style={styles.input}
              />
            </View>
            <View style={styles.rowPairDivider} />
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>Time</Text>
              <TextInput
                value={time}
                onChangeText={setTime}
                placeholder="7:00 PM"
                placeholderTextColor={c.textMuted}
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* Price & spots */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>PRICING & AVAILABILITY</Text>
          <View style={styles.rowPair}>
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>Price per person</Text>
              <TextInput
                value={price}
                onChangeText={setPrice}
                placeholder="$0 = free"
                placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad"
                style={styles.input}
              />
            </View>
            {limitedSpots && (
              <>
                <View style={styles.rowPairDivider} />
                <View style={styles.rowPairField}>
                  <Text style={styles.fieldLabel}>Spots available</Text>
                  <TextInput
                    value={spots}
                    onChangeText={setSpots}
                    placeholder="e.g. 20"
                    placeholderTextColor={c.textMuted}
                    keyboardType="number-pad"
                    style={styles.input}
                  />
                </View>
              </>
            )}
          </View>
          <View style={[styles.toggleRow, styles.fieldDivider]}>
            <View style={styles.toggleLabelCol}>
              <Text style={styles.toggleTitle}>Limited spots</Text>
              <Text style={styles.toggleSub}>Set a cap on reservations</Text>
            </View>
            <Switch
              value={limitedSpots}
              onValueChange={setLimitedSpots}
              trackColor={{ true: c.gold, false: c.bgElevated }}
              thumbColor={c.bgSurface}
            />
          </View>
        </View>

        {/* Live preview */}
        {(title || coverImage) ? (
          <>
            <Text style={styles.previewLabel}>PREVIEW</Text>
            <View style={styles.preview}>
              {coverImage ? (
                <Image source={{ uri: coverImage }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
              ) : (
                <View style={[StyleSheet.absoluteFillObject, { backgroundColor: c.bgElevated }]} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.88)']}
                style={StyleSheet.absoluteFillObject}
              />
              {/* Type badge */}
              <View style={{ position: 'absolute', top: spacing.md, left: spacing.md }}>
                <View style={{
                  paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999,
                  backgroundColor: 'rgba(10,10,10,0.55)', borderWidth: 1, borderColor: 'rgba(212,175,55,0.35)',
                }}>
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.gold, letterSpacing: 0.8 }}>
                    {typeLabel.toUpperCase()}
                  </Text>
                </View>
              </View>
              {limitedSpots && spots ? (
                <View style={{ position: 'absolute', top: spacing.md, left: spacing.md + 110, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, backgroundColor: c.gold }}>
                  <Ionicons name="flame" size={11} color={c.bgBase} />
                  <Text style={{ fontSize: 10, fontWeight: '800', color: c.bgBase }}>{spots} spots left</Text>
                </View>
              ) : null}
              <View style={styles.previewBottom}>
                <Text style={styles.previewRestaurant}>Nova Ristorante</Text>
                <Text style={styles.previewTitle}>{title || 'Your promotion title'}</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 2 }}>
                  {date ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="calendar-outline" size={12} color="rgba(212,175,55,0.8)" />
                      <Text style={styles.previewMeta}>{date}{time ? ` at ${time}` : ''}</Text>
                    </View>
                  ) : null}
                  {price ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Ionicons name="ticket-outline" size={12} color="rgba(255,255,255,0.5)" />
                      <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: '500' }}>${price} / person</Text>
                    </View>
                  ) : null}
                </View>
                <Pressable style={styles.previewBtn}>
                  <Ionicons name="calendar" size={14} color={c.bgBase} />
                  <Text style={styles.previewBtnText}>Reserve a spot</Text>
                </Pressable>
              </View>
            </View>
          </>
        ) : null}

      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [styles.postBtn, !canSubmit && styles.postBtnDisabled, pressed && canSubmit && styles.postBtnPressed]}
        >
          <Text style={styles.postBtnText}>Post promotion</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
