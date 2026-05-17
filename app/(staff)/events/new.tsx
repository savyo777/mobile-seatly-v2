import React, { useMemo, useState } from 'react';
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
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';
import { DateField } from '@/components/owner/forms/DateField';
import { TimeField } from '@/components/owner/forms/TimeField';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { uploadEventMedia } from '@/lib/owner/uploadEventMedia';
import { createEvent } from '@/lib/owner/createEventOrPromotion';
import { friendlyError } from '@/lib/errors/friendlyError';
import {
  normalizeTextInput,
  sanitizeIntegerInput,
  sanitizeMoneyInput,
  sanitizeTextInput,
} from '@/lib/validation/input';

const DAY_CHIPS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const FREQ_OPTS: { value: 'daily'|'weekly'|'monthly'; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

function buildRRule(freq: string, interval: number, days: number[]): string {
  const parts = [`FREQ=${freq.toUpperCase()}`];
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (freq === 'weekly' && days.length > 0) {
    const map = ['SU','MO','TU','WE','TH','FR','SA'];
    parts.push(`BYDAY=${days.map((d) => map[d]).join(',')}`);
  }
  return parts.join(';');
}

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
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },

  scopePrompt: {
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    gap: spacing.sm,
  },
  scopeTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
  scopeBody: { fontSize: 13, color: c.textMuted, textAlign: 'center' },

  imagePicker: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    height: 200,
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  imagePlaceholder: { alignItems: 'center', gap: 8 },
  imagePlaceholderText: { fontSize: 14, fontWeight: '600', color: c.textMuted },
  coverImage: { width: '100%', height: '100%' },
  changePhotoBtn: {
    position: 'absolute', bottom: spacing.md, right: spacing.md,
    backgroundColor: 'rgba(0,0,0,0.55)', borderRadius: borderRadius.full,
    paddingHorizontal: 12, paddingVertical: 6,
    flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  changePhotoText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  section: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: c.bgSurface,
    borderRadius: borderRadius.xl,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    overflow: 'hidden',
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: c.textMuted, letterSpacing: 0.8,
    paddingHorizontal: spacing.md, paddingTop: spacing.md, paddingBottom: 4,
  },
  fieldRow: { paddingHorizontal: spacing.md, paddingVertical: spacing.md, gap: 4 },
  fieldDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: c.textMuted },
  input: {
    fontSize: 16, fontWeight: '600', color: c.textPrimary,
    paddingVertical: 4, minHeight: 28,
  },
  inputMultiline: {
    fontSize: 15, fontWeight: '500', color: c.textPrimary,
    minHeight: 72, paddingVertical: 4, lineHeight: 22,
  },

  rowPair: { flexDirection: 'row' },
  rowPairField: { flex: 1 },
  rowPairDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: c.border,
    marginVertical: spacing.sm,
  },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    gap: spacing.md, minHeight: 52,
  },
  toggleLabelCol: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  toggleSub: { fontSize: 12, color: c.textMuted, fontWeight: '500' },

  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm,
  },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
  },
  chipActive: {
    backgroundColor: 'rgba(212,175,55,0.14)',
    borderColor: 'rgba(212,175,55,0.5)',
  },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  chipTextActive: { color: c.gold },

  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  postBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
    flexDirection: 'row', gap: 8,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
}));

