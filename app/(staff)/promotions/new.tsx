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
import {
  MenuItemMultiPicker,
  MenuItemSinglePicker,
} from '@/components/owner/forms/MenuItemPicker';
import { useOwnerScope } from '@/hooks/useOwnerScope';
import { uploadEventMedia } from '@/lib/owner/uploadEventMedia';
import { createPromotion } from '@/lib/owner/createEventOrPromotion';

type PromoType = 'percent' | 'amount' | 'bogo' | 'free_item';
type AppliesTo = 'all' | 'items';
type RecurFreq = 'daily' | 'weekly' | 'monthly';
type BadgeColor = 'amber' | 'red' | 'green' | 'blue';

const PROMO_TYPES: { value: PromoType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'percent', label: '% off', icon: 'pricetag-outline' },
  { value: 'amount', label: '$ off', icon: 'cash-outline' },
  { value: 'bogo', label: 'BOGO', icon: 'gift-outline' },
  { value: 'free_item', label: 'Free item', icon: 'sparkles-outline' },
];
const BADGE_COLORS: { value: BadgeColor; hex: string }[] = [
  { value: 'amber', hex: '#D4AF37' },
  { value: 'red',   hex: '#D14242' },
  { value: 'green', hex: '#5CA45C' },
  { value: 'blue',  hex: '#4C7CD4' },
];
const FREQ_OPTS: { value: RecurFreq; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];
const DAY_CHIPS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function combineDateAndTime(dateIso: string | null, timeIso: string | null): string | null {
  if (!dateIso) return null;
  const t = timeIso ?? '00:00:00';
  // Treat as local time, return as ISO timestamp. Supabase reads timestamptz.
  const d = new Date(`${dateIso}T${t}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

const useStyles = createStyles((c) => ({
  root: { flex: 1, backgroundColor: c.bgBase },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border,
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: c.bgSurface,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    alignItems: 'center', justifyContent: 'center',
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: c.textPrimary, letterSpacing: -0.2 },

  scopePrompt: {
    margin: spacing.lg, padding: spacing.lg,
    borderRadius: borderRadius.xl,
    borderWidth: 1, borderColor: c.border,
    alignItems: 'center', gap: spacing.sm,
  },
  scopeTitle: { fontSize: 15, fontWeight: '800', color: c.textPrimary },
  scopeBody: { fontSize: 13, color: c.textMuted, textAlign: 'center' },

  imagePicker: {
    marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.md,
    height: 200, borderRadius: borderRadius.xl, overflow: 'hidden',
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
    marginHorizontal: spacing.lg, marginBottom: spacing.md,
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
  input: { fontSize: 16, fontWeight: '600', color: c.textPrimary, paddingVertical: 4, minHeight: 28 },
  inputMultiline: { fontSize: 15, fontWeight: '500', color: c.textPrimary, minHeight: 72, paddingVertical: 4, lineHeight: 22 },

  rowPair: { flexDirection: 'row' },
  rowPairField: { flex: 1 },
  rowPairDivider: { width: StyleSheet.hairlineWidth, backgroundColor: c.border, marginVertical: spacing.sm },

  toggleRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.md,
    gap: spacing.md, minHeight: 52,
  },
  toggleLabelCol: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  toggleSub: { fontSize: 12, color: c.textMuted, fontWeight: '500' },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: spacing.md, paddingBottom: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth, borderColor: c.border,
    flexDirection: 'row', alignItems: 'center', gap: 6,
  },
  chipActive: { backgroundColor: 'rgba(212,175,55,0.14)', borderColor: 'rgba(212,175,55,0.5)' },
  chipText: { fontSize: 13, fontWeight: '700', color: c.textMuted },
  chipTextActive: { color: c.gold },

  colorSwatch: {
    width: 28, height: 28, borderRadius: 14,
    borderWidth: 2, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  colorSwatchActive: { borderColor: c.textPrimary },

  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg, paddingTop: spacing.md,
  },
  postBtn: {
    backgroundColor: c.gold, borderRadius: borderRadius.full,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 16,
    flexDirection: 'row', gap: 8,
  },
  postBtnDisabled: { opacity: 0.4 },
  postBtnText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 0.2 },
}));

export default function NewPromotionScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { selectedRestaurant, isAll } = useOwnerScope();

  const [coverUri, setCoverUri] = useState<string | null>(null);
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [videoMime, setVideoMime] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promoType, setPromoType] = useState<PromoType>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [appliesTo, setAppliesTo] = useState<AppliesTo>('all');
  const [eligibleItemIds, setEligibleItemIds] = useState<string[]>([]);
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [startDate, setStartDate] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<string | null>(null);
  const [endDate, setEndDate] = useState<string | null>(null);
  const [endTime, setEndTime] = useState<string | null>(null);
  const [promoCode, setPromoCode] = useState('');
  const [maxUses, setMaxUses] = useState('');
  const [badgeColor, setBadgeColor] = useState<BadgeColor>('amber');
  const [bogoItemIds, setBogoItemIds] = useState<string[]>([]);
  const [buyQuantity, setBuyQuantity] = useState('1');
  const [getQuantity, setGetQuantity] = useState('1');
  const [freeItem, setFreeItem] = useState<{ id: string; name: string } | null>(null);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurFreq, setRecurFreq] = useState<RecurFreq>('weekly');
  const [recurInterval, setRecurInterval] = useState('1');
  const [recurDays, setRecurDays] = useState<number[]>([]);
  const [recurEndDate, setRecurEndDate] = useState<string | null>(null);
  const [happyHourStart, setHappyHourStart] = useState<string | null>(null);
  const [happyHourEnd, setHappyHourEnd] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = useMemo(() => {
    if (!selectedRestaurant || isAll) return false;
    if (submitting) return false;
    if (!title.trim()) return false;
    if ((promoType === 'percent' || promoType === 'amount') && !discountValue) return false;
    if (promoType === 'free_item' && !freeItem) return false;
    if (promoType === 'bogo' && bogoItemIds.length === 0) return false;
    return true;
  }, [selectedRestaurant, isAll, submitting, title, promoType, discountValue, freeItem, bogoItemIds]);

  const pickCover = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [16, 9], quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) setCoverUri(result.assets[0].uri);
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.85, videoMaxDuration: 30,
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
          kind: 'promo',
          ext: 'jpg', contentType: 'image/jpeg',
        });
      }
      let mediaUrl: string | null = null;
      let mediaName: string | null = null;
      if (videoUri) {
        const ext = (videoMime?.split('/')[1] ?? 'mp4').toLowerCase();
        mediaUrl = await uploadEventMedia({
          uri: videoUri,
          restaurantId: selectedRestaurant.id,
          kind: 'promo',
          ext, contentType: videoMime ?? 'video/mp4',
        });
        mediaName = videoUri.split('/').pop() ?? null;
      }

      await createPromotion({
        restaurant_id: selectedRestaurant.id,
        title: title.trim(),
        description: description.trim() || null,
        promo_type: promoType,
        discount_value: discountValue ? Number(discountValue) : null,
        discount_unit: promoType === 'percent' ? 'percent' : promoType === 'amount' ? 'amount' : null,
        applies_to: appliesTo,
        eligible_item_ids: appliesTo === 'items' ? eligibleItemIds : [],
        min_order_amount: minOrderAmount ? Number(minOrderAmount) : null,
        starts_at: combineDateAndTime(startDate, startTime) ?? new Date().toISOString(),
        ends_at: combineDateAndTime(endDate, endTime),
        promo_code: promoCode.trim() || null,
        max_uses: maxUses ? Number(maxUses) : null,
        badge_color: badgeColor,
        bogo_item_ids: promoType === 'bogo' ? bogoItemIds : [],
        buy_quantity: promoType === 'bogo' ? Math.max(1, Number(buyQuantity) || 1) : 1,
        get_quantity: promoType === 'bogo' ? Math.max(1, Number(getQuantity) || 1) : 1,
        free_item_id: promoType === 'free_item' ? freeItem?.id ?? null : null,
        free_item_name: promoType === 'free_item' ? freeItem?.name ?? null : null,
        is_recurring: isRecurring,
        recurrence_frequency: isRecurring ? recurFreq : null,
        recurrence_interval: isRecurring ? Math.max(1, Number(recurInterval) || 1) : 1,
        recurrence_days: isRecurring && recurFreq === 'weekly' ? recurDays : [],
        recurrence_end_at: isRecurring && recurEndDate
          ? new Date(`${recurEndDate}T23:59:59`).toISOString()
          : null,
        start_time_of_day: happyHourStart,
        end_time_of_day: happyHourEnd,
        is_private: isPrivate,
        cover_image_url: coverUrl,
        media_url: mediaUrl,
        media_type: videoMime,
        media_name: mediaName,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Promotion posted', `"${title.trim()}" is now live.`, [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to post promotion';
      Alert.alert('Could not post promotion', message);
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
        <Text style={styles.topTitle}>Post a promotion</Text>
        <View style={{ width: 36 }} />
      </View>

      {(isAll || !selectedRestaurant) ? (
        <View style={styles.scopePrompt}>
          <Ionicons name="business-outline" size={32} color={c.textMuted} />
          <Text style={styles.scopeTitle}>Pick a restaurant first</Text>
          <Text style={styles.scopeBody}>
            You're viewing all restaurants. Use the restaurant picker on the home screen to select one before posting a promotion.
          </Text>
        </View>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: spacing['3xl'] + Math.max(insets.bottom, spacing.md) }}>

          {/* Cover */}
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
              <Text style={styles.fieldLabel}>Title *</Text>
              <TextInput value={title} onChangeText={setTitle}
                placeholder="20% off all pasta" placeholderTextColor={c.textMuted}
                style={styles.input}/>
            </View>
            <View style={[styles.fieldRow, styles.fieldDivider]}>
              <Text style={styles.fieldLabel}>Description</Text>
              <TextInput value={description} onChangeText={setDescription}
                placeholder="Details guests see when redeeming"
                placeholderTextColor={c.textMuted}
                style={styles.inputMultiline} multiline textAlignVertical="top"/>
            </View>
          </View>

          {/* Discount type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>DISCOUNT TYPE *</Text>
            <View style={styles.chipRow}>
              {PROMO_TYPES.map((opt) => {
                const active = promoType === opt.value;
                return (
                  <Pressable key={opt.value} onPress={() => setPromoType(opt.value)}
                    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}>
                    <Ionicons name={opt.icon} size={14} color={active ? c.gold : c.textMuted}/>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {(promoType === 'percent' || promoType === 'amount') && (
              <View style={[styles.fieldRow, styles.fieldDivider]}>
                <Text style={styles.fieldLabel}>
                  {promoType === 'percent' ? 'Percent off' : 'Amount off ($)'} *
                </Text>
                <TextInput value={discountValue} onChangeText={setDiscountValue}
                  placeholder={promoType === 'percent' ? '15' : '5.00'}
                  placeholderTextColor={c.textMuted}
                  keyboardType="decimal-pad" style={styles.input}/>
              </View>
            )}
            {promoType === 'bogo' && (
              <>
                <View style={[styles.rowPair, styles.fieldDivider]}>
                  <View style={styles.rowPairField}>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Buy qty</Text>
                      <TextInput value={buyQuantity} onChangeText={setBuyQuantity}
                        keyboardType="number-pad" style={styles.input}/>
                    </View>
                  </View>
                  <View style={styles.rowPairDivider}/>
                  <View style={styles.rowPairField}>
                    <View style={styles.fieldRow}>
                      <Text style={styles.fieldLabel}>Get qty</Text>
                      <TextInput value={getQuantity} onChangeText={setGetQuantity}
                        keyboardType="number-pad" style={styles.input}/>
                    </View>
                  </View>
                </View>
                <View style={styles.fieldDivider}>
                  <MenuItemMultiPicker
                    label="Eligible items *"
                    restaurantId={selectedRestaurant.id}
                    value={bogoItemIds}
                    onChange={setBogoItemIds}
                  />
                </View>
              </>
            )}
            {promoType === 'free_item' && (
              <View style={styles.fieldDivider}>
                <MenuItemSinglePicker
                  label="Free item *"
                  restaurantId={selectedRestaurant.id}
                  value={freeItem?.id ?? null}
                  onChange={setFreeItem}
                />
              </View>
            )}
          </View>

          {/* Eligibility */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>ELIGIBILITY</Text>
            <View style={styles.chipRow}>
              {[
                { value: 'all', label: 'All items' },
                { value: 'items', label: 'Specific items' },
              ].map((opt) => {
                const active = appliesTo === opt.value;
                return (
                  <Pressable key={opt.value}
                    onPress={() => setAppliesTo(opt.value as AppliesTo)}
                    style={({ pressed }) => [styles.chip, active && styles.chipActive, pressed && { opacity: 0.85 }]}>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {appliesTo === 'items' && (
              <View style={styles.fieldDivider}>
                <MenuItemMultiPicker
                  label="Eligible items"
                  restaurantId={selectedRestaurant.id}
                  value={eligibleItemIds}
                  onChange={setEligibleItemIds}
                />
              </View>
            )}
            <View style={[styles.fieldRow, styles.fieldDivider]}>
              <Text style={styles.fieldLabel}>Minimum order ($)</Text>
              <TextInput value={minOrderAmount} onChangeText={setMinOrderAmount}
                placeholder="0 = no minimum" placeholderTextColor={c.textMuted}
                keyboardType="decimal-pad" style={styles.input}/>
            </View>
          </View>

          {/* Window */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>WINDOW</Text>
            <View style={styles.rowPair}>
              <View style={styles.rowPairField}>
                <DateField label="Starts on" value={startDate} onChange={setStartDate}/>
              </View>
              <View style={styles.rowPairDivider}/>
              <View style={styles.rowPairField}>
                <TimeField label="Start time" value={startTime} onChange={setStartTime}/>
              </View>
            </View>
            <View style={[styles.rowPair, styles.fieldDivider]}>
              <View style={styles.rowPairField}>
                <DateField label="Ends on" value={endDate} onChange={setEndDate} minIso={startDate ?? undefined}/>
              </View>
              <View style={styles.rowPairDivider}/>
              <View style={styles.rowPairField}>
                <TimeField label="End time" value={endTime} onChange={setEndTime}/>
              </View>
            </View>
            <View style={[styles.rowPair, styles.fieldDivider]}>
              <View style={styles.rowPairField}>
                <TimeField label="Happy hour starts" value={happyHourStart} onChange={setHappyHourStart}/>
              </View>
              <View style={styles.rowPairDivider}/>
              <View style={styles.rowPairField}>
                <TimeField label="Happy hour ends" value={happyHourEnd} onChange={setHappyHourEnd}/>
              </View>
            </View>
          </View>

          {/* Recurrence */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RECURRING</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelCol}>
                <Text style={styles.toggleTitle}>Repeats</Text>
                <Text style={styles.toggleSub}>e.g. every Tuesday, monthly Sunday brunch</Text>
              </View>
              <Switch value={isRecurring} onValueChange={setIsRecurring}
                trackColor={{ true: c.gold, false: c.bgElevated }} thumbColor={c.bgSurface}/>
            </View>
            {isRecurring && (
              <>
                <View style={styles.fieldDivider}/>
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
                  <TextInput value={recurInterval} onChangeText={setRecurInterval}
                    keyboardType="number-pad" style={styles.input}/>
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
                <View style={styles.fieldDivider}>
                  <DateField label="Recurrence ends on" value={recurEndDate} onChange={setRecurEndDate}/>
                </View>
              </>
            )}
          </View>

          {/* Code & limits */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>CODE & LIMITS</Text>
            <View style={styles.rowPair}>
              <View style={styles.rowPairField}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Promo code</Text>
                  <TextInput value={promoCode} onChangeText={setPromoCode}
                    placeholder="SAVE10" placeholderTextColor={c.textMuted}
                    autoCapitalize="characters" autoCorrect={false}
                    style={styles.input}/>
                </View>
              </View>
              <View style={styles.rowPairDivider}/>
              <View style={styles.rowPairField}>
                <View style={styles.fieldRow}>
                  <Text style={styles.fieldLabel}>Max uses</Text>
                  <TextInput value={maxUses} onChangeText={setMaxUses}
                    placeholder="No cap" placeholderTextColor={c.textMuted}
                    keyboardType="number-pad" style={styles.input}/>
                </View>
              </View>
            </View>
          </View>

          {/* Badge color */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BADGE COLOR</Text>
            <View style={styles.chipRow}>
              {BADGE_COLORS.map((opt) => {
                const active = badgeColor === opt.value;
                return (
                  <Pressable key={opt.value} onPress={() => setBadgeColor(opt.value)}
                    style={[styles.colorSwatch, { backgroundColor: opt.hex }, active && styles.colorSwatchActive]}>
                    {active && <Ionicons name="checkmark" size={14} color="#fff"/>}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Visibility */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>VISIBILITY</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLabelCol}>
                <Text style={styles.toggleTitle}>Private promotion</Text>
                <Text style={styles.toggleSub}>Hide from public Discover (code/share only)</Text>
              </View>
              <Switch value={isPrivate} onValueChange={setIsPrivate}
                trackColor={{ true: c.gold, false: c.bgElevated }} thumbColor={c.bgSurface}/>
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
          <Text style={styles.postBtnText}>{submitting ? 'Posting…' : 'Post promotion'}</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
