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
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SectionCard } from '@/components/owner/SectionCard';
import { useColors, createStyles, spacing, borderRadius } from '@/lib/theme';

type PromoType = 'percent_off' | 'fixed_discount' | 'free_item' | 'happy_hour' | 'birthday' | 'first_time_guest';

const TYPE_OPTIONS: { value: PromoType; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { value: 'percent_off', label: 'Percent off', icon: 'pricetag-outline' },
  { value: 'fixed_discount', label: 'Fixed discount', icon: 'cash-outline' },
  { value: 'free_item', label: 'Free item', icon: 'gift-outline' },
  { value: 'happy_hour', label: 'Happy hour', icon: 'wine-outline' },
  { value: 'birthday', label: 'Birthday', icon: 'balloon-outline' },
  { value: 'first_time_guest', label: 'First-time guest', icon: 'sparkles-outline' },
];

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

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
  topTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: c.textPrimary,
    letterSpacing: -0.2,
  },

  heading: {
    fontSize: 28,
    fontWeight: '800',
    color: c.textPrimary,
    letterSpacing: -0.5,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 4,
  },
  subheading: {
    fontSize: 14,
    color: c.textMuted,
    fontWeight: '500',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },

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
    fontSize: 13,
    fontWeight: '600',
    color: c.textMuted,
  },
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
    minHeight: 80,
    paddingVertical: 4,
    lineHeight: 22,
  },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing.md,
    gap: spacing.sm,
  },
  typeCard: {
    flexBasis: '48%',
    flexGrow: 1,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    gap: 8,
    minHeight: 80,
  },
  typeCardActive: {
    borderColor: c.gold,
    backgroundColor: 'rgba(198,168,91,0.10)',
  },
  typeCardLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: c.textPrimary,
  },
  typeCardLabelActive: {
    color: c.gold,
  },

  rowPair: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  rowPairField: { flex: 1, gap: 6 },

  dayRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  dayPill: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 44,
    borderRadius: borderRadius.full,
    backgroundColor: c.bgElevated,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayPillActive: {
    backgroundColor: c.gold,
    borderColor: c.gold,
  },
  dayPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: c.textMuted,
  },
  dayPillTextActive: {
    color: c.bgBase,
  },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: spacing.md,
    minHeight: 56,
  },
  toggleLabelCol: { flex: 1, gap: 2 },
  toggleTitle: { fontSize: 14, fontWeight: '700', color: c.textPrimary },
  toggleSub: { fontSize: 12, color: c.textMuted, fontWeight: '500' },

  bottomBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: c.border,
    backgroundColor: c.bgBase,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  createBtn: {
    backgroundColor: c.gold,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  createBtnPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  createBtnDisabled: {
    opacity: 0.4,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
}));

type ApplyKey = 'dineIn' | 'takeout' | 'bar' | 'patio' | 'menuItems' | 'guestGroups';

const APPLY_OPTIONS: { key: ApplyKey; label: string }[] = [
  { key: 'dineIn', label: 'Dine-in' },
  { key: 'takeout', label: 'Takeout' },
  { key: 'bar', label: 'Bar' },
  { key: 'patio', label: 'Patio' },
  { key: 'menuItems', label: 'Menu items' },
  { key: 'guestGroups', label: 'Guest groups' },
];