export default function NewEventScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedRestaurant, isAll } = useOwnerScope();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoMime, setVideoMime] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [dressCode, setDressCode] = useState('');
  const [minAge, setMinAge] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [fixedArrival, setFixedArrival] = useState(false);
  const [price, setPrice] = useState('');
  const [capacity, setCapacity] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [menuId, setMenuId] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFreq, setRecurFreq] = useState<'daily'|'weekly'|'monthly'>('weekly');
  const [recurInterval, setRecurInterval] = useState('1');
  const [recurDays, setRecurDays] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() =>
    !!selectedRestaurant && !isAll && name.trim().length > 0 && !submitting,
    [selectedRestaurant, isAll, name, submitting]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setCoverUri(result.assets[0].uri);
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85,
      videoMaxDuration: 30,
    });
    if (!result.canceled && result.assets[0]) {
      setVideoUri(result.assets[0].uri);
      setVideoMime(result.assets[0].mimeType ?? 'video/mp4');
    }
  };

  const toggleDay = (idx: number) => {
    setRecurDays((prev) => prev.includes(idx) ? prev.filter((d) => d !== idx) : [...prev, idx]);
  };

  const submit = async () => {
    if (!canSubmit || !selectedRestaurant) return;
    setSubmitting(true);
    try {
      let coverUrl: string | null = null;
      if (coverUri) {
        coverUrl = await uploadEventMedia({
          uri: coverUri,
          restaurantId: selectedRestaurant.id,
          kind: 'event',
          ext: 'jpg',
          contentType: 'image/jpeg',
        });
      }
      let mediaUrl: string | null = null;
      let mediaName: string | null = null;
      if (videoUri) {
        const ext = (videoMime?.split('/')[1] ?? 'mp4').toLowerCase();
        mediaUrl = await uploadEventMedia({
          uri: videoUri,
          restaurantId: selectedRestaurant.id,
          kind: 'event',
          ext,
          contentType: videoMime ?? 'video/mp4',
        });
        mediaName = videoUri.split('/').pop() ?? null;
      }

      const cleanedName = normalizeTextInput(name, { maxLength: 120 });
      const cleanedDescription = normalizeTextInput(description, { maxLength: 2000, multiline: true });
      const cleanedTheme = normalizeTextInput(theme, { maxLength: 80 });
      const cleanedDressCode = normalizeTextInput(dressCode, { maxLength: 80 });
      const cleanedMenuId = normalizeTextInput(menuId, { maxLength: 80 });

      await createEvent({
        restaurant_id: selectedRestaurant.id,
        name: cleanedName,
        description: cleanedDescription || null,
        theme: cleanedTheme || null,
        dress_code: cleanedDressCode || null,
        min_age: minAge ? Number(minAge) : null,
        date,
        end_date: endDate,
        start_time: startTime,
        end_time: endTime,
        fixed_arrival_time: fixedArrival,
        price_per_person: price ? Number(price) : null,
        capacity: capacity ? Number(capacity) : null,
        is_private: isPrivate,
        menu_id: cleanedMenuId || null,
        is_recurring: isRecurring,
        recurrence_rule: isRecurring
          ? buildRRule(recurFreq, Math.max(1, Number(recurInterval) || 1), recurDays)
          : null,
        cover_image_url: coverUrl,
        media_url: mediaUrl,
        media_type: videoMime,
        media_name: mediaName,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Event posted', `"${cleanedName}" is now live.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      Alert.alert('Could not post event', friendlyError(err, 'Please try again in a moment.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={{ paddingTop: insets.top }} />
      <View style={styles.topBar}>
        <Pressable style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]} onPress={() => router.back()}>
          <Ionicons name="close" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>Post an event</Text>
        <View style={{ width: 36 }} />
      </View>

      {(isAll || !selectedRestaurant) ? (
        <View style={styles.scopePrompt}>
          <Ionicons name="business-outline" size={32} color={c.textMuted} />
          <Text style={styles.scopeTitle}>Pick a restaurant first</Text>
          <Text style={styles.scopeBody}>
            You're viewing all restaurants. Use the restaurant picker on the home screen to select one before posting an event.
          </Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] + Math.max(insets.bottom, spacing.md) }}>

          {/* Cover photo */}
          <Pressable style={({ pressed }) => [styles.imagePicker, pressed && { opacity: 0.85 }]} onPress={pickCover}>
            {coverUri ? (
              <>
                <Image source={{ uri: coverUri }} style={styles.coverImage} resizeMode="cover" />
                <Pressable style={styles.changePhotoBtn} onPress={pickCover}>
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
              <Text style={styles.fieldLabel}>Name *</Text>
              <TextInput
                value={name} onChangeText={(value) => setName(sanitizeTextInput(value, { maxLength: 120 }))}
                placeholder="Truffle & Barolo Tasting Night"
                placeholderTextColor={c.textMuted}
                style={styles.input}
                maxLength={120}
              />
            </View>
            <View style={[styles.fieldRow, styles.fieldDivider]}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput
                value={description} onChangeText={(value) => setDescription(sanitizeTextInput(value, { maxLength: 2000, multiline: true }))}
                placeholder="What guests will see"
                placeholderTextColor={c.textMuted}
                style={styles.inputMultiline} multiline textAlignVertical="top"
                maxLength={2000}
              />
            </View>
            <View style={[styles.fieldRow, styles.fieldDivider]}>
              <Text style={styles.fieldLabel}>Theme</Text>
              <TextInput
                value={theme} onChangeText={(value) => setTheme(sanitizeTextInput(value, { maxLength: 80 }))}
                placeholder="e.g. 1920s Speakeasy"
                placeholderTextColor={c.textMuted}
                style={styles.input}
                maxLength={80}
              />
            </View>
          </View>

          {/* When */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WHEN</Text>
            <View style={styles.rowPair}>
              <View style={styles.rowPairField}>
                <DateField label="Start date" value={date} onChange={setDate} />
              </View>
              <View style={styles.rowPairDivider} />
              <View style={styles.rowPairField}>
                <DateField label="End date" value={endDate} onChange={setEndDate} minIso={date ?? undefined} />
              </View>
            </View>
            <View style={[styles.rowPair, styles.fieldDivider]}>
              <View style={styles.rowPairField}>
                <TimeField label="Start time" value={startTime} onChange={setStartTime} />
              </View>
              <View style={styles.rowPairDivider} />
              <View style={styles.rowPairField}>
                <TimeField label="End time" value={endTime} onChange={setEndTime} />
              </View>
            </View>
            <View style={[styles.toggleRow, styles.fieldDivider]}>
              <View style={styles.toggleLabelCol}>
                <Text style={styles.toggleTitle}>Fixed arrival time</Text>
                <Text style={styles.toggleSub}>Everyone arrives at start time (no staggered seating)</Text>
              </View>
              <Switch value={fixedArrival} onValueChange={setFixedArrival}
                trackColor={{ true: c.gold, false: c.bgElevated }} thumbColor={c.bgSurface} />
            </View>
          </View>

          {/* Recurring */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECURRING</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelCol}>
                <Text style={styles.toggleTitle}>Repeats</Text>
                <Text style={styles.toggleSub}>Use for weekly tastings, monthly socials, etc.</Text>
              </View>
              <Switch value={isRecurring} onValueChange={setIsRecurring}
                trackColor={{ true: c.gold, false: c.bgElevated }} thumbColor={c.bgSurface} />
            </View>
            {isRecurring && (
              <>
                <View style={styles.fieldDivider} />
                <View style={styles.chipRow}>
                  {FREQ_OPTS.map((f) => {
                    const active = recurFreq === f.value;
                    return (
                      <Pressable key={f.value} onPress={() => setRecurFreq(f.value)}
                        style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}>
                        <Text style={[styles.chipText, active && styles.chipTextActive]}>{f.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={[styles.fieldRow, styles.fieldDivider]}>
                  <Text style={styles.fieldLabel}>Every N {recurFreq === 'daily' ? 'days' : recurFreq === 'weekly' ? 'weeks' : 'months'}</Text>
                  <TextInput value={recurInterval} onChangeText={(value) => setRecurInterval(sanitizeIntegerInput(value, 3))}
                    keyboardType="number-pad" style={styles.input} placeholder="1"
                    placeholderTextColor={c.textMuted} maxLength={3}/>
                </View>
                {recurFreq === 'weekly' && (
                  <View style={[styles.chipRow, styles.fieldDivider]}>
                    {DAY_CHIPS.map((d, idx) => {
                      const active = recurDays.includes(idx);
                      return (
                        <Pressable key={d} onPress={() => toggleDay(idx)}
                          style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}>
                          <Text style={[styles.chipText, active && styles.chipTextActive]}>{d}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Pricing & capacity */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>PRICING & CAPACITY</Text>
            <View style={styles.rowPair}>
              <View style={styles.rowPairField}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Price per person</Text>
                  <TextInput value={price} onChangeText={(value) => setPrice(sanitizeMoneyInput(value))}
                    placeholder="$0 = free" placeholderTextColor={c.textMuted}
                    keyboardType="decimal-pad" style={styles.input} maxLength={14}/>
                </View>
              </View>
              <View style={styles.rowPairDivider} />
              <View style={styles.rowPairField}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Capacity</Text>
                  <TextInput value={capacity} onChangeText={(value) => setCapacity(sanitizeIntegerInput(value, 5))}
                    placeholder="e.g. 40" placeholderTextColor={c.textMuted}
                    keyboardType="number-pad" style={styles.input} maxLength={5}/>
                </View>
              </View>
            </View>
          </View>

          {/* Restrictions */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RESTRICTIONS</Text>
            <View style={styles.rowPair}>
              <View style={styles.rowPairField}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Dress code</Text>
                  <TextInput value={dressCode} onChangeText={(value) => setDressCode(sanitizeTextInput(value, { maxLength: 80 }))}
                    placeholder="Smart casual" placeholderTextColor={c.textMuted}
                    style={styles.input} maxLength={80}/>
                </View>
              </View>
              <View style={styles.rowPairDivider} />
              <View style={styles.rowPairField}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Minimum age</Text>
                  <TextInput value={minAge} onChangeText={(value) => setMinAge(sanitizeIntegerInput(value, 3))}
                    placeholder="e.g. 21" placeholderTextColor={c.textMuted}
                    keyboardType="number-pad" style={styles.input} maxLength={3}/>
                </View>
              </View>
            </View>
          </View>

          {/* Tasting menu link */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>TASTING MENU (OPTIONAL)</Text>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Menu ID</Text>
              <TextInput value={menuId} onChangeText={(value) => setMenuId(sanitizeTextInput(value, { maxLength: 80 }))}
                placeholder="Internal menu reference (UUID)"
                placeholderTextColor={c.textMuted}
                style={styles.input}
                maxLength={80}
                autoCapitalize="none" autoCorrect={false}/>
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VISIBILITY</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelCol}>
                <Text style={styles.toggleTitle}>Private event</Text>
                <Text style={styles.toggleSub}>Hide from public Discover (link/invite only)</Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate}
                trackColor={{ true: c.gold, false: c.bgElevated }} thumbColor={c.bgSurface} />
            </View>
          </View>

          {/* Video */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VIDEO (OPTIONAL)</Text>
            <Pressable onPress={pickVideo} style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>{videoUri ? 'Selected' : 'Tap to add a short clip'}</Text>
              <Text style={styles.input} numberOfLines={1}>
                {videoUri ? (videoUri.split('/').pop() ?? videoUri) : 'No video'}
              </Text>
            </Pressable>
          </View>

        </ScrollView>
      )}

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable onPress={submit} disabled={!canSubmit}
          style={({ pressed }) => [styles.postBtn, !canSubmit && styles.postBtnDisabled, pressed && canSubmit && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}>
          {submitting ? <ActivityIndicator color="#fff" /> : null}
          <Text style={styles.postBtnText}>{submitting ? 'Posting…' : 'Post event'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