export default function NewPromotionScreen() {
  const c = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [name, setName] = useState('');
  const [type, setType] = useState<PromoType>('percent_off');
  const [startDate, setStartDate] = useState('2026-04-22');
  const [endDate, setEndDate] = useState('2026-05-22');
  const [startTime, setStartTime] = useState('5:00 PM');
  const [endTime, setEndTime] = useState('10:00 PM');
  const [days, setDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);
  const [applies, setApplies] = useState<Record<ApplyKey, boolean>>({
    dineIn: true,
    takeout: false,
    bar: false,
    patio: false,
    menuItems: false,
    guestGroups: false,
  });
  const [autoApply, setAutoApply] = useState(false);
  const [description, setDescription] = useState('');

  const toggleDay = (i: number) => {
    setDays((prev) => (prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i].sort()));
  };

  const toggleApply = (key: ApplyKey) => {
    setApplies((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const close = () => router.back();

  const canSubmit = name.trim().length > 0 && days.length > 0;

  const submit = () => {
    if (!canSubmit) return;
    if (Platform.OS === 'ios') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
    Alert.alert('Promotion created', `"${name}" will go live ${startDate}.`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={{ paddingTop: insets.top }} />
      <View style={styles.topBar}>
        <Pressable
          style={({ pressed }) => [styles.closeBtn, pressed && { opacity: 0.85 }]}
          onPress={close}
          accessibilityLabel="Close"
        >
          <Ionicons name="close" size={20} color={c.textPrimary} />
        </Pressable>
        <Text style={styles.topTitle}>New promotion</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingBottom: spacing['3xl'] + Math.max(insets.bottom, spacing.md),
        }}
      >
        <Text style={styles.heading}>Create a promotion</Text>
        <Text style={styles.subheading}>
          Set up the offer, when it runs, and where it applies.
        </Text>

        <SectionCard sectionTitle="Basics">
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Sunset happy hour"
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
        </SectionCard>

        <SectionCard sectionTitle="Type">
          <View style={styles.typeGrid}>
            {TYPE_OPTIONS.map((opt) => {
              const active = type === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={({ pressed }) => [
                    styles.typeCard,
                    active && styles.typeCardActive,
                    pressed && { opacity: 0.9 },
                  ]}
                  onPress={() => setType(opt.value)}
                >
                  <Ionicons
                    name={opt.icon}
                    size={20}
                    color={active ? c.gold : c.textMuted}
                  />
                  <Text style={[styles.typeCardLabel, active && styles.typeCardLabelActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </SectionCard>

        <SectionCard sectionTitle="Schedule">
          <View style={styles.rowPair}>
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>Start date</Text>
              <TextInput
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                style={styles.input}
              />
            </View>
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>End date</Text>
              <TextInput
                value={endDate}
                onChangeText={setEndDate}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={c.textMuted}
                style={styles.input}
              />
            </View>
          </View>
          <View style={[styles.rowPair, styles.fieldDivider]}>
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>Starts</Text>
              <TextInput
                value={startTime}
                onChangeText={setStartTime}
                placeholder="5:00 PM"
                placeholderTextColor={c.textMuted}
                style={styles.input}
              />
            </View>
            <View style={styles.rowPairField}>
              <Text style={styles.fieldLabel}>Ends</Text>
              <TextInput
                value={endTime}
                onChangeText={setEndTime}
                placeholder="10:00 PM"
                placeholderTextColor={c.textMuted}
                style={styles.input}
              />
            </View>
          </View>
          <View style={[styles.fieldRow, styles.fieldDivider]}>
            <Text style={styles.fieldLabel}>Days of week</Text>
            <View style={styles.dayRow}>
              {DAYS.map((d, i) => {
                const active = days.includes(i);
                return (
                  <Pressable
                    key={i}
                    onPress={() => toggleDay(i)}
                    style={[styles.dayPill, active && styles.dayPillActive]}
                  >
                    <Text style={[styles.dayPillText, active && styles.dayPillTextActive]}>
                      {d}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </SectionCard>

        <SectionCard sectionTitle="Where it applies">
          {APPLY_OPTIONS.map((opt, i) => (
            <View key={opt.key} style={[styles.toggleRow, i > 0 && styles.fieldDivider]}>
              <View style={styles.toggleLabelCol}>
                <Text style={styles.toggleTitle}>{opt.label}</Text>
              </View>
              <Switch
                value={applies[opt.key]}
                onValueChange={() => toggleApply(opt.key)}
                trackColor={{ true: c.gold, false: c.bgElevated }}
                thumbColor={c.bgSurface}
              />
            </View>
          ))}
        </SectionCard>

        <SectionCard sectionTitle="Options" marginBottom={spacing.xl}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelCol}>
              <Text style={styles.toggleTitle}>Auto-apply at checkout</Text>
              <Text style={styles.toggleSub}>Customers don't need a code</Text>
            </View>
            <Switch
              value={autoApply}
              onValueChange={setAutoApply}
              trackColor={{ true: c.gold, false: c.bgElevated }}
              thumbColor={c.bgSurface}
            />
          </View>
        </SectionCard>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          onPress={submit}
          disabled={!canSubmit}
          style={({ pressed }) => [
            styles.createBtn,
            !canSubmit && styles.createBtnDisabled,
            pressed && canSubmit && styles.createBtnPressed,
          ]}
        >
          <Text style={styles.createBtnText}>Create promotion</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
